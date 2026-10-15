# syntax=docker/dockerfile:1.7

# ---- deps: full install, native modules for the target platform ----
FROM node:22-alpine AS deps
WORKDIR /app
# Toolchain only used if a native module has no prebuilt binary for the platform.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: Next.js standalone output ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: bare Alpine + the node binary + the standalone server ----
# Starting from alpine instead of node:alpine drops npm, yarn and corepack
# (~40 MB the server never uses): files deleted in a later layer would still ship.
FROM alpine:3.24 AS runtime
WORKDIR /app
COPY --from=deps /usr/local/bin/node /usr/local/bin/node

ARG VERSION=dev
LABEL org.opencontainers.image.title="Guestroll" \
      org.opencontainers.image.description="Self-hosted QR-code photo sharing for events" \
      org.opencontainers.image.source="https://github.com/achedon12/guestroll" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"

# apk upgrade: security fixes published since the base image was built, on every build.
# No system font packages: sharp's own fontconfig reads the app's font (docker/fonts.conf).
RUN apk upgrade --no-cache && apk add --no-cache libstdc++ su-exec tzdata && mkdir -p /data

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    PUID=1001 \
    PGID=1001 \
    TZ=UTC \
    XDG_CACHE_HOME=/tmp/.cache \
    FONTCONFIG_FILE=/app/fonts.conf

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/drizzle ./drizzle
COPY docker/entrypoint.sh /usr/local/bin/guestroll-entrypoint
COPY docker/fonts.conf /app/fonts.conf

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["guestroll-entrypoint"]
CMD ["node", "server.js"]

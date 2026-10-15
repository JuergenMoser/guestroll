# syntax=docker/dockerfile:1.7

# ---- deps: full install, native modules built for the target platform ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: Next.js standalone output ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: only the standalone server, as a non-root user ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

RUN groupadd --system --gid 1001 guestroll \
  && useradd --system --uid 1001 --gid guestroll --no-create-home guestroll \
  && mkdir -p /data && chown guestroll:guestroll /data

COPY --from=build --chown=guestroll:guestroll /app/.next/standalone ./
COPY --from=build --chown=guestroll:guestroll /app/.next/static ./.next/static
COPY --from=build --chown=guestroll:guestroll /app/drizzle ./drizzle

USER guestroll
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

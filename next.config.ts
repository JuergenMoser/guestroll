import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  // The guest page needs the camera; nothing else does.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // A production build next to a running `next dev` would replace files under it:
  // the e2e suite builds into its own folder (scripts/start.mjs reads the same variable).
  distDir: process.env.GUESTROLL_BUILD_DIR || ".next",
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  // Native modules must stay out of the bundle so the standalone build ships their binaries.
  serverExternalPackages: ["better-sqlite3", "sharp", "heic-decode", "pdfkit"],
  // The local data folder holds photos and the session secret: never ship it in a build.
  // Read from disk by the social preview images (src/lib/og.tsx).
  outputFileTracingIncludes: { "/**": ["./assets/fonts/*.woff", "./assets/fonts/*.ttf"] },
  outputFileTracingExcludes: { "*": ["data/**", "media/**", "tests/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  // The guest page needs the camera; nothing else does.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  // Native modules must stay out of the bundle so the standalone build ships their binaries.
  serverExternalPackages: ["better-sqlite3", "sharp", "heic-convert"],
  // The local data folder holds photos and the session secret: never ship it in a build.
  // Read from disk by the social preview images (src/lib/og.tsx).
  outputFileTracingIncludes: { "/**": ["./assets/fonts/*.woff"] },
  outputFileTracingExcludes: { "*": ["data/**", "media/**", "tests/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

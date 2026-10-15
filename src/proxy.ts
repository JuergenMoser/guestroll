import { NextResponse, type NextRequest } from "next/server";

/**
 * A Content-Security-Policy with a fresh nonce on every page: Next.js applies
 * the nonce to its own scripts, so injected markup can't run anything. Styles
 * stay `unsafe-inline`: React writes `style` attributes, and a style can't run
 * code. API routes have no HTML; media answers carry their own sandboxing CSP.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    // React needs eval in development only, for its error overlay.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: previews of photos and voice notes before upload; data: for QR previews.
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  // Read here, per request, not in next.config.ts: its headers are frozen at build
  // time, and only the deployment knows it serves HTTPS. No includeSubDomains: the
  // instance often lives on a subdomain of a domain that serves other things.
  if (process.env.PUBLIC_URL?.startsWith("https://")) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

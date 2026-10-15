import { getEventBySlug } from "@/lib/events";
import { apiError } from "@/lib/http";
import { readLogo } from "@/lib/storage/files";

/**
 * The event logo is branding, not a guest photo: knowing the slug (from the QR
 * code) is enough, so it also shows on the access-code screen.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/e/[slug]/logo">) {
  const event = getEventBySlug((await params).slug);
  const logo = event?.logoVersion ? await readLogo(event.id) : null;
  if (!logo) return apiError("not_found");
  return new Response(new Uint8Array(logo), {
    headers: {
      "Content-Type": "image/png",
      // URLs carry ?v=<logoVersion>, so a new upload changes the URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

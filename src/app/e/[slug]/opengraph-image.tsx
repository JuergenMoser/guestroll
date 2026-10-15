import { ImageResponse } from "next/og";
import { readableInk } from "@/lib/color";
import { config } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";
import { getT } from "@/lib/i18n/server";
import { OG_COLORS, OG_SIZE, OgLogo, ogFonts } from "@/lib/og";
import { SLUG_PATTERN } from "@/lib/security/ids";
import { readLogo } from "@/lib/storage/files";

export const alt = "Event";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * The card WhatsApp, iMessage or Slack show when the event link is shared:
 * name, date, logo and color. Never a guest photo, whatever the event settings.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  const [t, fonts] = await Promise.all([getT(event?.defaultLocale), ogFonts()]);
  const accent = event?.accentColor ?? "#ffc72c";
  const accentInk = readableInk(accent);
  const logo = event?.logoVersion ? await readLogo(event.id) : null;
  const stamp = event?.eventDate ? event.eventDate.split("-").reverse().join(" ").replace(/ (\d{2})(\d{2})$/, " '$2") : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG_COLORS.paper, color: OG_COLORS.ink, fontFamily: "Bricolage Grotesque" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 64px 72px 80px" }}>
          {logo ? (
            <img src={`data:image/png;base64,${logo.toString("base64")}`} width={110} height={110} alt="" style={{ objectFit: "contain" }} />
          ) : (
            <OgLogo size={84} />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 0.92, letterSpacing: -3 }}>{event?.name ?? config.appName}</div>
            {stamp && <div style={{ fontSize: 34, fontWeight: 600, color: OG_COLORS.stamp }}>{stamp}</div>}
          </div>
        </div>
        <div style={{ width: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, margin: 36, borderRadius: 44, background: accent, color: accentInk }}>
          <div style={{ width: 170, height: 170, borderRadius: 999, border: `9px solid ${accentInk}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 128, height: 128, borderRadius: 999, background: "#ffffff" }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 600 }}>{t("guest.takePhoto")}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

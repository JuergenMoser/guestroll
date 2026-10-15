import { ImageResponse } from "next/og";
import { config } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { OG_SIZE, OgLogo, ogFonts } from "@/lib/og";
import { SLUG_PATTERN } from "@/lib/security/ids";
import { readLogo } from "@/lib/storage/files";

export const alt = "Event";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * The card WhatsApp, iMessage or Slack show when the event link is shared:
 * name, date and logo only. Never a guest photo, whatever the event settings.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  const [t, locale, fonts] = await Promise.all([getT(), getLocale(), ogFonts()]);
  const accent = event?.accentColor ?? "#f59e0b";
  const logo = event?.logoVersion ? await readLogo(event.id) : null;
  const date = event?.eventDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${event.eventDate}T00:00:00Z`))
    : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 80, background: "#0c0a09", color: "#f4efe7", fontFamily: "Geist", borderBottom: `16px solid ${accent}` }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img>
          <img src={`data:image/png;base64,${logo.toString("base64")}`} width={150} height={150} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <OgLogo size={120} accent={accent} />
        )}
        {date && <div style={{ fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: "#8a7f76" }}>{date}</div>}
        <div style={{ fontFamily: "Instrument Serif", fontSize: 104, lineHeight: 1, letterSpacing: -2, textAlign: "center", maxWidth: 1040 }}>
          {event?.name ?? config.appName}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, color: accent, fontWeight: 600 }}>{t("guest.takePhoto")} →</div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

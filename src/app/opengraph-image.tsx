import { ImageResponse } from "next/og";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { OG_COLORS, OG_SIZE, OgLogo, ogFonts } from "@/lib/og";

export const alt = "Guestroll";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const t = await getT();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: OG_COLORS.paper, color: OG_COLORS.ink, fontFamily: "Bricolage Grotesque" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgLogo size={64} />
          <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{config.appName}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3, maxWidth: 1000 }}>{t("home.title")}</div>
          <div style={{ fontSize: 30, color: OG_COLORS.muted, maxWidth: 900, lineHeight: 1.3 }}>{t("home.lead")}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}

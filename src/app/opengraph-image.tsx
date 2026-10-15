import { ImageResponse } from "next/og";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { OG_SIZE, OgLogo, ogFonts } from "@/lib/og";

export const alt = "Guestroll";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const t = await getT();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#0c0a09", color: "#f4efe7", fontFamily: "Geist" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <OgLogo size={84} />
          <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{config.appName}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontFamily: "Instrument Serif", fontSize: 92, lineHeight: 1, letterSpacing: -2, maxWidth: 980 }}>{t("home.title")}</div>
          <div style={{ fontSize: 30, color: "#b3a99f", maxWidth: 900 }}>{t("home.lead")}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}

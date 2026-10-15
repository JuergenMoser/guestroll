import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { config } from "@/lib/config";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

// Locale and app name come from runtime env vars: nothing may be frozen at build time.
export const dynamic = "force-dynamic";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display-serif" });

export const metadata: Metadata = {
  title: { default: config.appName, template: `%s · ${config.appName}` },
  description: "Self-hosted QR-code photo sharing for events.",
  // Guest albums are private by nature: keep every page out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <I18nProvider messages={messages[locale]}>{children}</I18nProvider>
      </body>
    </html>
  );
}

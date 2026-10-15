import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { config } from "@/lib/config";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme/server";
import { DemoBanner } from "@/components/DemoBanner";
import { nextDemoReset } from "@/lib/demo/schedule";

import { baseUrl } from "@/lib/urls";
import "./globals.css";

// Locale and app name come from runtime env vars: nothing may be frozen at build time.
export const dynamic = "force-dynamic";

// One family for everything: its optical-size axis tightens display sizes and
// opens up small ones, so body text stays readable without a second face.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz", "wdth"] });

export async function generateMetadata(): Promise<Metadata> {
  return {
    // Absolute URLs for og:image: crawlers fetch them from outside.
    metadataBase: new URL(await baseUrl()),
    title: { default: config.appName, template: `%s · ${config.appName}` },
    description: "Self-hosted QR-code photo sharing for events.",
    applicationName: config.appName,
    appleWebApp: { capable: true, title: config.appName, statusBarStyle: "black-translucent" },
    twitter: { card: "summary_large_image" },
    // Guest albums are private by nature: keep every page out of search engines.
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121314" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html lang={locale} className={bricolage.variable} data-theme={theme === "system" ? undefined : theme}>
      <body className="min-h-dvh">
        {config.demo.enabled && <DemoBanner nextReset={nextDemoReset()} />}
        <I18nProvider locale={locale} messages={messages[locale]}>{children}</I18nProvider>
      </body>
    </html>
  );
}

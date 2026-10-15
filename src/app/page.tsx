import { Aperture } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";

/** Visitors normally land on /e/<slug> from a QR code; this page is for whoever runs the instance. */
export default async function HomePage() {
  const t = await getT();
  return (
    <main className="grain grid min-h-dvh place-items-center px-4">
      <div className="max-w-xl space-y-8 text-center">
        <Aperture className="mx-auto size-10 text-accent" aria-hidden />
        <p className="kicker">{config.appName}</p>
        <h1 className="font-display text-5xl leading-[1.05] text-balance sm:text-6xl">{t("home.title")}</h1>
        <p className="text-ink-300 text-pretty">{t("home.lead")}</p>
        <Link href="/admin" className={buttonClass("primary", "lg")}>
          {t("home.admin")}
        </Link>
      </div>
    </main>
  );
}

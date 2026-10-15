import Link from "next/link";
import { Brand } from "@/components/Brand";
import { buttonClass } from "@/components/ui";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";

/** Guests land on /e/<slug> from a QR code; this page is for whoever runs the instance. */
export default async function HomePage() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-5 py-16">
      <Brand name={config.appName} />
      <h1 className="text-[clamp(2.5rem,8vw,4.25rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-balance [font-stretch:85%]">{t("home.title")}</h1>
      <p className="max-w-lg text-lg text-pretty text-ink-soft">{t("home.lead")}</p>
      <div>
        <Link href="/admin" className={buttonClass("primary", "lg")}>
          {t("home.admin")}
        </Link>
      </div>
    </main>
  );
}

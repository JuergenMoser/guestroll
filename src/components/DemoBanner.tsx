import { getT } from "@/lib/i18n/server";
import { DEMO_GALLERY_PASSWORD, DEMO_PASSWORD, DEMO_USERNAME } from "@/lib/demo/seed";

/** On every page of a public demo: what it is, how to get in, when it resets. */
export async function DemoBanner({ nextReset }: { nextReset: number | null }) {
  const t = await getT();
  const time = nextReset ? new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "UTC" }).format(new Date(nextReset)) : null;
  return (
    <div role="note" className="bg-ink px-4 py-2 text-center text-[13px] text-canvas">
      <strong>{t("demo.title")}</strong> {t("demo.signIn", { username: DEMO_USERNAME, password: DEMO_PASSWORD })} {t("demo.gallery", { password: DEMO_GALLERY_PASSWORD })}{" "}
      {time && t("demo.reset", { time })}
    </div>
  );
}

import { getT } from "@/lib/i18n/server";

export default function NotFound() {
  const t = getT();
  return (
    <main className="grain grid min-h-dvh place-items-center px-4 text-center">
      <div className="space-y-3">
        <p className="kicker">404</p>
        <h1 className="font-display text-4xl">{t("errors.not_found")}</h1>
      </div>
    </main>
  );
}

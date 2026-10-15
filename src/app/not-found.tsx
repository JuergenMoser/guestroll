import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-2 px-5">
      <p className="text-6xl font-extrabold tabular-nums text-stamp">404</p>
      <h1 className="text-2xl font-bold tracking-tight">{t("errors.not_found")}</h1>
    </main>
  );
}

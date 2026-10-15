"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

/** A thin line under the navigation for owners, until the instance runs the new version. */
export function UpdateBanner({ version }: { version: string }) {
  const t = useT();
  return (
    <div className="border-b border-line bg-accent/15 px-4 py-2 text-center text-sm">
      {t("admin.updates.banner", { version })}{" "}
      <Link href="/admin/settings/system#updates" className="font-semibold underline underline-offset-2">
        {t("admin.updates.see")}
      </Link>
    </div>
  );
}

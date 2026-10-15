"use client";

import { KeyRound, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, buttonClass } from "@/components/ui";
import { api } from "@/lib/client/api";

/** Links the signed-in account to its single sign-on identity, or unlinks it. */
export function SsoLink({ linked, provider }: { linked: boolean; provider: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unlink() {
    setBusy(true);
    await api("/api/admin/me/oidc", { method: "DELETE" }).catch(() => {});
    router.replace("/admin/settings/account#sso");
    router.refresh();
    setBusy(false);
  }

  return linked ? (
    <div className="flex flex-wrap items-center gap-3">
      <Badge tone="ok">{t("admin.sso.linked", { name: provider })}</Badge>
      <Button size="sm" variant="ghost" onClick={unlink} loading={busy}>
        <Unlink className="size-4" aria-hidden />
        {t("admin.sso.unlink")}
      </Button>
    </div>
  ) : (
    <a href="/api/admin/oidc/start?link=1" className={buttonClass("secondary")}>
      <KeyRound className="size-4" aria-hidden />
      {t("admin.sso.link", { name: provider })}
    </a>
  );
}

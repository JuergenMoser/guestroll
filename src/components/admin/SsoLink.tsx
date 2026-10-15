"use client";

import { KeyRound, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

/**
 * Links the signed-in account to its single sign-on identity, or unlinks it.
 * Linking asks for the password again (and the code with two-step verification).
 */
export function SsoLink({ linked, provider, twoFactor }: { linked: boolean; provider: string; twoFactor: boolean }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function unlink() {
    setBusy(true);
    await api("/api/admin/me/oidc", { method: "DELETE" }).catch(() => {});
    router.replace("/admin/settings/account#sso");
    router.refresh();
    setBusy(false);
  }

  async function link(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const { url } = await api<{ url: string }>("/api/admin/me/oidc", { body: { password, code } });
      window.location.assign(url);
    } catch (err) {
      const details = err instanceof ApiError ? err.details : undefined;
      setError(details?.password ? t("admin.sso.wrongPassword") : details?.code ? t("admin.twoFactor.wrongCode") : errorText(t, err instanceof ApiError ? err.code : undefined));
      setBusy(false);
    }
  }

  if (linked) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="ok">{t("admin.sso.linked", { name: provider })}</Badge>
        <Button size="sm" variant="ghost" onClick={unlink} loading={busy}>
          <Unlink className="size-4" aria-hidden />
          {t("admin.sso.unlink")}
        </Button>
      </div>
    );
  }
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" aria-hidden />
        {t("admin.sso.link", { name: provider })}
      </Button>
    );
  }
  return (
    <form onSubmit={link} className="space-y-4">
      <p className="text-sm text-ink-muted">{t("admin.sso.confirmIdentity")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.password")}>
          {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required autoFocus />}
        </Field>
        {twoFactor && (
          <Field label={t("admin.twoFactor.code")}>
            {(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />}
          </Field>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={busy}>
          {t("admin.sso.continue", { name: provider })}
        </Button>
      </div>
    </form>
  );
}

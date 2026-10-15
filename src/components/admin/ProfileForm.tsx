"use client";

import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input, StatusMessage } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

/** The signed-in person's own name and alert address. */
export function ProfileForm({ username, initialName, initialEmail }: { username: string; initialName: string; initialEmail: string | null }) {
  const t = useT();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(undefined);
    try {
      await api("/api/admin/me", { method: "PATCH", body: { name, email: email || null } });
      setMessage({ ok: true, text: t("common.saved") });
    } catch (err) {
      setMessage({ ok: false, text: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink-muted">{t("admin.profile.signedInAs", { username })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.accounts.name")}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}</Field>
        <Field label={t("admin.accounts.email")} hint={t("admin.profile.emailHint")}>
          {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3">
        <StatusMessage message={message} />
        <Button type="submit" loading={busy}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

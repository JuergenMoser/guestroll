"use client";

import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input, StatusMessage } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

export function PasswordForm() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(undefined);
    try {
      await api("/api/admin/password", { body: { current, next } });
      setCurrent("");
      setNext("");
      setMessage({ ok: true, text: t("admin.settingsPage.changed") });
    } catch (err) {
      setMessage({ ok: false, text: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t("admin.settingsPage.current")}>
        {(id) => <Input id={id} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />}
      </Field>
      <Field label={t("admin.settingsPage.next")}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required />}
      </Field>
      <div className="flex items-center justify-end gap-3">
        <StatusMessage message={message} />
        <Button type="submit" loading={busy}>
          {t("admin.settingsPage.change")}
        </Button>
      </div>
    </form>
  );
}

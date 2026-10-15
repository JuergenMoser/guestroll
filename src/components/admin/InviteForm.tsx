"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

/** The invited person picks a username and a password, and is signed in. */
export function InviteForm({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(undefined);
    if (password !== confirm) return setErrors({ confirm: t("admin.invite.mismatch") });
    setBusy(true);
    try {
      await api(`/api/admin/invite/${token}`, { body: { username, name, password } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      const details = err instanceof ApiError ? err.details : undefined;
      if (details?.username === "taken") setErrors({ username: t("admin.invite.taken") });
      else if (details?.username) setErrors({ username: t("admin.invite.usernameRule") });
      else if (details?.password) setErrors({ password: t("admin.invite.passwordRule") });
      else setError(err instanceof ApiError && err.code === "not_found" ? t("admin.invite.invalid") : errorText(t, err instanceof ApiError ? err.code : undefined));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label={t("admin.accounts.username")} hint={t("admin.invite.usernameRule")} error={errors.username}>
        {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />}
      </Field>
      <Field label={t("admin.accounts.name")}>
        {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />}
      </Field>
      <Field label={t("admin.password")} hint={t("admin.invite.passwordRule")} error={errors.password}>
        {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} required />}
      </Field>
      <Field label={t("admin.invite.confirm")} error={errors.confirm}>
        {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />}
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={busy} className="w-full">
        {t("admin.invite.submit")}
      </Button>
    </form>
  );
}

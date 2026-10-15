"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/api/admin/login", { body: { password } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label={t("admin.password")} error={error}>
        {(id, describedBy) => (
          <Input
            id={id}
            type="password"
            aria-describedby={describedBy}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        )}
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        {t("admin.signIn")}
      </Button>
    </form>
  );
}

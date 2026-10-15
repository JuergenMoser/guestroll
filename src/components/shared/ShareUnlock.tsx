"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

export function ShareUnlock({ token }: { token: string }) {
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
      await api(`/api/g/${token}/unlock`, { body: { password } });
      router.refresh();
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <Lock className="size-6 shrink-0" aria-hidden />
          {t("shared.title")}
        </h2>
        <p className="text-[15px] text-ink-soft">{t("shared.hint")}</p>
      </div>
      <Field label={t("shared.password")} error={error}>
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
            className="h-13 text-lg"
          />
        )}
      </Field>
      <Button type="submit" size="lg" loading={busy} className="w-full">
        {t("shared.open")}
      </Button>
    </form>
  );
}

"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { errorText } from "@/lib/i18n/errors";

export function UnlockScreen({ slug }: { slug: string }) {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const res = await fetch(`/api/e/${slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return router.refresh();
    setError(errorText(t, res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : "offline"));
  }

  return (
    <form onSubmit={submit} className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <Lock className="size-6 shrink-0" aria-hidden />
          {t("guest.unlockTitle")}
        </h2>
        <p className="text-[15px] text-ink-soft">{t("guest.unlockHint")}</p>
      </div>
      <div>
        <Field label={t("guest.unlockCode")} error={error}>
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              required
              className="h-13 text-lg tracking-wider"
            />
          )}
        </Field>
      </div>
      <Button type="submit" size="lg" loading={busy} className="w-full">
        {t("guest.unlockSubmit")}
      </Button>
    </form>
  );
}

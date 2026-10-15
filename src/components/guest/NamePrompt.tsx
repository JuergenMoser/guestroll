"use client";

import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Input } from "@/components/ui";

interface NamePromptProps {
  slug: string;
  initial?: string;
  onDone: (name: string | null) => void;
}

export function NamePrompt({ slug, initial = "", onDone }: NamePromptProps) {
  const t = useT();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/e/${slug}/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    setBusy(false);
    onDone(res?.ok ? ((await res.json()) as { name: string }).name : null);
  }

  return (
    <form onSubmit={submit} className="w-full space-y-5">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("guest.nameTitle")}</h2>
        <p className="text-[15px] text-pretty text-ink-soft">{t("guest.nameHint")}</p>
      </div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("guest.namePlaceholder")}
        aria-label={t("guest.namePlaceholder")}
        maxLength={40}
        autoComplete="given-name"
        required
        className="h-13 text-lg"
      />
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" loading={busy}>
          {t("guest.nameSubmit")}
        </Button>
        <Button variant="ghost" onClick={() => onDone(null)}>
          {t("guest.nameSkip")}
        </Button>
      </div>
    </form>
  );
}

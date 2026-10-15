"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";

/** Next year's party from this year's settings: everything but the photos. */
export function DuplicateEvent({ eventId, name }: { eventId: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [copyName, setCopyName] = useState(`${name} (2)`.slice(0, 80));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const { event } = await api<{ event: AdminEvent }>(`/api/admin/events/${eventId}/duplicate`, { body: { name: copyName } });
      router.push(`/admin/events/${event.id}?tab=settings`);
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label={t("admin.duplicate.name")} error={error}>
            {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={copyName} onChange={(e) => setCopyName(e.target.value)} minLength={2} maxLength={80} required />}
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={busy}>
          <Copy className="size-4" aria-hidden />
          {t("admin.duplicate.button")}
        </Button>
    </form>
  );
}

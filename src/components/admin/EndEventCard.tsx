"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Card, CardTitle } from "@/components/ui";
import { api } from "@/lib/client/api";

interface EndResult {
  summaryQueued: boolean;
  galleryRecipients: number;
  galleryPassword: string | null;
}

/** Ends the event on demand: closes uploads and runs the end-of-event emails once. */
export function EndEventCard({ eventId, endedAt, locale }: { eventId: string; endedAt: number | null; locale: string }) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EndResult | null>(null);

  async function end() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    const res = await api<{ result: EndResult | null }>(`/api/admin/events/${eventId}/end`, { method: "POST" }).catch(() => null);
    setResult(res?.result ?? null);
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Flag className="size-4" aria-hidden />
          {t("admin.end.title")}
        </CardTitle>
        {endedAt ? (
          <p className="text-sm text-ink-muted">{t("admin.end.done", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(endedAt)) })}</p>
        ) : (
          <p className="max-w-prose text-sm text-ink-muted">{confirming ? t("admin.end.confirm") : t("admin.end.hint")}</p>
        )}
        {result && (
          <p role="status" className="text-sm font-medium text-ok">
            {t("admin.end.result", { summary: result.summaryQueued ? t("admin.end.queued") : t("admin.end.skipped"), count: result.galleryRecipients })}
          </p>
        )}
        {result?.galleryPassword && (
          <p className="text-sm">
            {t("admin.end.password")} <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-base select-all">{result.galleryPassword}</code>
          </p>
        )}
      </div>
      {!endedAt && (
        <Button variant={confirming ? "danger" : "secondary"} onClick={end} loading={busy} onBlur={() => setConfirming(false)}>
          {t("admin.end.button")}
        </Button>
      )}
    </Card>
  );
}

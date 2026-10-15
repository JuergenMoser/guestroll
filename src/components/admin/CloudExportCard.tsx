"use client";

import { CloudUpload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, Card, CardTitle, SegmentedControl } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { CloudExportDto } from "@/lib/cloud/export";

/** Sends the event's album to the cloud folder set up in the settings, with its progress. */
export function CloudExportCard({ eventId, hasFavorites, owner }: { eventId: string; hasFavorites: boolean; owner: boolean }) {
  const t = useT();
  const [state, setState] = useState<{ configured: boolean; exports: CloudExportDto[] } | null>(null);
  const [scope, setScope] = useState<"visible" | "favorites">("visible");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<{ configured: boolean; exports: CloudExportDto[] }>(`/api/admin/events/${eventId}/cloud`).then(setState).catch(() => {}), [eventId]);
  useEffect(() => {
    void load();
  }, [load]);

  const latest = state?.exports[0];
  const active = latest && (latest.status === "pending" || latest.status === "running");
  // Follow the progress while an album is on its way; nothing to poll otherwise.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void load(), 2_000);
    return () => clearInterval(timer);
  }, [active, load]);

  async function send() {
    setBusy(true);
    await api(`/api/admin/events/${eventId}/cloud`, { body: { scope } }).catch(() => {});
    await load();
    setBusy(false);
  }

  if (!state) return null;
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>{t("admin.cloud.exportTitle")}</CardTitle>
        <p className="text-sm text-ink-muted">{state.configured ? t("admin.cloud.exportHint") : owner ? t("admin.cloud.notConfigured") : t("admin.cloud.notConfiguredOrganizer")}</p>
      </div>
      {!state.configured ? (
        owner && (
          <Link href="/admin/settings/data#cloud" className="text-sm font-medium underline underline-offset-4">
            {t("admin.cloud.setUp")}
          </Link>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {hasFavorites && (
              <SegmentedControl name={t("admin.album.photos")} value={scope} options={["visible", "favorites"] as const} onChange={setScope} label={(s) => t(`admin.album.scopes.${s}`)} />
            )}
            <Button variant="secondary" onClick={send} loading={busy} disabled={Boolean(active)}>
              <CloudUpload className="size-4" aria-hidden />
              {t("admin.cloud.send")}
            </Button>
          </div>
          {latest && (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={latest.status === "done" ? "ok" : latest.status === "failed" ? "danger" : "neutral"}>{t(`admin.cloud.status.${latest.status}`)}</Badge>
                <span className="tabular-nums text-ink-muted">{t("admin.cloud.progress", { done: latest.done, total: latest.total })}</span>
              </div>
              {active && latest.total > 0 && (
                <div className="h-1.5 rounded-sm bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={latest.total} aria-valuenow={latest.done}>
                  <div className="h-full rounded-sm bg-ink transition-[width]" style={{ width: `${(latest.done / latest.total) * 100}%` }} />
                </div>
              )}
              {latest.error && <p className="text-danger">{latest.error}</p>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

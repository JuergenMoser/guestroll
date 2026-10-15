"use client";

import { MonitorPlay, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { CopyField } from "./CopyField";
import { QrDesigner } from "./QrDesigner";

export function SharePanel({ event, url }: { event: AdminEvent; url: string }) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function rotate() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    await api(`/api/admin/events/${event.id}/rotate`, { method: "POST" }).catch(() => {});
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>{t("admin.share.title")}</CardTitle>
        <p className="text-sm text-ink-400">{t("admin.share.hint")}</p>
        <CopyField value={url} />
      </Card>

      {/* Keyed on the slug: a new link means a new code, so the designer restarts from it. */}
      <QrDesigner key={event.slug} event={event} url={url} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("admin.share.poster")}</CardTitle>
          </div>
          <a href={`/admin/events/${event.id}/poster`} target="_blank" className={buttonClass("secondary")}>
            <Printer className="size-4" aria-hidden />
            {t("admin.share.poster")}
          </a>
        </Card>
        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("admin.share.wall")}</CardTitle>
            <p className="text-sm text-ink-400">{t("admin.share.wallHint")}</p>
          </div>
          <a href={`/admin/events/${event.id}/wall`} target="_blank" className={buttonClass("primary")}>
            <MonitorPlay className="size-4" aria-hidden />
            {t("admin.share.wall")}
          </a>
        </Card>
        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("admin.share.rotate")}</CardTitle>
            <p className="text-sm text-ink-400">{t("admin.share.rotateHint")}</p>
          </div>
          <Button variant={confirming ? "danger" : "secondary"} onClick={rotate} loading={busy} onBlur={() => setConfirming(false)}>
            <RefreshCw className="size-4" aria-hidden />
            {t("admin.share.rotate")}
          </Button>
        </Card>
      </div>
    </div>
  );
}

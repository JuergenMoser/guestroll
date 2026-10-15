"use client";

/* eslint-disable @next/next/no-img-element -- the QR code is generated per request behind admin auth */
import { MonitorPlay, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle } from "@/components/ui";
import { api } from "@/lib/client/api";
import { CopyField } from "./CopyField";

export function SharePanel({ eventId, url, slug }: { eventId: string; url: string; slug: string }) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const qr = `/api/admin/events/${eventId}/qr`;

  async function rotate() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    await api(`/api/admin/events/${eventId}/rotate`, { method: "POST" }).catch(() => {});
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <Card className="flex flex-col items-center gap-4">
        <img key={slug} src={`${qr}?v=${slug}`} alt={url} className="aspect-square w-full rounded-xl bg-white p-3" />
        <div className="flex gap-2">
          <a href={qr} download className={buttonClass("secondary", "sm")}>
            {t("admin.share.downloadPng")}
          </a>
          <a href={`${qr}?format=svg`} download className={buttonClass("secondary", "sm")}>
            {t("admin.share.downloadSvg")}
          </a>
          <a href={`/admin/events/${eventId}/poster`} target="_blank" className={buttonClass("secondary", "sm")}>
            <Printer className="size-4" aria-hidden />
            {t("admin.share.poster")}
          </a>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3">
          <CardTitle>{t("admin.share.title")}</CardTitle>
          <p className="text-sm text-ink-400">{t("admin.share.hint")}</p>
          <CopyField value={url} />
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t("admin.share.wall")}</CardTitle>
            <p className="text-sm text-ink-400">{t("admin.share.wallHint")}</p>
          </div>
          <a href={`/admin/events/${eventId}/wall`} target="_blank" className={buttonClass("primary")}>
            <MonitorPlay className="size-4" aria-hidden />
            {t("admin.share.wall")}
          </a>
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-3">
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

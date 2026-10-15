"use client";

import { Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { CopyField } from "./CopyField";
import { EndEventCard } from "./EndEventCard";
import { GalleryLinks } from "./GalleryLinks";
import { QrDesigner } from "./qr/QrDesigner";
import { SlideshowExport } from "./SlideshowExport";
import { WallSettings } from "./WallSettings";
import { SpotsCard } from "./SpotsCard";
import { BoothCard } from "./BoothCard";
import type { SpotDto } from "@/lib/spots";

export function SharePanel({ event, url, locale, purgeAt, favoriteCount, spots }: { event: AdminEvent; url: string; locale: string; purgeAt: number | null; favoriteCount: number; spots: SpotDto[] }) {
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
        <p className="text-sm text-ink-muted">{t("admin.share.hint")}</p>
        <CopyField value={url} />
      </Card>

      <EndEventCard eventId={event.id} endedAt={event.endedAt} purgeAt={purgeAt} locale={locale} />

      <GalleryLinks eventId={event.id} baseUrl={url.slice(0, url.indexOf("/e/"))} locale={locale} />

      {/* Keyed on the slug: a new link means a new code, so the designer restarts from it. */}
      <QrDesigner key={event.slug} event={event} url={url} />

      <SpotsCard eventId={event.id} initial={spots} />

      <BoothCard eventId={event.id} url={url} initialKey={event.boothKey} />

      <SlideshowExport eventId={event.id} eventName={event.name} eventDate={event.eventDate} accent={event.accentColor} hasFavorites={favoriteCount > 0} />

      <WallSettings eventId={event.id} initial={event.wallStyle} hasChallenges={event.challenges.length > 0} guestbook={event.guestbookEnabled} />

      <div className="grid gap-4 lg:grid-cols-2">
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
            <CardTitle>{t("admin.share.rotate")}</CardTitle>
            <p className="text-sm text-ink-muted">{t("admin.share.rotateHint")}</p>
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

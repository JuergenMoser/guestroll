"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { buttonClass, Card, CardTitle, SegmentedControl } from "@/components/ui";

const LAYOUTS = ["1", "2", "4"] as const;

/** The album as a PDF to send to a printer: a cover, then 1, 2 or 4 photos per A4 page. */
export function AlbumPdfCard({ eventId, hasFavorites }: { eventId: string; hasFavorites: boolean }) {
  const t = useT();
  const [layout, setLayout] = useState<(typeof LAYOUTS)[number]>("2");
  const [scope, setScope] = useState<"visible" | "favorites">("visible");
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>{t("admin.album.title")}</CardTitle>
        <p className="text-sm text-ink-muted">{t("admin.album.hint")}</p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("admin.album.layout")}</p>
          <SegmentedControl name={t("admin.album.layout")} value={layout} options={LAYOUTS} onChange={setLayout} label={(l) => t(`admin.album.layouts.${l}`)} />
        </div>
        {hasFavorites && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("admin.album.photos")}</p>
            <SegmentedControl name={t("admin.album.photos")} value={scope} options={["visible", "favorites"] as const} onChange={setScope} label={(s) => t(`admin.album.scopes.${s}`)} />
          </div>
        )}
      </div>
      <a href={`/api/admin/events/${eventId}/album?layout=${layout}&scope=${scope}`} className={buttonClass("secondary")} download>
        <FileDown className="size-4" aria-hidden />
        {t("admin.album.download")}
      </a>
    </Card>
  );
}

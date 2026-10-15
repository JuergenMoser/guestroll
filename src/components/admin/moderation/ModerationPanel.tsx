"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { PhotoGrid } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, EmptyState, SegmentedControl } from "@/components/ui";
import { api } from "@/lib/client/api";
import { SelectionBar, type BulkAction } from "./SelectionBar";
import { useAdminPhotos, type PhotoFilter } from "./useAdminPhotos";

const FILTERS: PhotoFilter[] = ["all", "pending", "visible", "hidden", "favorites"];

/** The contact sheet: filter, select, then approve, hide or delete in bulk. */
export function ModerationPanel({ eventId, pendingCount }: { eventId: string; pendingCount: number }) {
  const t = useT();
  const [filter, setFilter] = useState<PhotoFilter>(pendingCount > 0 ? "pending" : "all");
  const { photos, cursor, loading, setLoading, reload, loadMore } = useAdminPhotos(eventId, filter);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function act(action: BulkAction) {
    const ids = [...selected];
    if (action === "delete" && !window.confirm(t("admin.moderation.deleteConfirm", { n: ids.length }))) return;
    setBusy(true);
    await api(`/api/admin/events/${eventId}/photos`, { body: { action, ids } }).catch(() => {});
    setSelected(new Set());
    setBusy(false);
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          role="tabs"
          name={t("admin.tabs.photos")}
          value={filter}
          options={FILTERS}
          label={(f) => t(`admin.moderation.${f}`)}
          onChange={(f) => {
            setSelected(new Set());
            setLoading(true);
            setFilter(f);
          }}
        />
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}>
              {t("admin.moderation.selectAll")}
            </Button>
          )}
          {filter === "favorites" && photos.length > 0 ? (
            <a href={`/api/admin/events/${eventId}/archive?favorites=1`} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" aria-hidden />
              {t("admin.moderation.downloadFavorites")}
            </a>
          ) : (
            <a href={`/api/admin/events/${eventId}/archive`} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" aria-hidden />
              {t("admin.moderation.downloadZip")}
            </a>
          )}
        </div>
      </div>

      {!loading && photos.length === 0 ? (
        <EmptyState className="py-16">{t(filter === "favorites" ? "admin.moderation.noFavorites" : "admin.moderation.empty")}</EmptyState>
      ) : (
        <PhotoGrid photos={photos} selected={selected} onToggle={toggle} variant="sheet" />
      )}

      {cursor !== null && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loading}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}

      <SelectionBar count={selected.size} busy={busy} onAction={act} onClear={() => setSelected(new Set())} />
    </div>
  );
}

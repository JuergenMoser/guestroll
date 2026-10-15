"use client";

import { Check, Download, EyeOff, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PhotoGrid } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, cn } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { PhotoDto } from "@/lib/photos";

type Filter = "all" | "visible" | "pending" | "hidden";
const FILTERS: Filter[] = ["all", "pending", "visible", "hidden"];

export function ModerationPanel({ eventId, pendingCount }: { eventId: string; pendingCount: number }) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>(pendingCount > 0 ? "pending" : "all");
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(
    (before?: number) => {
      const query = new URLSearchParams();
      if (filter !== "all") query.set("status", filter);
      if (before) query.set("before", String(before));
      return api<{ photos: PhotoDto[]; nextCursor: number | null }>(`/api/admin/events/${eventId}/photos?${query}`).catch(() => ({
        photos: [] as PhotoDto[],
        nextCursor: null,
      }));
    },
    [eventId, filter],
  );

  const reload = useCallback(
    () =>
      fetchPage().then((data) => {
        setPhotos(data.photos);
        setCursor(data.nextCursor);
        setLoading(false);
      }),
    [fetchPage],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  async function loadMore() {
    if (cursor === null) return;
    setLoading(true);
    const data = await fetchPage(cursor);
    setPhotos((list) => [...list, ...data.photos]);
    setCursor(data.nextCursor);
    setLoading(false);
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function act(action: "approve" | "hide" | "delete") {
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
        <div role="tablist" className="flex gap-0.5 rounded-lg bg-surface p-0.5 ring-1 ring-line">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={filter === f}
              onClick={() => {
                setSelected(new Set());
                setLoading(true);
                setFilter(f);
              }}
              className={cn("rounded-md px-3 py-1 text-sm transition-colors", filter === f ? "bg-sunken font-medium text-ink" : "text-ink-muted hover:text-ink")}
            >
              {t(`admin.moderation.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <a href={`/api/admin/events/${eventId}/archive`} className={buttonClass("secondary", "sm")}>
            <Download className="size-4" aria-hidden />
            {t("admin.moderation.downloadZip")}
          </a>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg bg-ink p-2 pl-4 text-canvas shadow-lg">
          <span className="mr-auto text-sm font-medium">{t("admin.moderation.selected", { n: selected.size })}</span>
          <Button size="sm" variant="secondary" onClick={() => act("approve")} disabled={busy}>
            <Check className="size-4" aria-hidden />
            {t("admin.moderation.approve")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => act("hide")} disabled={busy}>
            <EyeOff className="size-4" aria-hidden />
            {t("admin.moderation.hide")}
          </Button>
          <Button size="sm" variant="danger" onClick={() => act("delete")} disabled={busy}>
            <Trash2 className="size-4" aria-hidden />
            {t("admin.moderation.delete")}
          </Button>
        </div>
      )}

      {photos.length > 0 && (
        <button
          type="button"
          className="text-xs text-ink-muted hover:text-ink"
          onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}
        >
          {t("admin.moderation.selectAll")}
        </button>
      )}

      {!loading && photos.length === 0 ? (
        <p className="border-2 border-dashed border-line-2 py-16 text-center text-ink-muted">{t("admin.moderation.empty")}</p>
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
    </div>
  );
}

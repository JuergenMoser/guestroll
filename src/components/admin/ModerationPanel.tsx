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

  const load = useCallback(
    async (before?: number) => {
      setLoading(true);
      const query = new URLSearchParams();
      if (filter !== "all") query.set("status", filter);
      if (before) query.set("before", String(before));
      const data = await api<{ photos: PhotoDto[]; nextCursor: number | null }>(`/api/admin/events/${eventId}/photos?${query}`).catch(
        () => ({ photos: [], nextCursor: null }),
      );
      setPhotos((list) => (before ? [...list, ...data.photos] : data.photos));
      setCursor(data.nextCursor);
      setLoading(false);
    },
    [eventId, filter],
  );

  useEffect(() => {
    setSelected(new Set());
    void load();
  }, [load]);

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
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex gap-1 rounded-full bg-ink-900 p-1 ring-1 ring-ink-800">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn("rounded-full px-3 py-1 text-sm transition", filter === f ? "bg-ink-700 text-paper" : "text-ink-400 hover:text-paper")}
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
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-ink-800 p-2 pl-4 ring-1 ring-ink-700">
          <span className="mr-auto text-sm">{t("admin.moderation.selected", { n: selected.size })}</span>
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
          className="text-xs text-ink-400 hover:text-paper"
          onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)))}
        >
          {t("admin.moderation.selectAll")}
        </button>
      )}

      {!loading && photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-700 py-16 text-center text-sm text-ink-400">{t("admin.moderation.empty")}</p>
      ) : (
        <PhotoGrid photos={photos} selected={selected} onToggle={toggle} />
      )}

      {cursor !== null && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => load(cursor)} loading={loading}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

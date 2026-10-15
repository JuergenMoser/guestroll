"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { PhotoGrid } from "@/components/guest/PhotoGrid";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, EmptyState, SegmentedControl, Select } from "@/components/ui";
import type { Challenge } from "@/lib/challenges";
import { api } from "@/lib/client/api";
import { ImportPhotos } from "./ImportPhotos";
import { SelectionBar, type BulkAction } from "./SelectionBar";
import { useAdminPhotos, type PhotoFilter } from "./useAdminPhotos";

const FILTERS: PhotoFilter[] = ["all", "pending", "visible", "hidden", "favorites"];

/** The contact sheet: filter, select, then approve, hide or delete in bulk. */
export function ModerationPanel({ eventId, pendingCount, challenges = [] }: { eventId: string; pendingCount: number; challenges?: Challenge[] }) {
  const t = useT();
  const [filter, setFilter] = useState<PhotoFilter>(pendingCount > 0 ? "pending" : "all");
  const [challengeId, setChallengeId] = useState("");
  const { photos, cursor, loading, setLoading, reload, loadMore } = useAdminPhotos(eventId, filter, challengeId);
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
        <div className="flex flex-wrap items-center gap-2">
          {challenges.length > 0 && (
            <Select
              aria-label={t("admin.challenges.filter")}
              value={challengeId}
              onChange={(e) => {
                setSelected(new Set());
                setLoading(true);
                setChallengeId(e.target.value);
              }}
              className="h-8 w-auto max-w-56 py-1 text-sm"
            >
              <option value="">{t("admin.challenges.allChallenges")}</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
          <ImportPhotos eventId={eventId} onImported={reload} />
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

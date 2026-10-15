"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { PhotoDto } from "@/lib/photos";

export type PhotoFilter = "all" | "visible" | "pending" | "hidden" | "favorites";

type Page = { photos: PhotoDto[]; nextCursor: number | null };

/** Paginated admin photo list for one event and one status filter. */
export function useAdminPhotos(eventId: string, filter: PhotoFilter, challengeId = "", spotId = "") {
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(
    (before?: number) => {
      const query = new URLSearchParams();
      if (filter === "favorites") query.set("favorites", "1");
      else if (filter !== "all") query.set("status", filter);
      if (challengeId) query.set("challenge", challengeId);
      if (spotId) query.set("spot", spotId);
      if (before) query.set("before", String(before));
      return api<Page>(`/api/admin/events/${eventId}/photos?${query}`).catch((): Page => ({ photos: [], nextCursor: null }));
    },
    [eventId, filter, challengeId, spotId],
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

  return { photos, cursor, loading, setLoading, reload, loadMore };
}

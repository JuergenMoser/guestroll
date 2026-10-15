"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MessageCard } from "@/components/guestbook/MessageCard";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, cn, EmptyState, SegmentedControl } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { MessageDto } from "@/lib/messages";
import { SelectionBar, type BulkAction } from "./moderation/SelectionBar";

const FILTERS = ["all", "pending", "visible", "hidden"] as const;
type Filter = (typeof FILTERS)[number];
type Page = { messages: MessageDto[]; nextCursor: number | null };

/** The guests' messages: read, listen, approve, hide or delete, and download the whole book. */
export function GuestbookPanel({ eventId, locale }: { eventId: string; locale: string }) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [messages, setMessages] = useState<MessageDto[] | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(
    (before?: number) => {
      const query = new URLSearchParams();
      if (filter !== "all") query.set("status", filter);
      if (before) query.set("before", String(before));
      return api<Page>(`/api/admin/events/${eventId}/messages?${query}`).catch((): Page => ({ messages: [], nextCursor: null }));
    },
    [eventId, filter],
  );

  const reload = useCallback(
    () =>
      fetchPage().then((data) => {
        setMessages(data.messages);
        setCursor(data.nextCursor);
      }),
    [fetchPage],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  async function loadMore() {
    if (cursor === null) return;
    const data = await fetchPage(cursor);
    setMessages((list) => [...(list ?? []), ...data.messages]);
    setCursor(data.nextCursor);
  }

  async function act(action: BulkAction) {
    const ids = [...selected];
    if (action === "delete" && !window.confirm(t("guestbook.deleteConfirm", { n: ids.length }))) return;
    setBusy(true);
    await api(`/api/admin/events/${eventId}/messages`, { body: { action, ids } }).catch(() => {});
    setSelected(new Set());
    setBusy(false);
    await reload();
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          role="tabs"
          name={t("guestbook.title")}
          value={filter}
          options={FILTERS}
          label={(f) => t(`admin.moderation.${f}`)}
          onChange={(f) => {
            setSelected(new Set());
            setMessages(null);
            setFilter(f);
          }}
        />
        <a href={`/api/admin/events/${eventId}/messages/archive`} className={buttonClass("secondary", "sm")}>
          <Download className="size-4" aria-hidden />
          {t("guestbook.download")}
        </a>
      </div>

      {messages && messages.length === 0 && <EmptyState className="py-16">{t("guestbook.empty")}</EmptyState>}
      {messages && messages.length > 0 && (
        <ul role="list" className="grid items-start gap-3 md:grid-cols-2">
          {messages.map((m) => (
            <li key={m.id}>
              <MessageCard
                message={m}
                locale={locale}
                className={cn(selected.has(m.id) && "ring-2 ring-accent")}
                actions={
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-muted">
                    <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                    {m.status === "pending" ? t("guest.pendingReview") : t("admin.moderation.select")}
                  </label>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {cursor !== null && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}

      <SelectionBar count={selected.size} busy={busy} onAction={act} onClear={() => setSelected(new Set())} actions={["approve", "hide", "delete"]} />
    </div>
  );
}

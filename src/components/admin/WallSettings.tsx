"use client";

import { MonitorPlay } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { buttonClass, Card, CardTitle, Field, Input, SegmentedControl, StatusMessage, Switch } from "@/components/ui";
import { api } from "@/lib/client/api";
import { WALL_LAYOUTS, type WallStyle } from "@/lib/wall";

/** The live wall's look, saved on the event; an open wall picks changes up within 20 seconds. */
export function WallSettings({ eventId, initial, hasChallenges, guestbook }: { eventId: string; initial: WallStyle; hasChallenges: boolean; guestbook: boolean }) {
  const t = useT();
  const [style, setStyle] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  async function save(next: WallStyle) {
    setStyle(next);
    setMessage(undefined);
    try {
      await api(`/api/admin/events/${eventId}`, { method: "PATCH", body: { wallStyle: next } });
      setMessage({ ok: true, text: t("common.saved") });
    } catch {
      setMessage({ ok: false, text: t("errors.generic") });
    }
  }
  const set = <K extends keyof WallStyle>(key: K, value: WallStyle[K]) => void save({ ...style, [key]: value });

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>{t("admin.share.wall")}</CardTitle>
          <p className="max-w-prose text-sm text-ink-muted">{t("admin.share.wallHint")}</p>
        </div>
        <a href={`/admin/events/${eventId}/wall`} target="_blank" className={buttonClass("primary")}>
          <MonitorPlay className="size-4" aria-hidden />
          {t("admin.share.wall")}
        </a>
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_10rem]">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("admin.wallSettings.layout")}</p>
          <SegmentedControl name={t("admin.wallSettings.layout")} value={style.layout} options={WALL_LAYOUTS} onChange={(v) => set("layout", v)} label={(v) => t(`admin.wallSettings.layouts.${v}`)} />
          <p className="text-xs text-ink-muted">{t(`admin.wallSettings.layoutHints.${style.layout}`)}</p>
        </div>
        <Field label={t("admin.wallSettings.seconds")}>
          {(id) => (
            <Input id={id} type="number" min={3} max={30} value={style.slideSeconds} onChange={(e) => setStyle({ ...style, slideSeconds: Number(e.target.value) || 6 })} onBlur={() => save(style)} />
          )}
        </Field>
      </div>
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <Switch label={t("admin.wallSettings.showNames")} checked={style.showNames} onChange={(v) => set("showNames", v)} />
        <Switch label={t("admin.wallSettings.showQr")} checked={style.showQr} onChange={(v) => set("showQr", v)} />
        <Switch label={t("admin.wallSettings.favoritesOnly")} checked={style.favoritesOnly} onChange={(v) => set("favoritesOnly", v)} />
        {hasChallenges && <Switch label={t("admin.wallSettings.showChallenges")} checked={style.showChallenges} onChange={(v) => set("showChallenges", v)} />}
        {guestbook && <Switch label={t("admin.wallSettings.showMessages")} checked={style.showMessages} onChange={(v) => set("showMessages", v)} />}
      </div>
      <StatusMessage message={message} />
    </Card>
  );
}

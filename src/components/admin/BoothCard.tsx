"use client";

import { Camera, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle } from "@/components/ui";
import { api } from "@/lib/client/api";
import { CopyField } from "./CopyField";

/** Turns the photo booth on, shows its link, replaces or revokes it. */
export function BoothCard({ eventId, url, initialKey }: { eventId: string; url: string; initialKey: string | null }) {
  const t = useT();
  const [key, setKey] = useState(initialKey);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function renew() {
    if (key && !confirming) return setConfirming(true);
    setConfirming(false);
    setBusy(true);
    const res = await api<{ boothKey: string }>(`/api/admin/events/${eventId}/booth`, { method: "POST" }).catch(() => null);
    if (res) setKey(res.boothKey);
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    await api(`/api/admin/events/${eventId}/booth`, { method: "DELETE" }).catch(() => {});
    setKey(null);
    setBusy(false);
  }

  const boothUrl = key ? `${url}/booth?key=${key}` : null;

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>{t("admin.booth.title")}</CardTitle>
        <p className="text-sm text-ink-muted">{t("admin.booth.hint")}</p>
      </div>
      {boothUrl ? (
        <>
          <CopyField value={boothUrl} />
          <div className="flex flex-wrap gap-2">
            <a href={boothUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
              <ExternalLink className="size-4" aria-hidden />
              {t("admin.booth.open")}
            </a>
            <Button size="sm" variant={confirming ? "danger" : "ghost"} onClick={renew} onBlur={() => setConfirming(false)} loading={busy}>
              <RefreshCw className="size-4" aria-hidden />
              {confirming ? t("admin.booth.confirmNewLink") : t("admin.booth.newLink")}
            </Button>
            <Button size="sm" variant="ghost" onClick={disable} disabled={busy}>
              {t("admin.booth.disable")}
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button variant="secondary" onClick={renew} loading={busy}>
            <Camera className="size-4" aria-hidden />
            {t("admin.booth.enable")}
          </Button>
        </div>
      )}
    </Card>
  );
}

"use client";

import { Check, Download, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { SpotDto } from "@/lib/spots";

/** Places of the event, each with its own QR code: photos say where they were taken. */
export function SpotsCard({ eventId, initial }: { eventId: string; initial: SpotDto[] }) {
  const t = useT();
  const router = useRouter();
  const [spots, setSpots] = useState(initial);
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const res = await api<{ spot: SpotDto }>(`/api/admin/events/${eventId}/spots`, { body: { label } }).catch(() => null);
    if (res) {
      setSpots((list) => [...list, res.spot]);
      setLabel("");
      // The photo filter of the Photos tab reads the list from the server.
      router.refresh();
    }
    setBusy(false);
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing?.label.trim()) return;
    const res = await api<{ spot: { id: string; label: string } }>(`/api/admin/events/${eventId}/spots/${editing.id}`, { method: "PATCH", body: { label: editing.label } }).catch(() => null);
    if (res) setSpots((list) => list.map((s) => (s.id === res.spot.id ? { ...s, label: res.spot.label } : s)));
    setEditing(null);
  }

  async function remove(id: string) {
    if (confirmDelete !== id) return setConfirmDelete(id);
    setConfirmDelete(null);
    await api(`/api/admin/events/${eventId}/spots/${id}`, { method: "DELETE" }).catch(() => {});
    setSpots((list) => list.filter((s) => s.id !== id));
    router.refresh();
  }

  const qr = (id: string, format: "png" | "svg") => `/api/admin/events/${eventId}/qr?spot=${id}&format=${format}&size=2048&download=1`;

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>{t("admin.spots.title")}</CardTitle>
        <p className="text-sm text-ink-muted">{t("admin.spots.hint")}</p>
      </div>

      {spots.length > 0 && (
        <ul role="list" className="divide-y divide-line rounded-lg text-sm ring-1 ring-line">
          {spots.map((spot) => (
            <li key={spot.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <MapPin className="size-4 shrink-0 text-ink-muted" aria-hidden />
              {editing?.id === spot.id ? (
                <form onSubmit={rename} className="flex min-w-0 flex-1 items-center gap-2">
                  <Input value={editing.label} maxLength={40} onChange={(e) => setEditing({ ...editing, label: e.target.value })} aria-label={t("admin.spots.label")} autoFocus className="h-8 py-1" />
                  <Button type="submit" size="sm" variant="ghost" aria-label={t("common.save")}>
                    <Check className="size-4" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} aria-label={t("common.cancel")}>
                    <X className="size-4" aria-hidden />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate font-medium">{spot.label}</span>
                  <span className="tabular-nums text-ink-muted">{t("admin.spots.photos", { n: spot.photos })}</span>
                  <a href={qr(spot.id, "png")} className={buttonClass("ghost", "sm")}>
                    <Download className="size-4" aria-hidden />
                    PNG
                  </a>
                  <a href={qr(spot.id, "svg")} className={buttonClass("ghost", "sm")}>
                    SVG
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ id: spot.id, label: spot.label })} aria-label={t("admin.spots.rename", { spot: spot.label })}>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant={confirmDelete === spot.id ? "danger" : "ghost"}
                    onClick={() => remove(spot.id)}
                    onBlur={() => setConfirmDelete(null)}
                    aria-label={t("admin.spots.delete", { spot: spot.label })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {confirmDelete === spot.id && t("admin.spots.confirmDelete")}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <Input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder={t("admin.spots.placeholder")} aria-label={t("admin.spots.label")} />
        <Button type="submit" variant="secondary" loading={busy} disabled={!label.trim()}>
          <Plus className="size-4" aria-hidden />
          {t("admin.spots.add")}
        </Button>
      </form>
    </Card>
  );
}

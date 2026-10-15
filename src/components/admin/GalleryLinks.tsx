"use client";

import { Link2, Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, Card, CardTitle, EmptyState, Field, Input, SegmentedControl, Switch } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";
import type { ShareDto } from "@/lib/shares";
import { CopyField } from "./CopyField";

/** Create, copy and revoke the password-protected links to an event's album. */
export function GalleryLinks({ eventId, baseUrl, locale }: { eventId: string; baseUrl: string; locale: string }) {
  const t = useT();
  const [shares, setShares] = useState<ShareDto[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [days, setDays] = useState(30);
  const [allowDownload, setAllowDownload] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ url: string; password: string | null } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<{ shares: ShareDto[] }>(`/api/admin/events/${eventId}/shares`)
        .catch(() => ({ shares: [] as ShareDto[] }))
        .then((data) => setShares(data.shares)),
    [eventId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const linkUrl = (token: string) => `${baseUrl}/g/${token}`;
  const date = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(ms));

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ share: ShareDto; password: string | null }>(`/api/admin/events/${eventId}/shares`, {
        body: { label, password, expiresInDays: days, allowDownload, favoritesOnly },
      });
      setCreated({ url: linkUrl(res.share.token), password: res.password ?? password });
      setCreating(false);
      setLabel("");
      setPassword("");
      await load();
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (confirmRevoke !== id) return setConfirmRevoke(id);
    await api(`/api/admin/events/${eventId}/shares/${id}`, { method: "DELETE" }).catch(() => {});
    setConfirmRevoke(null);
    await load();
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>{t("admin.gallery.title")}</CardTitle>
          <p className="max-w-prose text-sm text-ink-muted">{t("admin.gallery.hint")}</p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {t("admin.gallery.create")}
          </Button>
        )}
      </div>

      {created && (
        <div role="status" className="space-y-2 rounded-lg bg-sunken p-3">
          <p className="text-sm font-medium">{t("admin.gallery.created")}</p>
          <CopyField value={created.url} />
          {created.password && <CopyField value={created.password} />}
        </div>
      )}

      {creating && (
        <form onSubmit={create} className="grid gap-4 rounded-lg p-3 ring-1 ring-line sm:grid-cols-2">
          <Field label={t("admin.gallery.label")}>
            {(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("admin.gallery.labelPlaceholder")} maxLength={80} />}
          </Field>
          <Field label={t("admin.gallery.password")} hint={t("admin.gallery.passwordHint")} error={error}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" />
            )}
          </Field>
          <Field label={t("admin.gallery.expiresInDays")} hint={t("admin.form.galleryLinkDaysHint")}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} type="number" min={0} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} />
            )}
          </Field>
          <div className="self-end">
            <Switch label={t("admin.gallery.allowDownload")} checked={allowDownload} onChange={setAllowDownload} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">{t("admin.gallery.scope")}</p>
            <SegmentedControl
              name={t("admin.gallery.scope")}
              value={favoritesOnly ? "favorites" : "all"}
              options={["all", "favorites"] as const}
              onChange={(v) => setFavoritesOnly(v === "favorites")}
              label={(v) => t(v === "all" ? "admin.gallery.scopeAll" : "admin.gallery.scopeFavorites")}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={busy}>
              {t("admin.gallery.create")}
            </Button>
          </div>
        </form>
      )}

      {shares && shares.length === 0 && !created && <EmptyState className="py-6">{t("admin.gallery.empty")}</EmptyState>}
      {shares && shares.length > 0 && (
        <ul role="list" className="divide-y divide-line rounded-lg ring-1 ring-line">
          {shares.map((share) => {
            // `active` is computed by the server: no clock read during render.
            const expired = !share.revokedAt && !share.active;
            return (
              <li key={share.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{share.label || linkUrl(share.token).replace(/^https?:\/\//, "")}</p>
                  <p className="text-sm text-ink-muted tabular-nums">
                    {t("admin.gallery.views", { n: share.views })}
                    {", "}
                    {share.expiresAt ? t("admin.gallery.expires", { date: date(share.expiresAt) }) : t("admin.gallery.never")}
                  </p>
                </div>
                {share.favoritesOnly && <Badge tone="accent">{t("admin.gallery.scopeFavorites")}</Badge>}
                <Badge>{share.allowDownload ? t("admin.gallery.downloadsOn") : t("admin.gallery.downloadsOff")}</Badge>
                {share.revokedAt ? (
                  <Badge tone="danger">{t("admin.gallery.revoked")}</Badge>
                ) : expired ? (
                  <Badge>{t("admin.gallery.expired")}</Badge>
                ) : (
                  <span className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(linkUrl(share.token)).catch(() => {})}>
                      {t("common.copy")}
                    </Button>
                    <Button size="sm" variant={confirmRevoke === share.id ? "danger" : "ghost"} onClick={() => revoke(share.id)} onBlur={() => setConfirmRevoke(null)}>
                      {t("admin.gallery.revoke")}
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

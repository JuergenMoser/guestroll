"use client";

import { Mail, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input, SegmentedControl } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";
import type { InvitationDto } from "@/lib/invitations";
import { CopyField } from "./CopyField";
import { SettingsSection } from "./settings/SettingsSection";

const ROLES = ["organizer", "owner"] as const;

/** Invite someone by email: they pick their own username and password from the link. */
export function InvitationsSection({ events, locale }: { events: { id: string; name: string }[]; locale: string }) {
  const t = useT();
  const [pending, setPending] = useState<InvitationDto[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("organizer");
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<{ email: string; url: string; emailed: boolean } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => api<{ invitations: InvitationDto[] }>("/api/admin/invitations").then((d) => setPending(d.invitations)).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ url: string; emailed: boolean }>("/api/admin/invitations", { body: { email, role, eventIds } });
      setSent({ email, url: res.url, emailed: res.emailed });
      setEmail("");
      setEventIds([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.details?.email ? t("admin.invitations.emailInvalid") : errorText(t, err instanceof ApiError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (confirm !== id) return setConfirm(id);
    setConfirm(null);
    await api(`/api/admin/invitations/${id}`, { method: "DELETE" }).catch(() => {});
    await load();
  }

  const date = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(ms));
  const toggle = (id: string) => setEventIds((ids) => (ids.includes(id) ? ids.filter((e) => e !== id) : [...ids, id]));

  return (
    <SettingsSection id="invitations" title={t("admin.invitations.title")} description={t("admin.invitations.hint")}>
      <form onSubmit={invite} className="space-y-4">
        <Field label={t("admin.accounts.email")} error={error}>
          {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lea@example.com" required />}
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("admin.accounts.role")}</p>
          <SegmentedControl name={t("admin.accounts.role")} value={role} options={ROLES} onChange={setRole} label={(r) => t(`admin.accounts.roles.${r}`)} />
          <p className="text-xs text-ink-muted">{t(`admin.accounts.roleHints.${role}`)}</p>
        </div>
        {role === "organizer" && events.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("admin.accounts.events")}</legend>
            <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
              {events.map((event) => (
                <label key={event.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[15px] hover:bg-sunken">
                  <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={eventIds.includes(event.id)} onChange={() => toggle(event.id)} />
                  <span className="truncate">{event.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>
            <Send className="size-4" aria-hidden />
            {t("admin.invitations.send")}
          </Button>
        </div>
      </form>

      {sent && (
        <div role="status" className="space-y-2 rounded-lg bg-sunken p-3">
          <p className="text-sm font-medium">{sent.emailed ? t("admin.invitations.emailed", { email: sent.email }) : t("admin.invitations.notEmailed", { email: sent.email })}</p>
          <CopyField value={sent.url} />
        </div>
      )}

      {pending.length > 0 && (
        <ul role="list" className="divide-y divide-line rounded-lg text-sm ring-1 ring-line">
          {pending.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <Mail className="size-4 shrink-0 text-ink-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{inv.email}</span>
                <span className="text-ink-muted"> {t(`admin.accounts.roles.${inv.role}`)}, {t("admin.invitations.until", { date: date(inv.expiresAt) })}</span>
              </span>
              <Button size="sm" variant={confirm === inv.id ? "danger" : "ghost"} onClick={() => revoke(inv.id)} onBlur={() => setConfirm(null)} aria-label={t("admin.invitations.revoke", { email: inv.email })}>
                <Trash2 className="size-4" aria-hidden />
                {confirm === inv.id && t("admin.invitations.confirmRevoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}

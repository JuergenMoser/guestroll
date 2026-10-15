"use client";

import { Plus, UserRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, EmptyState, Field, Input, SegmentedControl } from "@/components/ui";
import { SettingsSection } from "./settings/SettingsSection";
import type { AccountDto } from "@/lib/accounts";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";
import type { MessageKey } from "@/lib/i18n/translate";
import { CopyField } from "./CopyField";

type Role = AccountDto["role"];
const ROLES = ["organizer", "owner"] as const;

interface Draft {
  username: string;
  name: string;
  email: string;
  role: Role;
  eventIds: string[];
}

const EMPTY: Draft = { username: "", name: "", email: "", role: "organizer", eventIds: [] };

function fieldErrors(t: ReturnType<typeof useT>, err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.details) return { form: errorText(t, err instanceof ApiError ? err.code : undefined) };
  return Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, t(`admin.accounts.errors.${v}` as MessageKey)]));
}

/** Owners add people, give organizers their events, reset passwords and remove access. */
export function AccountsPanel({ selfId, events, locale }: { selfId: string; events: { id: string; name: string }[]; locale: string }) {
  const t = useT();
  const [accounts, setAccounts] = useState<AccountDto[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ username: string; password: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => api<{ accounts: AccountDto[] }>("/api/admin/accounts").then((d) => setAccounts(d.accounts)).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);

  function open(account?: AccountDto) {
    setErrors({});
    setSecret(null);
    setEditing(account?.id ?? "new");
    setDraft(account ? { username: account.username, name: account.name, email: account.email ?? "", role: account.role, eventIds: account.eventIds } : EMPTY);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { ...draft, email: draft.email || null };
      const res =
        editing === "new"
          ? await api<{ account: AccountDto; password: string | null }>("/api/admin/accounts", { body })
          : await api<{ account: AccountDto; password: string | null }>(`/api/admin/accounts/${editing}`, { method: "PATCH", body });
      if (res.password) setSecret({ username: res.account.username, password: res.password });
      setEditing(null);
      await load();
    } catch (err) {
      setErrors(fieldErrors(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(account: AccountDto) {
    if (confirm !== `reset:${account.id}`) return setConfirm(`reset:${account.id}`);
    setConfirm(null);
    try {
      const res = await api<{ password: string | null }>(`/api/admin/accounts/${account.id}`, { method: "PATCH", body: { resetPassword: true } });
      if (res.password) setSecret({ username: account.username, password: res.password });
    } catch (err) {
      setErrors(fieldErrors(t, err));
    }
  }

  async function resetTwoFactor(account: AccountDto) {
    if (confirm !== `2fa:${account.id}`) return setConfirm(`2fa:${account.id}`);
    setConfirm(null);
    try {
      await api(`/api/admin/accounts/${account.id}`, { method: "PATCH", body: { resetTwoFactor: true } });
      setEditing(null);
      await load();
    } catch (err) {
      setErrors(fieldErrors(t, err));
    }
  }

  async function remove(account: AccountDto) {
    if (confirm !== `delete:${account.id}`) return setConfirm(`delete:${account.id}`);
    setConfirm(null);
    try {
      await api(`/api/admin/accounts/${account.id}`, { method: "DELETE" });
      setEditing(null);
      await load();
    } catch (err) {
      setErrors(fieldErrors(t, err));
    }
  }

  const toggleEvent = (id: string) =>
    setDraft((d) => ({ ...d, eventIds: d.eventIds.includes(id) ? d.eventIds.filter((e) => e !== id) : [...d.eventIds, id] }));
  const date = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(ms));
  const current = accounts?.find((a) => a.id === editing);

  const form = (
    <form onSubmit={save} className="space-y-4 rounded-lg p-3 ring-1 ring-line">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.accounts.username")} hint={t("admin.accounts.usernameHint")} error={errors.username}>
          {(id, describedBy) => (
            <Input id={id} aria-describedby={describedBy} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} autoComplete="off" required />
          )}
        </Field>
        <Field label={t("admin.accounts.name")} error={errors.name}>
          {(id) => <Input id={id} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />}
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("admin.accounts.email")} hint={t("admin.accounts.emailHint")} error={errors.email}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            )}
          </Field>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("admin.accounts.role")}</p>
        <SegmentedControl name={t("admin.accounts.role")} value={draft.role} options={ROLES} onChange={(role) => setDraft({ ...draft, role })} label={(r) => t(`admin.accounts.roles.${r}`)} />
        <p className="text-xs text-ink-muted">{t(`admin.accounts.roleHints.${draft.role}`)}</p>
        {errors.role && <p className="text-xs text-danger">{errors.role}</p>}
      </div>
      {draft.role === "organizer" && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("admin.accounts.events")}</legend>
          {events.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("admin.accounts.noEvents")}</p>
          ) : (
            <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
              {events.map((event) => (
                <label key={event.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[15px] hover:bg-sunken">
                  <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={draft.eventIds.includes(event.id)} onChange={() => toggleEvent(event.id)} />
                  <span className="truncate">{event.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
      {editing === "new" && <p className="text-xs text-ink-muted">{t("admin.accounts.passwordGenerated")}</p>}
      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex gap-2">
          {current && (
            <>
              {current.id !== selfId && (
                <Button size="sm" variant={confirm === `reset:${current.id}` ? "danger" : "ghost"} onClick={() => resetPassword(current)} onBlur={() => setConfirm(null)}>
                  {confirm === `reset:${current.id}` ? t("admin.accounts.confirmReset") : t("admin.accounts.resetPassword")}
                </Button>
              )}
              {current.twoFactor && current.id !== selfId && (
                <Button size="sm" variant={confirm === `2fa:${current.id}` ? "danger" : "ghost"} onClick={() => resetTwoFactor(current)} onBlur={() => setConfirm(null)}>
                  {confirm === `2fa:${current.id}` ? t("admin.twoFactor.confirmReset") : t("admin.twoFactor.reset")}
                </Button>
              )}
              {current.id !== selfId && (
                <Button size="sm" variant={confirm === `delete:${current.id}` ? "danger" : "ghost"} onClick={() => remove(current)} onBlur={() => setConfirm(null)}>
                  {confirm === `delete:${current.id}` ? t("admin.accounts.confirmDelete") : t("admin.accounts.delete")}
                </Button>
              )}
            </>
          )}
        </span>
        <span className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={busy}>
            {editing === "new" ? t("admin.accounts.create") : t("common.save")}
          </Button>
        </span>
      </div>
    </form>
  );

  return (
    <SettingsSection title={t("admin.accounts.title")} description={t("admin.accounts.hint")}>
      {editing !== "new" && (
        <Button size="sm" onClick={() => open()}>
          <Plus className="size-4" aria-hidden />
          {t("admin.accounts.add")}
        </Button>
      )}

      {secret && (
        <div role="status" className="space-y-2 rounded-lg bg-sunken p-3">
          <p className="text-sm font-medium">{t("admin.accounts.passwordOnce", { username: secret.username })}</p>
          <CopyField value={secret.password} />
        </div>
      )}

      {editing === "new" && form}

      {accounts && accounts.length === 0 && <EmptyState className="py-6">{t("admin.accounts.empty")}</EmptyState>}
      {accounts && accounts.length > 0 && (
        <ul role="list" className="divide-y divide-line rounded-lg ring-1 ring-line">
          {accounts.map((account) =>
            editing === account.id ? (
              <li key={account.id} className="p-2">
                {form}
              </li>
            ) : (
              <li key={account.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                <UserRound className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {account.name || account.username}
                    {account.id === selfId && <span className="font-normal text-ink-muted"> {t("admin.accounts.you")}</span>}
                  </p>
                  <p className="truncate text-sm text-ink-muted">
                    {account.username}
                    {", "}
                    {account.role === "organizer" ? t("admin.accounts.eventCount", { n: account.eventIds.length }) : t("admin.accounts.allEvents")}
                    {", "}
                    {account.lastLoginAt ? t("admin.accounts.lastLogin", { date: date(account.lastLoginAt) }) : t("admin.accounts.neverLoggedIn")}
                  </p>
                </div>
                {account.twoFactor && <Badge tone="ok">{t("admin.twoFactor.badge")}</Badge>}
                <Badge tone={account.role === "owner" ? "accent" : "neutral"}>{t(`admin.accounts.roles.${account.role}`)}</Badge>
                <Button size="sm" variant="secondary" onClick={() => open(account)}>
                  {t("admin.accounts.edit")}
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
    </SettingsSection>
  );
}

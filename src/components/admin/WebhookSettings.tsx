"use client";

import { Plus, Send, Webhook as WebhookIcon } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, EmptyState, Field, Input, SegmentedControl, Switch } from "@/components/ui";
import { SettingsSection } from "./settings/SettingsSection";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";
import { WEBHOOK_KINDS, WEBHOOK_TYPES, type WebhookDto, type WebhookType } from "@/lib/webhooks/types";

interface Delivery {
  id: string;
  webhookId: string;
  kind: string;
  status: "pending" | "sent" | "failed";
  lastError: string | null;
  createdAt: number;
}

interface Draft {
  name: string;
  type: WebhookType;
  url: string;
  secret: string;
  kinds: string[];
  enabled: boolean;
}

const EMPTY: Draft = { name: "", type: "ntfy", url: "", secret: "", kinds: ["event_ended", "photos_pending"], enabled: true };
const PLACEHOLDERS: Record<WebhookType, string> = {
  ntfy: "https://ntfy.sh/my-party-alerts",
  discord: "https://discord.com/api/webhooks/…",
  slack: "https://hooks.slack.com/services/…",
  json: "https://homeassistant.local:8123/api/webhook/…",
};

/** Alerts to ntfy, Discord, Slack or any JSON endpoint, in addition to email. */
export function WebhookSettings({ locale }: { locale: string }) {
  const t = useT();
  const [hooks, setHooks] = useState<WebhookDto[] | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<{ webhooks: WebhookDto[]; deliveries: Delivery[] }>("/api/admin/webhooks")
        .then((d) => {
          setHooks(d.webhooks);
          setDeliveries(d.deliveries);
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  function open(hook?: WebhookDto) {
    setErrors({});
    setEditing(hook?.id ?? "new");
    setDraft(hook ? { name: hook.name, type: hook.type, url: "", secret: "", kinds: hook.kinds, enabled: hook.enabled } : EMPTY);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = { ...draft, secret: draft.type === "json" && draft.secret ? draft.secret : draft.type === "json" ? "" : null };
    try {
      if (editing === "new") await api("/api/admin/webhooks", { body });
      else await api(`/api/admin/webhooks/${editing}`, { method: "PATCH", body });
      setEditing(null);
      await load();
    } catch (err) {
      setErrors(err instanceof ApiError && err.details ? err.details : { form: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(false);
    }
  }

  async function test(id: string) {
    setTestResult(null);
    const res = await fetch(`/api/admin/webhooks/${id}/test`, { method: "POST" }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string }) : { error: "offline" };
    setTestResult({ id, ok: Boolean(data.ok), text: data.ok ? t("admin.webhooks.testOk") : data.message ? t("admin.webhooks.testFailed", { message: data.message }) : errorText(t, data.error) });
  }

  async function remove(id: string) {
    if (confirm !== id) return setConfirm(id);
    await api(`/api/admin/webhooks/${id}`, { method: "DELETE" }).catch(() => {});
    setConfirm(null);
    setEditing(null);
    await load();
  }

  const time = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(ms));
  const nameOf = (id: string) => hooks?.find((h) => h.id === id)?.name ?? "—";

  const form = (
    <form onSubmit={save} className="space-y-4 rounded-lg p-3 ring-1 ring-line">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.webhooks.name")} error={errors.name && t("admin.accounts.errors.invalid")}>
          {(id) => <Input id={id} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t("admin.webhooks.namePlaceholder")} maxLength={60} required />}
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("admin.webhooks.type")}</p>
          <SegmentedControl name={t("admin.webhooks.type")} value={draft.type} options={WEBHOOK_TYPES} onChange={(type) => setDraft({ ...draft, type })} label={(v) => t(`admin.webhooks.types.${v}`)} />
        </div>
        <div className="sm:col-span-2">
          <Field label={t("admin.webhooks.url")} hint={editing !== "new" ? t("admin.webhooks.urlKept") : t(`admin.webhooks.urlHints.${draft.type}`)} error={errors.url && t("admin.accounts.errors.invalid")}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} type="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder={PLACEHOLDERS[draft.type]} required={editing === "new"} autoComplete="off" />
            )}
          </Field>
        </div>
        {draft.type === "json" && (
          <div className="sm:col-span-2">
            <Field label={t("admin.webhooks.secret")} hint={t("admin.webhooks.secretHint")}>
              {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={draft.secret} onChange={(e) => setDraft({ ...draft, secret: e.target.value })} autoComplete="off" />}
            </Field>
          </div>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("admin.webhooks.kinds")}</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {WEBHOOK_KINDS.map((kind) => (
            <label key={kind} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[15px] hover:bg-sunken">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-ink)]"
                checked={draft.kinds.includes(kind)}
                onChange={() => setDraft({ ...draft, kinds: draft.kinds.includes(kind) ? draft.kinds.filter((k) => k !== kind) : [...draft.kinds, kind] })}
              />
              {t(`admin.webhooks.kindNames.${kind}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Switch label={t("admin.webhooks.enabled")} checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} />
      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
      {errors.webhook && <p className="text-sm text-danger">{t("admin.webhooks.limit")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {editing !== "new" && editing && (
            <Button size="sm" variant={confirm === editing ? "danger" : "ghost"} onClick={() => remove(editing)} onBlur={() => setConfirm(null)}>
              {confirm === editing ? t("admin.webhooks.confirmDelete") : t("admin.accounts.delete")}
            </Button>
          )}
        </span>
        <span className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={busy}>
            {t("common.save")}
          </Button>
        </span>
      </div>
    </form>
  );

  return (
    <>
    <SettingsSection id="webhooks" title={t("admin.webhooks.title")} description={t("admin.webhooks.hint")}>
      {editing !== "new" && (
        <Button size="sm" onClick={() => open()}>
          <Plus className="size-4" aria-hidden />
          {t("admin.webhooks.add")}
        </Button>
      )}

      {editing === "new" && form}
      {hooks && hooks.length === 0 && editing !== "new" && <EmptyState className="py-6">{t("admin.webhooks.empty")}</EmptyState>}
      {hooks && hooks.length > 0 && (
        <ul role="list" className="divide-y divide-line rounded-lg ring-1 ring-line">
          {hooks.map((hook) =>
            editing === hook.id ? (
              <li key={hook.id} className="p-2">
                {form}
              </li>
            ) : (
              <li key={hook.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                <WebhookIcon className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{hook.name}</p>
                  <p className="truncate text-sm text-ink-muted">{hook.urlHint}</p>
                  {testResult?.id === hook.id && <p className={testResult.ok ? "text-sm text-ok" : "text-sm text-danger"}>{testResult.text}</p>}
                </div>
                <Badge>{t(`admin.webhooks.types.${hook.type}`)}</Badge>
                {!hook.enabled && <Badge tone="danger">{t("admin.webhooks.off")}</Badge>}
                <Button size="sm" variant="ghost" onClick={() => test(hook.id)}>
                  <Send className="size-4" aria-hidden />
                  {t("admin.webhooks.test")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => open(hook)}>
                  {t("admin.accounts.edit")}
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

    </SettingsSection>
      {deliveries.length > 0 && (
        <SettingsSection title={t("admin.webhooks.recent")} description={t("admin.webhooks.recentHint")}>
          <ul role="list" className="divide-y divide-line rounded-lg text-sm ring-1 ring-line">
            {deliveries.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{(WEBHOOK_KINDS as readonly string[]).includes(d.kind) ? t(`admin.webhooks.kindNames.${d.kind as (typeof WEBHOOK_KINDS)[number]}`) : d.kind}</span>
                  <span className="text-ink-muted"> {nameOf(d.webhookId)}</span>
                </span>
                <span className="tabular-nums text-ink-muted">{time(d.createdAt)}</span>
                <Badge tone={d.status === "sent" ? "ok" : d.status === "failed" ? "danger" : "neutral"}>{t(`admin.mail.status.${d.status}`)}</Badge>
                {d.lastError && d.status !== "sent" && <span className="w-full truncate text-xs text-danger">{d.lastError}</span>}
              </li>
            ))}
          </ul>
        </SettingsSection>
      )}
    </>
  );
}

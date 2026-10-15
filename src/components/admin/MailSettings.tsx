"use client";

import { RotateCcw, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, Card, CardTitle, Field, Input, StatusMessage, Switch } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";
import type { MessageKey } from "@/lib/i18n/translate";
import type { OutboxSummary } from "@/lib/mail/outbox";
import type { AlertSettings } from "@/lib/mail/settings";

interface MailState {
  smtp: { source: "env" | "admin" | "none"; host: string; port: number; secure: boolean; user: string; from: string; hasPassword: boolean };
  adminEmail: string;
  adminEmailFromEnv: boolean;
  alerts: AlertSettings;
  outbox: OutboxSummary;
}

const ALERTS: { key: keyof AlertSettings; label: MessageKey }[] = [
  { key: "pendingPhotos", label: "admin.mail.alertPending" },
  { key: "eventEnded", label: "admin.mail.alertEnded" },
  { key: "failedLogins", label: "admin.mail.alertLogins" },
  { key: "storage", label: "admin.mail.alertStorage" },
];

/** SMTP connection, alert recipient and choices, and the outgoing queue. */
export function MailSettings({ locale }: { locale: string }) {
  const t = useT();
  const [state, setState] = useState<MailState | null>(null);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState<"save" | "test" | "retry" | null>(null);

  const load = useCallback(() => api<MailState>("/api/admin/mail").then(setState).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!state) return null;
  const fromEnv = state.smtp.source === "env";
  const setSmtp = <K extends keyof MailState["smtp"]>(key: K, value: MailState["smtp"][K]) =>
    setState((s) => (s ? { ...s, smtp: { ...s.smtp, [key]: value } } : s));

  async function save(e?: FormEvent, alerts = state!.alerts) {
    e?.preventDefault();
    setBusy("save");
    setErrors({});
    setMessage(undefined);
    try {
      await api("/api/admin/mail", {
        method: "PUT",
        body: {
          ...(fromEnv ? {} : { smtp: { ...state!.smtp, password } }),
          ...(state!.adminEmailFromEnv ? {} : { adminEmail: state!.adminEmail }),
          alerts,
        },
      });
      setPassword("");
      setMessage({ ok: true, text: t("common.saved") });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setMessage({ ok: false, text: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy("test");
    setMessage(undefined);
    const res = await fetch("/api/admin/mail/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; to?: string; message?: string; error?: string }) : { error: "offline" };
    setMessage(
      data.ok
        ? { ok: true, text: t("admin.mail.testSent", { to: data.to ?? "" }) }
        : { ok: false, text: data.message ? t("admin.mail.testFailed", { message: data.message }) : errorText(t, data.error) },
    );
    setBusy(null);
    await load();
  }

  async function retry() {
    setBusy("retry");
    await api("/api/admin/mail/retry", { method: "POST" }).catch(() => {});
    setBusy(null);
    await load();
  }

  const time = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(ms));

  return (
    <Card className="space-y-6">
      <div className="space-y-1">
        <CardTitle>{t("admin.mail.title")}</CardTitle>
        <p className="text-sm text-ink-muted">{t("admin.mail.hint")}</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        {fromEnv ? (
          <p className="rounded-lg bg-sunken p-3 text-sm text-ink-soft">{t("admin.mail.fromEnv")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label={t("admin.mail.host")} error={errors.host}>
              {(id) => <Input id={id} value={state.smtp.host} onChange={(e) => setSmtp("host", e.target.value)} placeholder="smtp.example.com" autoComplete="off" />}
            </Field>
            <Field label={t("admin.mail.port")} error={errors.port}>
              {(id) => <Input id={id} type="number" min={1} max={65535} value={state.smtp.port} onChange={(e) => setSmtp("port", Number(e.target.value))} />}
            </Field>
            <Field label={t("admin.mail.user")}>
              {(id) => <Input id={id} value={state.smtp.user} onChange={(e) => setSmtp("user", e.target.value)} autoComplete="off" />}
            </Field>
            <Field label={t("admin.mail.password")} hint={state.smtp.hasPassword ? t("admin.mail.passwordKept") : undefined}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={state.smtp.hasPassword ? "••••••••" : ""}
                  autoComplete="new-password"
                />
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("admin.mail.from")} error={errors.from}>
                {(id) => <Input id={id} value={state.smtp.from} onChange={(e) => setSmtp("from", e.target.value)} placeholder="Guestroll <photos@example.com>" />}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Switch label={t("admin.mail.secure")} checked={state.smtp.secure} onChange={(v) => setSmtp("secure", v)} />
            </div>
          </div>
        )}

        <Field label={t("admin.mail.adminEmail")} hint={state.adminEmailFromEnv ? t("admin.mail.adminEmailFromEnv") : undefined} error={errors.adminEmail}>
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="email"
              value={state.adminEmail}
              disabled={state.adminEmailFromEnv}
              onChange={(e) => setState({ ...state, adminEmail: e.target.value })}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusMessage message={message} />
          <Button variant="secondary" onClick={sendTest} loading={busy === "test"} disabled={state.smtp.source === "none"}>
            <Send className="size-4" aria-hidden />
            {t("admin.mail.test")}
          </Button>
          <Button type="submit" loading={busy === "save"}>
            {t("admin.mail.save")}
          </Button>
        </div>
      </form>

      <section className="space-y-3 border-t border-line pt-5">
        <h3 className="font-semibold">{t("admin.mail.alerts")}</h3>
        {ALERTS.map(({ key, label }) => (
          <Switch
            key={key}
            label={t(label)}
            checked={state.alerts[key]}
            onChange={(v) => {
              const alerts = { ...state.alerts, [key]: v };
              setState({ ...state, alerts });
              void save(undefined, alerts);
            }}
          />
        ))}
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("admin.mail.queue")}</h3>
          <span className="flex items-center gap-2">
            {state.outbox.pending > 0 && <Badge>{t("admin.mail.pending", { n: state.outbox.pending })}</Badge>}
            {state.outbox.failed > 0 && (
              <>
                <Badge tone="danger">{t("admin.mail.failed", { n: state.outbox.failed })}</Badge>
                <Button size="sm" variant="ghost" onClick={retry} loading={busy === "retry"}>
                  <RotateCcw className="size-4" aria-hidden />
                  {t("admin.mail.retry")}
                </Button>
              </>
            )}
          </span>
        </div>
        {state.smtp.source === "none" && <p className="text-sm text-ink-muted">{t("admin.mail.notConfigured")}</p>}
        {state.outbox.recent.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("admin.mail.queueEmpty")}</p>
        ) : (
          <ul role="list" className="divide-y divide-line rounded-lg text-sm ring-1 ring-line">
            {state.outbox.recent.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{m.subject}</span>
                  <span className="text-ink-muted"> {m.to}</span>
                </span>
                <span className="tabular-nums text-ink-muted">{time(m.sentAt ?? m.createdAt)}</span>
                <Badge tone={m.status === "sent" ? "ok" : m.status === "failed" ? "danger" : "neutral"}>{t(`admin.mail.status.${m.status}`)}</Badge>
                {m.lastError && m.status !== "sent" && <span className="w-full truncate text-xs text-danger">{m.lastError}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

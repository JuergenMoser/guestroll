"use client";

import { Download, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, buttonClass, Field, Input, Select, StatusMessage, Switch } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { formatBytes } from "@/lib/format";
import { SettingsSection } from "./settings/SettingsSection";

interface State {
  schedule: { enabled: boolean; cron: string; keep: number };
  scheduleFromEnv: boolean;
  target: string;
  lastRun: { at: number; ok: boolean; name?: string; bytes?: number; error?: string } | null;
  nextRun: number | null;
  stored: { name: string; bytes: number }[];
}

// Common schedules, so most owners never write a cron expression.
const PRESETS = ["0 3 * * *", "0 */6 * * *", "0 3 * * 1", "custom"] as const;

/** Backups on a schedule to a folder or a bucket, the newest kept, each one restorable. */
export function ScheduledBackups({ locale }: { locale: string }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [draft, setDraft] = useState<State["schedule"] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<State>("/api/admin/backup")
        .then((data) => {
          setState(data);
          setDraft(data.schedule);
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  if (!state || !draft) return null;
  const when = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
  const preset = (PRESETS as readonly string[]).includes(draft.cron) ? draft.cron : "custom";

  async function save() {
    setMessage(undefined);
    setBusy("save");
    try {
      await api("/api/admin/backup/schedule", { method: "PUT", body: draft });
      setMessage({ ok: true, text: t("common.saved") });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError && err.details?.cron ? t("admin.backup.cronInvalid") : t("errors.generic") });
    } finally {
      setBusy(null);
    }
  }

  async function runNow() {
    setMessage(undefined);
    setBusy("run");
    const res = await fetch("/api/admin/backup/run", { method: "POST" }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { message?: string; details?: { backup?: string } }) : {};
    setMessage(res?.ok ? { ok: true, text: t("admin.backup.ranNow") } : { ok: false, text: data.message ?? data.details?.backup ?? t("errors.generic") });
    setBusy(null);
    await load();
  }

  async function remove(name: string) {
    if (confirm !== `delete:${name}`) return setConfirm(`delete:${name}`);
    setConfirm(null);
    await api(`/api/admin/backup/stored/${name}`, { method: "DELETE" }).catch(() => {});
    await load();
  }

  async function restore(name: string) {
    if (confirm !== `restore:${name}`) return setConfirm(`restore:${name}`);
    setConfirm(null);
    setBusy(`restore:${name}`);
    try {
      await api(`/api/admin/backup/stored/${name}/restore`, { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setMessage({ ok: false, text: t("errors.generic") });
      setBusy(null);
    }
  }

  return (
    <SettingsSection id="automatic-backups" title={t("admin.backup.scheduled")} description={t("admin.backup.scheduledHint", { target: state.target })}>
      {state.scheduleFromEnv ? (
        <p className="rounded-lg bg-sunken p-3 text-sm text-ink-soft">{t("admin.backup.fromEnv", { cron: state.schedule.cron, keep: state.schedule.keep })}</p>
      ) : (
        <div className="space-y-4">
          <Switch label={t("admin.backup.enable")} checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} />
          {draft.enabled && (
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
              <Field label={t("admin.backup.when")}>
                {(id) => (
                  <Select id={id} value={preset} onChange={(e) => setDraft({ ...draft, cron: e.target.value === "custom" ? draft.cron : e.target.value })}>
                    {PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {t(`admin.backup.presets.${p === "custom" ? "custom" : p === "0 3 * * *" ? "daily" : p === "0 */6 * * *" ? "sixHours" : "weekly"}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t("admin.backup.cron")} hint={t("admin.backup.cronHint")}>
                {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={draft.cron} onChange={(e) => setDraft({ ...draft, cron: e.target.value })} className="font-mono" />}
              </Field>
              <Field label={t("admin.backup.keep")}>
                {(id) => <Input id={id} type="number" min={1} max={365} value={draft.keep} onChange={(e) => setDraft({ ...draft, keep: Number(e.target.value) || 1 })} />}
              </Field>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={runNow} loading={busy === "run"}>
          {t("admin.backup.runNow")}
        </Button>
        {!state.scheduleFromEnv && (
          <Button onClick={save} loading={busy === "save"}>
            {t("common.save")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
        {state.lastRun && (
          <span className="flex items-center gap-2">
            {t("admin.backup.lastRun", { date: when(state.lastRun.at) })}
            <Badge tone={state.lastRun.ok ? "ok" : "danger"}>{state.lastRun.ok ? t("admin.mail.status.sent") : t("admin.mail.status.failed")}</Badge>
          </span>
        )}
        {state.nextRun && <span>{t("admin.backup.nextRun", { date: when(state.nextRun) })}</span>}
      </div>
      {state.lastRun && !state.lastRun.ok && <p className="text-sm text-danger">{state.lastRun.error}</p>}
      <StatusMessage message={message} />

      {state.stored.length > 0 && (
        <ul role="list" className="divide-y divide-line rounded-lg text-sm ring-1 ring-line">
          {state.stored.map((b) => (
            <li key={b.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <span className="min-w-0 flex-1 truncate font-mono">{b.name}</span>
              <span className="tabular-nums text-ink-muted">{formatBytes(b.bytes, locale)}</span>
              <a href={`/api/admin/backup/stored/${b.name}`} className={buttonClass("ghost", "sm")} aria-label={t("admin.backup.download")}>
                <Download className="size-4" aria-hidden />
              </a>
              <Button size="sm" variant={confirm === `restore:${b.name}` ? "danger" : "ghost"} onClick={() => restore(b.name)} onBlur={() => setConfirm(null)} loading={busy === `restore:${b.name}`}>
                <RotateCcw className="size-4" aria-hidden />
                {confirm === `restore:${b.name}` ? t("admin.backup.confirmRestore") : t("admin.backup.restore")}
              </Button>
              <Button size="sm" variant={confirm === `delete:${b.name}` ? "danger" : "ghost"} onClick={() => remove(b.name)} onBlur={() => setConfirm(null)} aria-label={t("guestbook.delete")}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}

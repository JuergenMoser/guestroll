"use client";

import { ArrowUpCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, Card, CardTitle, StatusMessage, Switch } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";
import type { UpdaterJob } from "@/lib/updater";

interface Info {
  current: string;
  latest: { version: string; url: string; publishedAt: string; checkedAt: number } | null;
  available: { version: string; notes: string; url: string } | null;
  checkEnabled: boolean;
  history: { from: string; to: string; at: number; migrations: string[] }[];
  updater: { configured: boolean; reachable: boolean; image?: string; error?: string; job?: UpdaterJob | null };
}

/** Like Matomo's: what's new, then one click (backup, new image, health check, rollback if needed). */
export function UpdatesCard({ locale }: { locale: string }) {
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState<"check" | "apply" | null>(null);
  const [phase, setPhase] = useState<"idle" | "backup" | "updating" | "restarting">("idle");
  const [skipBackup, setSkipBackup] = useState(false);
  const target = useRef<string | null>(null);

  const load = useCallback(
    (): Promise<Info | null> =>
      fetch("/api/admin/updates", { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<Info>) : null))
        .then((data) => {
          if (data) setInfo(data);
          return data;
        })
        .catch(() => null),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  // While the container is replaced, this page polls until the new version answers.
  useEffect(() => {
    if (phase !== "updating" && phase !== "restarting") return;
    const timer = setInterval(async () => {
      const data = await load();
      if (!data) return setPhase("restarting");
      const job = data.updater.job;
      if (target.current && data.current === target.current) {
        setPhase("idle");
        setMessage({ ok: true, text: t("admin.updates.done", { version: data.current }) });
      } else if (job && (job.state === "failed" || job.state === "rolled_back")) {
        setPhase("idle");
        setMessage({ ok: false, text: t(job.state === "rolled_back" ? "admin.updates.rolledBack" : "admin.updates.failed", { error: job.error ?? "" }) });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [phase, load, t]);

  const notes = useMemo(() => (info?.available ? renderMarkdown(info.available.notes) : ""), [info]);
  if (!info) return null;
  const when = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));

  async function check() {
    setBusy("check");
    setMessage(undefined);
    const res = await fetch("/api/admin/updates/check", { method: "POST" }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { available?: unknown; message?: string }) : {};
    if (!res?.ok) setMessage({ ok: false, text: t("admin.updates.checkFailed", { error: data.message ?? "" }) });
    else if (!data.available) setMessage({ ok: true, text: t("admin.updates.upToDate") });
    await load();
    setBusy(null);
  }

  async function apply() {
    if (!info?.available) return;
    setBusy("apply");
    setMessage(undefined);
    setPhase(skipBackup ? "updating" : "backup");
    target.current = info.available.version;
    const res = await fetch("/api/admin/updates/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: info.available.version, skipBackup }),
    }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { error?: string; message?: string }) : {};
    setBusy(null);
    if (res?.status === 202) return setPhase("updating");
    setPhase("idle");
    setMessage({ ok: false, text: data.error === "backup_failed" ? t("admin.updates.backupFailed", { error: data.message ?? "" }) : t("admin.updates.failed", { error: data.message ?? "" }) });
  }

  const job = info.updater.job;
  return (
    <Card className="space-y-5">
      <div id="updates" className="flex flex-wrap items-start justify-between gap-3 scroll-mt-24">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="size-4" aria-hidden />
            {t("admin.updates.title")}
          </CardTitle>
          <p className="text-sm text-ink-muted">
            {t("admin.updates.running", { version: info.current })}
            {info.latest && ` ${t("admin.updates.checked", { date: when(info.latest.checkedAt) })}`}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={check} loading={busy === "check"} disabled={!info.checkEnabled}>
          <RefreshCw className="size-4" aria-hidden />
          {t("admin.updates.checkNow")}
        </Button>
      </div>

      {!info.checkEnabled && <p className="text-sm text-ink-muted">{t("admin.updates.checkOff")}</p>}

      {info.available ? (
        <section className="space-y-4 rounded-lg p-4 ring-1 ring-accent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">{t("admin.updates.newVersion", { version: info.available.version })}</Badge>
            <a href={info.available.url} target="_blank" rel="noreferrer" className="text-sm text-accent underline-offset-2 hover:underline">
              {t("admin.updates.releaseNotes")}
            </a>
          </div>
          <div className="release-notes max-h-80 space-y-2 overflow-y-auto text-sm text-ink-soft" dangerouslySetInnerHTML={{ __html: notes }} />

          {info.updater.configured && info.updater.reachable ? (
            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-sm text-ink-muted">{t("admin.updates.howItWorks")}</p>
              <Switch label={t("admin.updates.skipBackup")} checked={skipBackup} onChange={setSkipBackup} />
              <Button onClick={apply} loading={busy === "apply" || phase !== "idle"}>
                {t("admin.updates.install", { version: info.available.version })}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 border-t border-line pt-4 text-sm">
              <p className="text-ink-muted">{t(info.updater.configured ? "admin.updates.updaterDown" : "admin.updates.manual")}</p>
              {info.updater.error && <p className="text-danger">{info.updater.error}</p>}
              <pre className="overflow-x-auto rounded-md bg-sunken p-3 font-mono text-[13px]">docker compose pull && docker compose up -d</pre>
            </div>
          )}
        </section>
      ) : (
        info.latest && <p className="text-sm text-ok">{t("admin.updates.upToDate")}</p>
      )}

      {phase !== "idle" && (
        <div role="status" className="space-y-2 rounded-lg bg-sunken p-3 text-sm">
          <p className="font-medium">{t(`admin.updates.phase.${phase}`)}</p>
          {job?.log && (
            <ol className="max-h-40 space-y-0.5 overflow-y-auto font-mono text-xs text-ink-muted">
              {job.log.map((l, i) => (
                <li key={i}>{l.line}</li>
              ))}
            </ol>
          )}
        </div>
      )}
      <StatusMessage message={message} />

      {info.history.length > 0 && (
        <section className="space-y-2 border-t border-line pt-4">
          <h3 className="font-semibold">{t("admin.updates.history")}</h3>
          <ul role="list" className="space-y-1 text-sm">
            {info.history.map((h) => (
              <li key={h.at} className="text-ink-soft">
                <span className="tabular-nums text-ink-muted">{when(h.at)}</span> {h.from} → {h.to}
                {", "}
                {h.migrations.length ? t("admin.updates.migrations", { list: h.migrations.join(", ") }) : t("admin.updates.noMigrations")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

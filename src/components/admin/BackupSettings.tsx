"use client";

import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Field, Input, StatusMessage } from "@/components/ui";
import { SettingsSection } from "./settings/SettingsSection";
import { api } from "@/lib/client/api";
import { formatBytes } from "@/lib/format";
import { ScheduledBackups } from "./ScheduledBackups";

interface Info {
  files: number;
  bytes: number;
  storage: string;
  retentionDays: number;
}

/** Owners: one-click backup, restore from a backup, and how long ended events are kept. */
export function BackupSettings({ locale }: { locale: string }) {
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [days, setDays] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    api<Info>("/api/admin/backup")
      .then((data) => {
        setInfo(data);
        setDays(data.retentionDays);
      })
      .catch(() => {});
  }, []);

  async function saveRetention() {
    setMessage(undefined);
    try {
      await api("/api/admin/backup/retention", { method: "PUT", body: { days } });
      setMessage({ ok: true, text: t("common.saved") });
    } catch {
      setMessage({ ok: false, text: t("admin.backup.retentionInvalid") });
    }
  }

  function restore() {
    if (!file) return;
    setRestoreError(undefined);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/backup/restore");
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status === 200) {
        // Accounts now come from the backup: sign in again with them.
        router.replace("/admin/login");
        router.refresh();
        return;
      }
      let detail = "";
      try {
        detail = JSON.parse(xhr.responseText).details?.file ?? "";
      } catch {}
      setRestoreError(detail === "busy" ? t("admin.backup.busy") : t("admin.backup.restoreFailed", { reason: detail || String(xhr.status) }));
      setProgress(null);
    };
    xhr.onerror = () => {
      setRestoreError(t("errors.generic"));
      setProgress(null);
    };
    xhr.send(file);
  }

  return (
    <>
      <SettingsSection id="backup" title={t("admin.backup.title")} description={t("admin.backup.hint")}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sunken p-4">
          <p className="text-sm tabular-nums text-ink-soft">
            {info ? t("admin.backup.contents", { files: info.files, size: formatBytes(info.bytes, locale), storage: info.storage }) : "…"}
          </p>
          <a href="/api/admin/backup?download=1" className={buttonClass("secondary")}>
            <Download className="size-4" aria-hidden />
            {t("admin.backup.download")}
          </a>
        </div>
      </SettingsSection>

      <ScheduledBackups locale={locale} />

      <SettingsSection id="restore" title={t("admin.backup.restore")} description={t("admin.backup.restoreHint")}>
        <input ref={input} type="file" accept=".zip,application/zip" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => input.current?.click()} disabled={progress !== null}>
            <Upload className="size-4" aria-hidden />
            {file ? file.name : t("admin.backup.choose")}
          </Button>
          {file && (
            <Button variant="danger" onClick={restore} loading={progress !== null}>
              {t("admin.backup.confirmRestore")}
            </Button>
          )}
        </div>
        {progress !== null && (
          <p role="status" className="text-sm tabular-nums text-ink-muted">
            {progress < 1 ? t("admin.backup.uploading", { percent: Math.round(progress * 100) }) : t("admin.backup.restoring")}
          </p>
        )}
        {restoreError && <p className="text-sm text-danger">{restoreError}</p>}
      </SettingsSection>

      <SettingsSection id="retention" title={t("admin.backup.retention")} description={t("admin.backup.retentionLead")}>
        <Field label={t("admin.backup.retentionDays")} hint={t("admin.backup.retentionHint")}>
          {(id, describedBy) => (
            <Input id={id} aria-describedby={describedBy} type="number" min={0} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} className="max-w-32" />
          )}
        </Field>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusMessage message={message} />
          <Button onClick={saveRetention}>{t("common.save")}</Button>
        </div>
      </SettingsSection>
    </>
  );
}

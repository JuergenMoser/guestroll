"use client";

import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle, Field, Input, StatusMessage } from "@/components/ui";
import { api } from "@/lib/client/api";
import { formatBytes } from "@/lib/format";

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
    <Card className="space-y-6">
      <div className="space-y-1">
        <CardTitle>{t("admin.backup.title")}</CardTitle>
        <p className="max-w-prose text-sm text-ink-muted">{t("admin.backup.hint")}</p>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-ink-soft">
          {info ? t("admin.backup.contents", { files: info.files, size: formatBytes(info.bytes, locale), storage: info.storage }) : "…"}
        </p>
        <a href="/api/admin/backup?download=1" className={buttonClass("secondary")}>
          <Download className="size-4" aria-hidden />
          {t("admin.backup.download")}
        </a>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <h3 className="font-semibold">{t("admin.backup.restore")}</h3>
        <p className="max-w-prose text-sm text-ink-muted">{t("admin.backup.restoreHint")}</p>
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
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <h3 className="font-semibold">{t("admin.backup.retention")}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("admin.backup.retentionDays")} hint={t("admin.backup.retentionHint")}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} type="number" min={0} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} className="max-w-32" />
            )}
          </Field>
          <Button variant="secondary" onClick={saveRetention}>
            {t("common.save")}
          </Button>
          <StatusMessage message={message} />
        </div>
      </section>
    </Card>
  );
}

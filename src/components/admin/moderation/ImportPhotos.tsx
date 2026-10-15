"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { errorText } from "@/lib/i18n/errors";

/**
 * Sends the photographer's files one after the other, at full quality (no
 * compression in the browser, unlike guests' phones), credited to one name.
 */
export function ImportPhotos({ eventId, onImported }: { eventId: string; onImported: () => void }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [credit, setCredit] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [error, setError] = useState<string>();

  async function upload(files: File[]) {
    let failed = 0;
    setError(undefined);
    setProgress({ done: 0, total: files.length, failed: 0 });
    for (const [i, file] of files.entries()) {
      const body = new FormData();
      body.append("photo", file, file.name);
      if (credit.trim()) body.append("credit", credit.trim());
      const res = await fetch(`/api/admin/events/${eventId}/photos/import`, { method: "POST", body }).catch(() => null);
      if (!res?.ok) {
        failed++;
        const data = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : { error: "offline" };
        setError(`${file.name}: ${errorText(t, data.error)}`);
      }
      setProgress({ done: i + 1, total: files.length, failed });
    }
    onImported();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <ImagePlus className="size-4" aria-hidden />
        {t("admin.import.button")}
      </Button>
    );
  }

  const running = progress !== null && progress.done < progress.total;
  return (
    <div className="w-full space-y-3 rounded-lg bg-surface p-3 ring-1 ring-line">
      <p className="text-sm text-ink-muted">{t("admin.import.hint")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Field label={t("admin.import.credit")}>
            {(id) => <Input id={id} value={credit} onChange={(e) => setCredit(e.target.value)} placeholder={t("admin.import.creditPlaceholder")} maxLength={40} />}
          </Field>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void upload(files);
          }}
        />
        <Button onClick={() => input.current?.click()} loading={running}>
          <ImagePlus className="size-4" aria-hidden />
          {t("admin.import.choose")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={running}>
          {t("common.cancel")}
        </Button>
      </div>
      {progress && (
        <div className="space-y-1.5" role="status">
          <div className="h-1.5 rounded-sm bg-sunken">
            <div className="h-full rounded-sm bg-ink transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="text-sm tabular-nums text-ink-muted">
            {t("admin.import.progress", { done: progress.done - progress.failed, total: progress.total })}
            {progress.failed > 0 && <span className="text-danger"> {t("admin.import.failed", { n: progress.failed })}</span>}
          </p>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

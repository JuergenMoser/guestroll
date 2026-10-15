"use client";

import { Mic, NotebookPen, Square, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Textarea } from "@/components/ui";
import { errorText } from "@/lib/i18n/errors";
import type { MessageDto } from "@/lib/messages";
import { MessageCard } from "./MessageCard";
import { formatSeconds, MAX_RECORDING_SECONDS, useVoiceRecorder } from "./useVoiceRecorder";

const MAX_LENGTH = 500;
const EXT: Record<string, string> = { "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/webm": "webm" };

/** Leave a few words or a voice note for the hosts; the guest sees and can take back only their own. */
export function GuestbookCard({ slug, voice, locale, initialMessages, disabled }: { slug: string; voice: boolean; locale: string; initialMessages: MessageDto[]; disabled: boolean }) {
  const t = useT();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const recorder = useVoiceRecorder();
  const rec = recorder.state;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && rec.phase !== "ready") return;
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    if (text.trim()) body.append("text", text.trim());
    if (rec.phase === "ready") {
      const type = rec.blob.type.split(";")[0];
      body.append("audio", rec.blob, `note.${EXT[type] ?? "webm"}`);
      body.append("seconds", String(rec.seconds));
    }
    const res = await fetch(`/api/e/${slug}/messages`, { method: "POST", body }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { message?: MessageDto; error?: string }) : { error: "offline" };
    if (res?.ok && data.message) {
      setMessages((list) => [data.message!, ...list]);
      setText("");
      recorder.reset();
      setSent(true);
    } else setError(data.error === "quota_reached" ? t("guestbook.quota") : errorText(t, data.error));
    setBusy(false);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/e/${slug}/messages/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setMessages((list) => list.filter((m) => m.id !== id));
  }

  return (
    <section className="space-y-4" aria-labelledby="guestbook-title">
      <div className="space-y-1">
        <h2 id="guestbook-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <NotebookPen className="size-5 shrink-0" aria-hidden />
          {t("guestbook.title")}
        </h2>
        <p className="text-sm text-ink-muted">{t("guestbook.hint")}</p>
      </div>

      {!disabled && (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-line">
          <Textarea
            aria-label={t("guestbook.placeholder")}
            placeholder={t("guestbook.placeholder")}
            value={text}
            maxLength={MAX_LENGTH}
            onChange={(e) => {
              setText(e.target.value);
              setSent(false);
            }}
            rows={3}
          />
          {voice && (
            <div className="flex flex-wrap items-center gap-2">
              {rec.phase === "recording" ? (
                <Button variant="danger" size="sm" onClick={recorder.stop}>
                  <Square className="size-3.5 fill-current" aria-hidden />
                  {t("guestbook.stop")}
                  <span className="tabular-nums">
                    {formatSeconds(rec.seconds)} / {formatSeconds(MAX_RECORDING_SECONDS)}
                  </span>
                </Button>
              ) : rec.phase === "ready" ? (
                <>
                  <audio controls src={rec.url} className="h-9 max-w-full" aria-label={t("guestbook.voiceNote")} />
                  <Button variant="ghost" size="sm" onClick={recorder.reset}>
                    <Trash2 className="size-4" aria-hidden />
                    {t("guestbook.discard")}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={recorder.start}>
                  <Mic className="size-4" aria-hidden />
                  {t("guestbook.record")}
                </Button>
              )}
              {rec.phase === "error" && <span className="text-sm text-danger">{t(rec.reason === "denied" ? "guestbook.micDenied" : "guestbook.micUnsupported")}</span>}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-ink-faint">
              {text.length}/{MAX_LENGTH}
            </span>
            <span className="flex items-center gap-3">
              {error && <span className="text-sm text-danger">{error}</span>}
              {sent && !error && (
                <span role="status" className="text-sm text-ok">
                  {t("guestbook.sent")}
                </span>
              )}
              <Button type="submit" size="sm" loading={busy} disabled={rec.phase === "recording" || (!text.trim() && rec.phase !== "ready")}>
                {t("guestbook.send")}
              </Button>
            </span>
          </div>
        </form>
      )}

      {messages.length > 0 && (
        <ul role="list" className="space-y-3">
          {messages.map((m) => (
            <li key={m.id}>
              <MessageCard
                message={m}
                locale={locale}
                actions={
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id)}>
                    <Trash2 className="size-4" aria-hidden />
                    {t("guestbook.delete")}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

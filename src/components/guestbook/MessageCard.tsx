"use client";

import { Mic } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { MessageDto } from "@/lib/messages";
import { formatSeconds } from "./useVoiceRecorder";

/** One guestbook entry: who, when, the words, and the voice note's player. */
export function MessageCard({ message, locale, actions, className }: { message: MessageDto; locale: string; actions?: ReactNode; className?: string }) {
  const t = useT();
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt));
  return (
    <article className={cn("space-y-3 rounded-xl bg-surface p-4 ring-1 ring-line", message.status === "hidden" && "opacity-50", className)}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-semibold">{message.guestName || t("admin.anonymous")}</span>
        <time dateTime={new Date(message.createdAt).toISOString()} className="text-sm tabular-nums text-ink-muted">
          {when}
        </time>
      </header>
      {message.text && <p className="text-[15px] leading-relaxed whitespace-pre-line text-pretty text-ink-soft">{message.text}</p>}
      {message.audio && (
        <div className="flex items-center gap-2">
          <Mic className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <audio controls preload="none" src={message.audio} className="h-9 w-full max-w-sm" aria-label={t("guestbook.voiceNote")} />
          {message.audioSeconds && <span className="text-sm tabular-nums text-ink-muted">{formatSeconds(message.audioSeconds)}</span>}
        </div>
      )}
      {actions}
    </article>
  );
}

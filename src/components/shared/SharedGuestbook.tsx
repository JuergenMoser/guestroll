"use client";

import { useState } from "react";
import { MessageCard } from "@/components/guestbook/MessageCard";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";
import type { MessageDto } from "@/lib/messages";

/** The visible guestbook behind a gallery link, when the hosts share it. */
export function SharedGuestbook({ token, locale, initialMessages, initialCursor }: { token: string; locale: string; initialMessages: MessageDto[]; initialCursor: number | null }) {
  const t = useT();
  const [messages, setMessages] = useState(initialMessages);
  const [cursor, setCursor] = useState(initialCursor);
  if (messages.length === 0) return null;

  async function loadMore() {
    const res = await fetch(`/api/g/${token}/messages?before=${cursor}`).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { messages: MessageDto[]; nextCursor: number | null };
    setMessages((list) => [...list, ...data.messages]);
    setCursor(data.nextCursor);
  }

  return (
    <section className="space-y-4" aria-labelledby="shared-guestbook">
      <h2 id="shared-guestbook" className="text-xl font-bold tracking-tight">
        {t("guestbook.title")}
      </h2>
      <ul role="list" className="grid items-start gap-3 md:grid-cols-2">
        {messages.map((m) => (
          <li key={m.id}>
            <MessageCard message={m} locale={locale} />
          </li>
        ))}
      </ul>
      {cursor !== null && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore}>
            {t("common.loadMore")}
          </Button>
        </div>
      )}
    </section>
  );
}

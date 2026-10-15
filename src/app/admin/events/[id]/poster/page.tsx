/* eslint-disable @next/next/no-img-element -- the QR code is served behind admin auth */
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/PrintButton";
import { EventTheme } from "@/components/EventTheme";
import { requireAdminPage } from "@/lib/auth/guard";
import { getEventById } from "@/lib/events";
import { getT } from "@/lib/i18n/server";
import { eventUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

/** A4 table card. Printed from the browser; the screen chrome is hidden in print. */
export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const event = getEventById((await params).id);
  if (!event) notFound();
  const t = await getT();
  const url = await eventUrl(event.slug);

  return (
    <EventTheme color={event.accentColor} className="min-h-dvh bg-white text-neutral-900">
      <div className="flex justify-center p-4 print:hidden">
        <PrintButton />
      </div>
      <article className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center justify-center gap-10 border border-neutral-200 p-16 text-center print:border-0">
        <div className="h-1.5 w-24 rounded-full bg-accent" />
        <div className="space-y-4">
          <p className="font-mono text-sm tracking-[0.3em] text-neutral-500 uppercase">{event.eventDate ?? ""}</p>
          <h1 className="font-display text-7xl leading-none text-balance">{event.name}</h1>
        </div>
        <img src={`/api/admin/events/${event.id}/qr?format=svg`} alt={url} className="size-80" />
        <div className="space-y-2">
          <p className="font-display text-4xl italic">{t("admin.poster.scan")}</p>
          <p className="text-neutral-500">{t("admin.poster.noApp")}</p>
        </div>
        <p className="font-mono text-xs text-neutral-400">{url.replace(/^https?:\/\//, "")}</p>
      </article>
    </EventTheme>
  );
}

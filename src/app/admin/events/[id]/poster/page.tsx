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
      <article className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center justify-center gap-[5%] border-t-[18px] border-accent bg-white p-[8%] text-center text-[#1a1b1d] shadow-sm print:shadow-none">
        <div className="space-y-4">
          <h1 className="text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance [font-stretch:80%]">{event.name}</h1>
          {event.eventDate && <p className="text-xl font-semibold tabular-nums text-stamp">{event.eventDate}</p>}
        </div>
        <img src={`/api/admin/events/${event.id}/qr?format=svg`} alt={url} className="w-full max-w-80" />
        <div className="space-y-2">
          <p className="text-[clamp(1.5rem,5vw,2.25rem)] font-bold tracking-tight text-balance">{t("admin.poster.scan")}</p>
          <p className="text-neutral-500">{t("admin.poster.noApp")}</p>
        </div>
        <p className="text-sm text-neutral-500">{url.replace(/^https?:\/\//, "")}</p>
      </article>
    </EventTheme>
  );
}

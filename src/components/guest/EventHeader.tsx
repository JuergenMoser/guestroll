import type { PublicEvent } from "@/lib/events";

/** The date as a film print would stamp it in the corner: 17 10 '26. */
function stamp(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day} ${month} '${year.slice(2)}`;
}

export function EventHeader({ event, locale }: { event: PublicEvent; locale: string }) {
  return (
    <header className="space-y-3">
      {event.logoVersion && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny branding image from our own route
        <img src={`/api/e/${event.slug}/logo?v=${event.logoVersion}`} alt="" className="mb-4 size-16 object-contain" />
      )}
      <h1 className="text-[clamp(2.5rem,11vw,4.5rem)] leading-[0.92] font-extrabold tracking-[-0.03em] [font-stretch:80%]">{event.name}</h1>
      {(event.eventDate || event.description) && (
        <div className="flex items-baseline gap-3">
          {event.eventDate && (
            <time dateTime={event.eventDate} lang={locale} className="shrink-0 font-semibold tabular-nums text-stamp">
              {stamp(event.eventDate)}
            </time>
          )}
          {event.description && <p className="text-[15px] text-pretty text-ink-soft">{event.description}</p>}
        </div>
      )}
    </header>
  );
}

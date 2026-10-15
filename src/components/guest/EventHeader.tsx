import type { PublicEvent } from "@/lib/events";

export function EventHeader({ event, locale }: { event: PublicEvent; locale: string }) {
  const date = event.eventDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${event.eventDate}T00:00:00Z`))
    : null;
  return (
    <header className="space-y-3 text-center">
      {date && <p className="kicker">{date}</p>}
      <h1 className="font-display text-5xl leading-none tracking-tight text-balance sm:text-6xl">{event.name}</h1>
      {event.description && <p className="mx-auto max-w-md text-sm text-pretty text-ink-300">{event.description}</p>}
    </header>
  );
}

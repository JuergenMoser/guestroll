import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEvent } from "@/components/admin/DeleteEvent";
import { EventForm } from "@/components/admin/event-form/EventForm";
import { ModerationPanel } from "@/components/admin/moderation/ModerationPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { SharePanel } from "@/components/admin/SharePanel";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { EventTheme } from "@/components/EventTheme";
import { buttonClass, cn } from "@/components/ui";
import { getEventById, toAdminEvent } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { getStats } from "@/lib/stats";
import { eventUrl } from "@/lib/urls";
import { requireAdminPage } from "@/lib/auth/guard";

const TABS = ["photos", "stats", "share", "settings"] as const;
type Tab = (typeof TABS)[number];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export default async function EventPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const row = getEventById(id);
  if (!row) notFound();

  const t = await getT();
  const event = toAdminEvent(row);
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "photos";
  const url = await eventUrl(event.slug);
  const stats = getStats(event.id);

  return (
    <EventTheme color={event.accentColor}>
      <PageHeader
        context={event.eventDate ? <time dateTime={event.eventDate} className="font-medium tabular-nums text-stamp">{event.eventDate}</time> : undefined}
        title={event.name}
        actions={
          <a href={url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md", "max-w-full")}>
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            <span className="truncate">/e/{event.slug}</span>
          </a>
        }
      />

      <nav className="mb-6 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line">
        {TABS.map((key) => (
          <Link
            key={key}
            href={`?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 pb-3 text-sm transition",
              tab === key ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t(`admin.tabs.${key}`)}
            {key === "photos" && stats.totals.pending > 0 && (
              <span className="ml-2 rounded-full bg-accent px-1.5 text-xs text-accent-ink">{stats.totals.pending}</span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "photos" && <ModerationPanel eventId={event.id} pendingCount={stats.totals.pending} />}
      {tab === "stats" && <StatsPanel stats={stats} locale={await getLocale()} />}
      {tab === "share" && <SharePanel event={event} url={url} locale={await getLocale()} />}
      {tab === "settings" && (
        <div className="mx-auto max-w-2xl space-y-8">
          <EventForm event={event} />
          <DeleteEvent eventId={event.id} name={event.name} />
        </div>
      )}
    </EventTheme>
  );
}

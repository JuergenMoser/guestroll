import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { DeleteEvent } from "@/components/admin/DeleteEvent";
import { DuplicateEvent } from "@/components/admin/DuplicateEvent";
import { EventForm } from "@/components/admin/event-form/EventForm";
import { SettingsOutline } from "@/components/admin/event-form/SettingsOutline";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { ModerationPanel } from "@/components/admin/moderation/ModerationPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { SharePanel } from "@/components/admin/SharePanel";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { GuestbookPanel } from "@/components/admin/GuestbookPanel";
import { countMessages } from "@/lib/messages";
import { purgeDate } from "@/lib/retention";
import { countFavorites } from "@/lib/photos";
import { listSpots } from "@/lib/spots";
import { EventTheme } from "@/components/EventTheme";
import { buttonClass, cn } from "@/components/ui";
import { toAdminEvent } from "@/lib/events";
import { getLocale, getT } from "@/lib/i18n/server";
import { getStats } from "@/lib/stats";
import { eventUrl } from "@/lib/urls";
import { requireEventAdminPage } from "@/lib/auth/guard";

const TABS = ["photos", "guestbook", "stats", "share", "settings"] as const;
type Tab = (typeof TABS)[number];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export default async function EventPage({ params, searchParams }: Props) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const { admin, event: row } = await requireEventAdminPage(id);

  const t = await getT();
  const event = toAdminEvent(row);
  const messageCount = countMessages(event.id);
  // The guestbook tab shows once the hosts turn it on, and stays while messages remain.
  const tabs = TABS.filter((key) => key !== "guestbook" || event.guestbookEnabled || messageCount > 0);
  const tab: Tab = tabs.includes(rawTab as Tab) ? (rawTab as Tab) : "photos";
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
        {tabs.map((key) => (
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

      {tab === "photos" && <ModerationPanel eventId={event.id} pendingCount={stats.totals.pending} challenges={event.challenges} spots={listSpots(event.id)} />}
      {tab === "guestbook" && <GuestbookPanel eventId={event.id} locale={await getLocale()} />}
      {tab === "stats" && <StatsPanel stats={stats} locale={await getLocale()} challenges={event.challenges} spots={listSpots(event.id)} />}
      {tab === "share" && <SharePanel event={event} url={url} locale={await getLocale()} purgeAt={purgeDate(event)} favoriteCount={countFavorites(event.id)} spots={listSpots(event.id)} owner={admin.role === "owner"} />}
      {tab === "settings" && (
        <div className="grid gap-x-10 md:grid-cols-[11rem_minmax(0,1fr)]">
          <SettingsOutline
            sections={[
              { id: "details", label: t("admin.form.sections.details") },
              { id: "access", label: t("admin.form.sections.access") },
              { id: "uploads", label: t("admin.form.sections.uploads") },
              { id: "look", label: t("admin.look.title") },
              { id: "guests", label: t("admin.form.sections.guests") },
              { id: "challenges", label: t("admin.challenges.title") },
              { id: "guestbook", label: t("guestbook.title") },
              { id: "after", label: t("admin.form.sectionAfter") },
              ...(admin.role === "owner"
                ? [
                    { id: "duplicate", label: t("admin.duplicate.title") },
                    { id: "danger", label: t("admin.form.dangerZone"), danger: true },
                  ]
                : []),
            ]}
          />
          <div className="min-w-0">
            <EventForm event={event} />
            {admin.role === "owner" && (
              <>
                <SettingsSection id="duplicate" title={t("admin.duplicate.title")} description={t("admin.duplicate.sectionHint")}>
                  <DuplicateEvent eventId={event.id} name={event.name} />
                </SettingsSection>
                <SettingsSection id="danger" title={t("admin.form.dangerZone")} description={t("admin.form.dangerHint")} danger>
                  <DeleteEvent eventId={event.id} name={event.name} />
                </SettingsSection>
              </>
            )}
          </div>
        </div>
      )}
    </EventTheme>
  );
}

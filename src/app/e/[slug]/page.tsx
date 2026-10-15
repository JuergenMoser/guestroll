import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventTheme } from "@/components/EventTheme";
import { EventHeader } from "@/components/guest/EventHeader";
import { AutoJoin } from "@/components/guest/AutoJoin";
import { GuestApp } from "@/components/guest/GuestApp";
import { UnlockScreen } from "@/components/guest/UnlockScreen";
import { track } from "@/lib/activity";
import { getGuestSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { config } from "@/lib/config";
import { getEventBySlug, toPublicEvent } from "@/lib/events";
import { getLocale } from "@/lib/i18n/server";
import { countGuestPhotos, listPhotos, toPhotoDto } from "@/lib/photos";
import { canEnterEvent, canJoinFreely, uploadState } from "@/lib/policy";
import { SLUG_PATTERN } from "@/lib/security/ids";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  return { title: event?.name ?? config.appName };
}

export default async function GuestPage({ params }: Props) {
  const { slug } = await params;
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  if (!event) notFound();

  const viewer = await getViewer();
  const guest = await getGuestSession();
  track("view", event.id, viewer.guestId);
  const publicEvent = toPublicEvent(event);

  let body: React.ReactNode;
  if (!canEnterEvent(event, viewer)) {
    body = canJoinFreely(event) ? <AutoJoin slug={event.slug} /> : <UnlockScreen slug={event.slug} />;
  } else {
    const uploaded = viewer.guestId ? countGuestPhotos(event.id, viewer.guestId) : 0;
    const state = uploadState(event, viewer, uploaded);
    const rows = listPhotos(event, viewer, { limit: 48 });
    body = (
      <GuestApp
        event={publicEvent}
        guestName={guest.name ?? null}
        initialPhotos={rows.map((p) => toPhotoDto(p, viewer))}
        initialCursor={rows.length === 48 ? rows[rows.length - 1].createdAt : null}
        closedReason={state.open ? null : state.reason === "locked" ? "closed" : state.reason}
        remaining={event.maxPhotosPerGuest > 0 ? Math.max(event.maxPhotosPerGuest - uploaded, 0) : null}
      />
    );
  }

  return (
    <EventTheme color={event.accentColor} className="grain min-h-dvh">
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16">
        <EventHeader event={publicEvent} locale={getLocale()} />
        {body}
        <footer className="mt-auto pt-6 text-center text-[11px] text-ink-600">
          <a href="https://github.com/achedon12/guestroll" className="hover:text-ink-400">
            {config.appName}
          </a>
        </footer>
      </main>
    </EventTheme>
  );
}

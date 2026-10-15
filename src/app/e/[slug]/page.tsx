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
import { messages } from "@/lib/i18n/messages";
import { getTheme } from "@/lib/theme/server";
import { I18nProvider } from "@/components/I18nProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { countGuestPhotos, listPhotos, toPhotoDto } from "@/lib/photos";
import { canEnterEvent, canJoinFreely, uploadState } from "@/lib/policy";
import { SLUG_PATTERN } from "@/lib/security/ids";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  if (!event) return { title: config.appName };
  return { title: event.name, description: event.description || undefined, openGraph: { title: event.name, description: event.description || undefined } };
}

export default async function GuestPage({ params }: Props) {
  const { slug } = await params;
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  if (!event) notFound();

  const viewer = await getViewer();
  const guest = await getGuestSession();
  track("view", event.id, viewer.guestId);
  const publicEvent = toPublicEvent(event);
  // The album's language can differ from the instance default: this page
  // provides its own messages instead of the root layout's.
  const [locale, theme] = await Promise.all([getLocale(event.defaultLocale), getTheme()]);

  let body: React.ReactNode;
  if (!canEnterEvent(event, viewer)) {
    body = canJoinFreely(event) ? <AutoJoin slug={event.slug} /> : <UnlockScreen slug={event.slug} />;
  } else {
    // The guest page always shows the guest's view, even to a signed-in admin
    // testing it: their own photos only, never the whole album.
    const asGuest = { ...viewer, isAdmin: false };
    const uploaded = viewer.guestId ? countGuestPhotos(event.id, viewer.guestId) : 0;
    const state = uploadState(event, viewer, uploaded);
    const rows = listPhotos(event, asGuest, { limit: 48 });
    body = (
      <GuestApp
        event={publicEvent}
        guestName={guest.name ?? null}
        initialPhotos={rows.map((p) => toPhotoDto(p, asGuest))}
        initialCursor={rows.length === 48 ? rows[rows.length - 1].createdAt : null}
        closedReason={state.open ? null : state.reason === "locked" ? "closed" : state.reason}
        remaining={event.maxPhotosPerGuest > 0 ? Math.max(event.maxPhotosPerGuest - uploaded, 0) : null}
        sentCount={uploaded}
      />
    );
  }

  return (
    <I18nProvider messages={messages[locale]}>
    <EventTheme color={event.accentColor} className="min-h-dvh">
      <main lang={locale} className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <EventHeader event={publicEvent} locale={locale} />
        {body}
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-ink-faint">
          <a href="https://github.com/achedon12/guestroll" className="hover:text-ink-muted">
            {config.appName}
          </a>
          <span className="flex gap-2">
            <LanguagePicker current={locale} />
            <ThemeToggle initial={theme} />
          </span>
        </footer>
      </main>
    </EventTheme>
    </I18nProvider>
  );
}

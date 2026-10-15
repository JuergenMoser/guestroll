import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventTheme } from "@/components/EventTheme";
import { EventHeader } from "@/components/guest/EventHeader";
import { I18nProvider } from "@/components/I18nProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ShareUnlock } from "@/components/shared/ShareUnlock";
import { SharedGallery } from "@/components/shared/SharedGallery";
import { ThemeToggle } from "@/components/ThemeToggle";
import { config } from "@/lib/config";
import { toPublicEvent } from "@/lib/events";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { countVisiblePhotos, listPhotos, toPhotoDto } from "@/lib/photos";
import { resolveShare } from "@/lib/shareAccess";
import { getTheme } from "@/lib/theme/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

// The event name stays out of the title: a link preview must not reveal it before the password.
export const metadata: Metadata = { title: config.appName, robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedAlbumPage({ params }: Props) {
  const { token } = await params;
  const access = await resolveShare(token);
  if (access.status === "missing") notFound();

  const { event, share } = access;
  const [locale, theme] = await Promise.all([getLocale(event.defaultLocale), getTheme()]);
  const publicEvent = toPublicEvent(event);

  let body: React.ReactNode;
  if (access.status === "locked") {
    body = <ShareUnlock token={token} />;
  } else {
    const rows = listPhotos(event, "album", { status: "visible", limit: 60 });
    const viewer = { ...access.viewer, guestId: undefined };
    body = (
      <SharedGallery
        token={token}
        initialPhotos={rows.map((p) => ({ ...toPhotoDto(p, viewer), downloads: undefined }))}
        initialCursor={rows.length === 60 ? rows[rows.length - 1].createdAt : null}
        total={countVisiblePhotos(event.id)}
        allowDownload={share.allowDownload}
      />
    );
  }

  return (
    <I18nProvider messages={messages[locale]}>
      <EventTheme color={event.accentColor} className="min-h-dvh">
        <main lang={locale} className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-10">
          {access.status === "open" && <EventHeader event={publicEvent} locale={locale} />}
          {body}
          <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-ink-faint">
            <span>{config.appName}</span>
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

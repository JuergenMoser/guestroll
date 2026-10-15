import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoothApp } from "@/components/booth/BoothApp";
import { EventTheme } from "@/components/EventTheme";
import { I18nProvider } from "@/components/I18nProvider";
import { boothKeyMatches } from "@/lib/booth";
import { getEventBySlug, toPublicEvent } from "@/lib/events";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { SLUG_PATTERN } from "@/lib/security/ids";

export const dynamic = "force-dynamic";
// The booth link is a secret: never in a search engine, never sent on as a referrer.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ key?: string }> };

export default async function BoothPage({ params, searchParams }: Props) {
  const [{ slug }, { key }] = await Promise.all([params, searchParams]);
  const event = SLUG_PATTERN.test(slug) ? getEventBySlug(slug) : undefined;
  if (!event) notFound();
  const locale = await getLocale(event.defaultLocale);
  const t = messages[locale];

  return (
    <I18nProvider locale={locale} messages={t}>
      <EventTheme color={event.accentColor}>
        <main lang={locale}>
          {boothKeyMatches(event, key) ? (
            <BoothApp event={toPublicEvent(event)} boothKey={key!} />
          ) : (
            <div className="grid min-h-dvh place-items-center bg-black p-8 text-center text-white">
              <p className="max-w-md text-xl">{t.booth.invalid}</p>
            </div>
          )}
        </main>
      </EventTheme>
    </I18nProvider>
  );
}

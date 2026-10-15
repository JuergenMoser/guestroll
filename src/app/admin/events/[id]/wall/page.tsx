import { notFound } from "next/navigation";
import { LiveWall } from "@/components/admin/LiveWall";
import { EventTheme } from "@/components/EventTheme";
import { requireAdminPage } from "@/lib/auth/guard";
import { getEventById } from "@/lib/events";
import { eventUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function WallPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const event = getEventById((await params).id);
  if (!event) notFound();
  return (
    <EventTheme color={event.accentColor}>
      <LiveWall eventId={event.id} eventName={event.name} joinUrl={await eventUrl(event.slug)} />
    </EventTheme>
  );
}

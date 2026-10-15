import { LiveWall } from "@/components/admin/LiveWall";
import { EventTheme } from "@/components/EventTheme";
import { requireEventAdminPage } from "@/lib/auth/guard";
import { eventUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function WallPage({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await requireEventAdminPage((await params).id);
  return (
    <EventTheme color={event.accentColor}>
      <LiveWall eventId={event.id} eventName={event.name} joinUrl={await eventUrl(event.slug)} />
    </EventTheme>
  );
}

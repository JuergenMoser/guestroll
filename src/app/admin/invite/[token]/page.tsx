import type { Metadata } from "next";
import { InviteForm } from "@/components/admin/InviteForm";
import { Brand } from "@/components/Brand";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { findInvitation } from "@/lib/invitations";

export const dynamic = "force-dynamic";
// The link is a credential: no indexing, no referrer to the sites linked from the page.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = config.demo.enabled ? undefined : findInvitation(token);
  const t = await getT();
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-4">
          <Brand name={config.appName} />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("admin.invite.title", { app: config.appName })}</h1>
            <p className="text-ink-muted">{invitation ? t("admin.invite.hint", { email: invitation.email }) : t("admin.invite.invalid")}</p>
          </div>
        </div>
        {invitation && <InviteForm token={token} />}
      </div>
    </main>
  );
}

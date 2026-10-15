import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { parseEmail } from "@/lib/email";
import { listEventNames } from "@/lib/events";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { getLocale } from "@/lib/i18n/server";
import { createInvitation, listPendingInvitations, toInvitationDto } from "@/lib/invitations";
import { enqueueMail, processOutbox } from "@/lib/mail/outbox";
import { mailEnabled } from "@/lib/mail/settings";
import { inviteMail } from "@/lib/mail/templates";
import { baseUrl } from "@/lib/urls";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  return NextResponse.json({ invitations: listPendingInvitations().map(toInvitationDto) });
}

/**
 * `{ email, role, eventIds }`: emails a single-use link when email is set up,
 * and returns it in any case, for the owner to pass on another way.
 */
export async function POST(request: Request) {
  const { admin, denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const body = (await readJson(request)) as { email?: unknown; role?: unknown; eventIds?: unknown } | undefined;
  const email = parseEmail(body?.email);
  const role = body?.role === "owner" || body?.role === "organizer" ? body.role : null;
  const eventIds = Array.isArray(body?.eventIds) ? body.eventIds.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)).slice(0, 500) : [];
  const errors: Record<string, string> = {};
  if (!email) errors.email = "invalid";
  if (!role) errors.role = "invalid";
  if (Object.keys(errors).length) return apiError("bad_request", errors);

  const { invitation, token } = createInvitation({ email: email!, role: role!, eventIds, invitedBy: admin.id });
  const url = `${await baseUrl()}/admin/invite/${token}`;
  let emailed = false;
  if (mailEnabled()) {
    const names = new Map(listEventNames({ all: true }).map((e) => [e.id, e.name]));
    const mail = inviteMail({
      app: config.appName,
      locale: await getLocale(),
      inviter: admin.name || admin.username,
      url,
      expiresAt: invitation.expiresAt,
      events: role === "owner" ? null : eventIds.map((id) => names.get(id)).filter((n): n is string => Boolean(n)),
    });
    emailed = enqueueMail({ to: email!, mail, kind: "invite", dedupeKey: `invite:${invitation.id}` });
    void processOutbox().catch((error) => console.error("[mail]", error));
  }
  return NextResponse.json({ invitation: toInvitationDto(invitation), url, emailed }, { status: 201 });
}

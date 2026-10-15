import { NextResponse } from "next/server";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";
import { createShareLink, generateSharePassword, listShareLinks, toShareDto } from "@/lib/shares";
import { parseShareLinkInput } from "@/lib/validation";

type Context = RouteContext<"/api/admin/events/[id]/shares">;

export async function GET(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  return NextResponse.json({ shares: listShareLinks(event.id).map(toShareDto) });
}

/** Creates a gallery link. A generated password is returned once and never stored in clear. */
export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const parsed = parseShareLinkInput(await readJson(request));
  if (!parsed.ok) return apiError("bad_request", parsed.errors);

  const password = parsed.value.password ?? generateSharePassword();
  const share = createShareLink({
    eventId: event.id,
    password,
    label: parsed.value.label,
    allowDownload: parsed.value.allowDownload,
    favoritesOnly: parsed.value.favoritesOnly,
    expiresAt: parsed.value.expiresInDays > 0 ? Date.now() + parsed.value.expiresInDays * 86_400_000 : null,
  });
  return NextResponse.json({ share: toShareDto(share), password: parsed.value.password ? null : password }, { status: 201 });
}

import { NextResponse } from "next/server";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { deleteWebhook, parseWebhookInput, saveWebhook, toWebhookDto } from "@/lib/webhooks/settings";

type Context = RouteContext<"/api/admin/webhooks/[webhookId]">;

/** An empty `url` keeps the saved one; `secret: null` removes it. */
export async function PATCH(request: Request, { params }: Context) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const parsed = parseWebhookInput(await readJson(request), true);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const saved = saveWebhook((await params).webhookId, parsed.value);
  if (typeof saved === "string") return apiError("not_found");
  return NextResponse.json({ webhook: toWebhookDto(saved) });
}

export async function DELETE(request: Request, { params }: Context) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  return deleteWebhook((await params).webhookId) ? NextResponse.json({ ok: true }) : apiError("not_found");
}

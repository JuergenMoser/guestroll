import { NextResponse } from "next/server";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { recentDeliveries } from "@/lib/webhooks/queue";
import { listWebhooks, parseWebhookInput, saveWebhook, toWebhookDto } from "@/lib/webhooks/settings";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  return NextResponse.json({ webhooks: listWebhooks().map(toWebhookDto), deliveries: recentDeliveries() });
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const parsed = parseWebhookInput(await readJson(request), false);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const saved = saveWebhook(null, parsed.value);
  if (saved === "limit") return apiError("bad_request", { webhook: "limit" });
  if (saved === "not_found") return apiError("not_found");
  return NextResponse.json({ webhook: toWebhookDto(saved) }, { status: 201 });
}

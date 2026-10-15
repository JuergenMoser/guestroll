import { NextResponse } from "next/server";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { saveRetentionDays } from "@/lib/retention";

/** `{ days }`: delete events this many days after they end; 0 keeps them forever. */
export async function PUT(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const body = (await readJson(request)) as { days?: unknown } | undefined;
  const days = body?.days;
  if (typeof days !== "number" || !Number.isInteger(days) || days < 0 || (days > 0 && days < 14) || days > 3650) {
    return apiError("bad_request", { days: "invalid" });
  }
  saveRetentionDays(days);
  return NextResponse.json({ retentionDays: days });
}

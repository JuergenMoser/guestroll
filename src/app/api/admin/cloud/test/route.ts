import { NextResponse } from "next/server";
import { cloudNeedsPassword, getCloudSettings, parseCloudBody } from "@/lib/cloud/settings";
import { testConnection } from "@/lib/cloud/webdav";
import { apiError, rateLimited, readJson, requireAdmin } from "@/lib/http";
import { limiters } from "@/lib/security/limiters";

/** Tries the form's values (the saved password when the form leaves it empty for the same account). */
export async function POST(request: Request) {
  const { admin, denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const limit = limiters.mailTest.consume(`cloud:${admin.id}`);
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);
  const parsed = parseCloudBody(await readJson(request));
  if ("errors" in parsed) return apiError("bad_request", parsed.errors);
  if (cloudNeedsPassword(parsed.value)) return apiError("bad_request", { password: "required" });
  const cloud = { ...parsed.value, password: parsed.value.password || getCloudSettings()?.password || "" };
  try {
    await testConnection(cloud);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message.slice(0, 200) });
  }
}

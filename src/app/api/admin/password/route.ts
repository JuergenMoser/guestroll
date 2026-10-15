import { NextResponse } from "next/server";
import { changePassword, passwordManagedByEnv, passwordVersion, verifyPassword } from "@/lib/auth/admin";
import { getAdminSession } from "@/lib/auth/session";
import { apiError, readJson, requireAdmin } from "@/lib/http";

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (passwordManagedByEnv()) return apiError("forbidden", { password: "managed_by_env" });

  const body = (await readJson(request)) as { current?: unknown; next?: unknown } | undefined;
  const current = typeof body?.current === "string" ? body.current : "";
  const next = typeof body?.next === "string" ? body.next : "";
  if (next.length < 10) return apiError("bad_request", { next: "min_length" });
  if (!(await verifyPassword(current))) return apiError("unauthorized", { current: "invalid" });

  changePassword(next);
  // Every other admin session is now invalid; keep this one signed in.
  const session = await getAdminSession();
  session.passwordVersion = passwordVersion();
  await session.save();
  return NextResponse.json({ ok: true });
}

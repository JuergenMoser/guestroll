import { NextResponse } from "next/server";
import { getAccount } from "@/lib/accounts";
import { changePassword, passwordManagedByEnv, verifyAccountPassword } from "@/lib/auth/admin";
import { getAdminSession } from "@/lib/auth/session";
import { apiError, readJson, requireAdmin } from "@/lib/http";

/** Changes the signed-in account's own password. */
export async function POST(request: Request) {
  const { admin, denied } = await requireAdmin(request, { notInDemo: true });
  if (denied) return denied;
  const account = getAccount(admin.id)!;
  if (passwordManagedByEnv(account)) return apiError("forbidden", { password: "managed_by_env" });

  const body = (await readJson(request)) as { current?: unknown; next?: unknown } | undefined;
  const current = typeof body?.current === "string" ? body.current : "";
  const next = typeof body?.next === "string" ? body.next : "";
  if (next.length < 10) return apiError("bad_request", { next: "min_length" });
  if (!(await verifyAccountPassword(account, current))) return apiError("unauthorized", { current: "invalid" });

  changePassword(account, next);
  // Every other session of this account is now invalid; keep this one signed in.
  const session = await getAdminSession();
  session.version = getAccount(account.id)!.sessionVersion;
  await session.save();
  return NextResponse.json({ ok: true });
}

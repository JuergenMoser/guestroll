import { NextResponse } from "next/server";
import { countOwners, deleteAccount, getAccount, getAccountByUsername, hashPassword, setAccountPassword, toAccountDto, updateAccount } from "@/lib/accounts";
import { passwordManagedByEnv } from "@/lib/auth/admin";
import { disableTwoFactor } from "@/lib/auth/twoFactor";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { randomToken } from "@/lib/security/ids";
import { parseAccountInput } from "@/lib/validation";

type Context = RouteContext<"/api/admin/accounts/[accountId]">;

/**
 * Edits an account. `resetPassword: true` generates a new password, returned
 * once. Whatever happens, at least one owner remains: the last owner can't be
 * demoted or deleted, so nobody is locked out of the instance settings.
 */
export async function PATCH(request: Request, { params }: Context) {
  const { admin, denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const account = getAccount((await params).accountId);
  if (!account) return apiError("not_found");

  const body = (await readJson(request)) as Record<string, unknown> | undefined;
  const parsed = parseAccountInput(body, true);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const { password, ...fields } = parsed.value;

  if (fields.username && fields.username !== account.username) {
    if (passwordManagedByEnv(account)) return apiError("bad_request", { username: "managed_by_env" });
    if (getAccountByUsername(fields.username)) return apiError("bad_request", { username: "taken" });
  }
  if (fields.role === "organizer" && account.role === "owner") {
    if (countOwners(account.id) === 0) return apiError("bad_request", { role: "last_owner" });
    if (passwordManagedByEnv(account)) return apiError("bad_request", { role: "managed_by_env" });
    if (account.id === admin.id) return apiError("bad_request", { role: "self" });
  }

  // A lost phone: an owner turns the account's two-step verification off; the person sets it up again.
  if (body?.resetTwoFactor === true) {
    if (account.id === admin.id) return apiError("bad_request", { twoFactor: "self" });
    disableTwoFactor(account.id);
  }

  let generated: string | null = null;
  const wantsReset = body?.resetPassword === true || password !== undefined;
  if (wantsReset) {
    if (passwordManagedByEnv(account)) return apiError("bad_request", { password: "managed_by_env" });
    generated = password ? null : randomToken(16);
    setAccountPassword(account.id, hashPassword(password ?? generated!));
  }
  const updated = updateAccount(account.id, fields)!;
  return NextResponse.json({ account: toAccountDto(updated), password: generated });
}

export async function DELETE(request: Request, { params }: Context) {
  const { admin, denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const account = getAccount((await params).accountId);
  if (!account) return apiError("not_found");
  if (account.id === admin.id) return apiError("bad_request", { account: "self" });
  if (passwordManagedByEnv(account)) return apiError("bad_request", { account: "managed_by_env" });
  if (account.role === "owner" && countOwners(account.id) === 0) return apiError("bad_request", { account: "last_owner" });
  deleteAccount(account.id);
  return NextResponse.json({ ok: true });
}

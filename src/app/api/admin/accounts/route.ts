import { NextResponse } from "next/server";
import { createAccount, getAccountByUsername, hashPassword, listAccounts, toAccountDto } from "@/lib/accounts";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { randomToken } from "@/lib/security/ids";
import { parseAccountInput } from "@/lib/validation";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  return NextResponse.json({ accounts: listAccounts().map(toAccountDto) });
}

/** A generated password is returned once, for the owner to hand over; it is never stored in clear. */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const parsed = parseAccountInput(await readJson(request), false);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const { username, name = "", email = null, role, eventIds = [], password } = parsed.value;
  if (getAccountByUsername(username!)) return apiError("bad_request", { username: "taken" });

  const plain = password ?? randomToken(16);
  const account = createAccount({ username: username!, name, email, role: role!, eventIds, passwordHash: hashPassword(plain) });
  return NextResponse.json({ account: toAccountDto(account), password: password ? null : plain }, { status: 201 });
}

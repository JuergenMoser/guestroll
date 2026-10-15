import { NextResponse } from "next/server";
import { getAccount, toAccountDto, updateAccount } from "@/lib/accounts";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { parseAccountInput } from "@/lib/validation";

export async function GET(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ account: toAccountDto(getAccount(admin.id)!) });
}

/** Anyone can change their own display name and alert address; role and events are the owners' call. */
export async function PATCH(request: Request) {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return denied;
  const body = (await readJson(request)) as Record<string, unknown> | undefined;
  const parsed = parseAccountInput({ name: body?.name, email: body?.email }, true);
  if (!parsed.ok) return apiError("bad_request", parsed.errors);
  const { name, email } = parsed.value;
  return NextResponse.json({ account: toAccountDto(updateAccount(admin.id, { name, email })!) });
}

import { NextResponse } from "next/server";
import { unlinkAccount } from "@/lib/auth/oidc";
import { requireAdmin } from "@/lib/http";

/** Unlinks the signed-in account from its single sign-on identity: back to the password only. */
export async function DELETE(request: Request) {
  const { admin, denied } = await requireAdmin(request, { notInDemo: true });
  if (denied) return denied;
  unlinkAccount(admin.id);
  return NextResponse.json({ ok: true });
}

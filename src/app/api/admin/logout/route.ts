import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { apiError } from "@/lib/http";
import { isSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  (await getAdminSession()).destroy();
  return NextResponse.json({ ok: true });
}

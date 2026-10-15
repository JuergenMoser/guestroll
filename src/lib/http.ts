import "server-only";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/security/request";

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "too_large"
  | "rate_limited"
  | "uploads_closed"
  | "quota_reached"
  | "invalid_image"
  | "invalid_code";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  too_large: 413,
  rate_limited: 429,
  uploads_closed: 403,
  quota_reached: 403,
  invalid_image: 415,
  invalid_code: 401,
};

/** Error bodies carry a stable `code` the UI translates; `details` is for field errors. */
export function apiError(code: ErrorCode, details?: Record<string, string>, headers?: HeadersInit) {
  return NextResponse.json({ error: code, ...(details ? { details } : {}) }, { status: STATUS[code], headers });
}

export function rateLimited(retryAfterMs: number) {
  return apiError("rate_limited", undefined, { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) });
}

/**
 * Gate for every admin route. Mutations additionally require a same-origin
 * request: the admin cookie is `SameSite=Lax`, which still lets a top-level
 * cross-site form POST through in some browsers.
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) return apiError("forbidden");
  if (!(await isAdmin())) return apiError("unauthorized");
  return null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

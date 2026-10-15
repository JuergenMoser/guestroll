import "server-only";
import { NextResponse } from "next/server";
import { getAdmin, type AdminIdentity } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import type { EventRow } from "@/lib/db/schema";
import { getEventById } from "@/lib/events";
import { isEventAdmin } from "@/lib/policy";
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
  | "invalid_code"
  | "storage_full";

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
  storage_full: 507,
};

/** Error bodies carry a stable `code` the UI translates; `details` is for field errors. */
export function apiError(code: ErrorCode, details?: Record<string, string>, headers?: HeadersInit) {
  return NextResponse.json({ error: code, ...(details ? { details } : {}) }, { status: STATUS[code], headers });
}

export function rateLimited(retryAfterMs: number) {
  return apiError("rate_limited", undefined, { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) });
}

type Guarded<T> = ({ denied: null } & T) | ({ denied: NextResponse } & { [K in keyof T]: null });

/**
 * Gate for every admin route. Mutations additionally require a same-origin
 * request: the admin cookie is `SameSite=Lax`, which still lets a top-level
 * cross-site form POST through in some browsers. `owner` restricts the route
 * to owners (instance settings, accounts, backups).
 */
/**
 * `notInDemo`: what a public demo must not let visitors do, sending anything
 * out (email, webhooks), touching the host (updates, backups and their
 * secrets) or locking the shared account (passwords, two-step, accounts).
 */
export async function requireAdmin(request: Request, options: { owner?: boolean; notInDemo?: boolean } = {}): Promise<Guarded<{ admin: AdminIdentity }>> {
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) return { denied: apiError("forbidden"), admin: null };
  // Declared by each route, not matched on the URL: no path spelling can slip past it.
  if (config.demo.enabled && options.notInDemo) return { denied: apiError("forbidden", { demo: "disabled" }), admin: null };
  const admin = await getAdmin();
  if (!admin) return { denied: apiError("unauthorized"), admin: null };
  if (options.owner && admin.role !== "owner") return { denied: apiError("forbidden"), admin: null };
  return { denied: null, admin };
}

/**
 * Gate for routes about one event. An event outside the admin's scope answers
 * 404, like a missing one: organizers can't probe other events' ids.
 */
export async function requireEventAdmin(request: Request, eventId: string): Promise<Guarded<{ admin: AdminIdentity; event: EventRow }>> {
  const { admin, denied } = await requireAdmin(request);
  if (denied) return { denied, admin: null, event: null };
  const event = getEventById(eventId);
  if (!event || !isEventAdmin(event.id, { admin: admin.scope })) return { denied: apiError("not_found"), admin: null, event: null };
  return { denied: null, admin, event };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

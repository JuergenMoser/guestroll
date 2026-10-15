import "server-only";
import { open, seal } from "@/lib/crypto/secretBox";
import { readSetting, writeSetting } from "@/lib/settings";
import { newId } from "@/lib/security/ids";
import { WEBHOOK_KINDS, WEBHOOK_TYPES, type WebhookDto, type WebhookKind, type WebhookType } from "./types";

const KEY = "webhooks";

/** As stored: URL and secret sealed, since a webhook URL is itself a credential (Discord, Slack). */
interface StoredWebhook {
  id: string;
  name: string;
  type: WebhookType;
  url: string;
  secret: string | null;
  kinds: WebhookKind[];
  enabled: boolean;
}

export interface Webhook extends Omit<StoredWebhook, "url" | "secret"> {
  url: string;
  secret: string | null;
}

function stored(): StoredWebhook[] {
  try {
    const value = JSON.parse(readSetting(KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function listWebhooks(): Webhook[] {
  return stored().flatMap((w) => {
    const url = open(w.url);
    // A webhook whose URL can't be opened (SESSION_SECRET changed) is skipped, not fatal.
    return url ? [{ ...w, url, secret: w.secret ? open(w.secret) : null }] : [];
  });
}

export const getWebhook = (id: string) => listWebhooks().find((w) => w.id === id);

export function webhooksFor(kind: WebhookKind): Webhook[] {
  return listWebhooks().filter((w) => w.enabled && w.kinds.includes(kind));
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.length > 1 ? "/…" : ""}`;
  } catch {
    return "…";
  }
}

export function toWebhookDto(w: Webhook): WebhookDto {
  return { id: w.id, name: w.name, type: w.type, urlHint: maskUrl(w.url), kinds: w.kinds, hasSecret: Boolean(w.secret), enabled: w.enabled };
}

export interface WebhookInput {
  name: string;
  type: WebhookType;
  /** Empty on update: keep the saved URL. */
  url: string;
  /** null: remove; empty string on update: keep; otherwise the new secret. */
  secret: string | null;
  kinds: WebhookKind[];
  enabled: boolean;
}

export function parseWebhookInput(body: unknown, partial: boolean): { ok: true; value: Partial<WebhookInput> } | { ok: false; errors: Record<string, string> } {
  const src = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const value: Partial<WebhookInput> = {};
  if (src.name !== undefined || !partial) {
    const name = typeof src.name === "string" ? src.name.trim() : "";
    if (!name || name.length > 60) errors.name = "invalid";
    else value.name = name;
  }
  if (src.type !== undefined || !partial) {
    if (!(WEBHOOK_TYPES as readonly unknown[]).includes(src.type)) errors.type = "invalid";
    else value.type = src.type as WebhookType;
  }
  if (src.url !== undefined && src.url !== "") {
    let ok = false;
    try {
      const u = new URL(String(src.url));
      ok = (u.protocol === "https:" || u.protocol === "http:") && String(src.url).length <= 2000;
    } catch {}
    if (!ok) errors.url = "invalid";
    else value.url = String(src.url).trim();
  } else if (!partial) errors.url = "invalid";
  if (src.secret !== undefined) {
    if (src.secret === null) value.secret = null;
    else if (typeof src.secret === "string" && src.secret.length <= 200) value.secret = src.secret;
    else errors.secret = "invalid";
  }
  if (src.kinds !== undefined || !partial) {
    const kinds = Array.isArray(src.kinds) ? src.kinds.filter((k): k is WebhookKind => (WEBHOOK_KINDS as readonly unknown[]).includes(k)) : [];
    value.kinds = [...new Set(kinds)];
  }
  if (src.enabled !== undefined) value.enabled = src.enabled === true;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

const MAX_WEBHOOKS = 10;

export function saveWebhook(id: string | null, input: Partial<WebhookInput>): Webhook | "limit" | "not_found" {
  const list = stored();
  if (id === null) {
    if (list.length >= MAX_WEBHOOKS) return "limit";
    const created: StoredWebhook = {
      id: newId(),
      name: input.name!,
      type: input.type!,
      url: seal(input.url!),
      secret: input.secret ? seal(input.secret) : null,
      kinds: input.kinds ?? [],
      enabled: input.enabled ?? true,
    };
    writeSetting(KEY, JSON.stringify([...list, created]));
    return getWebhook(created.id)!;
  }
  const current = list.find((w) => w.id === id);
  if (!current) return "not_found";
  const next: StoredWebhook = {
    ...current,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.kinds !== undefined ? { kinds: input.kinds } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.url ? { url: seal(input.url) } : {}),
    ...(input.secret === null ? { secret: null } : input.secret ? { secret: seal(input.secret) } : {}),
  };
  writeSetting(KEY, JSON.stringify(list.map((w) => (w.id === id ? next : w))));
  return getWebhook(id)!;
}

export function deleteWebhook(id: string): boolean {
  const list = stored();
  if (!list.some((w) => w.id === id)) return false;
  writeSetting(KEY, JSON.stringify(list.filter((w) => w.id !== id)));
  return true;
}

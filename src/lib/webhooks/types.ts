/** Shared by the server and the settings form: no server-only imports here. */

export const WEBHOOK_TYPES = ["ntfy", "discord", "slack", "json"] as const;
export type WebhookType = (typeof WEBHOOK_TYPES)[number];

/** What a webhook can subscribe to. */
export const WEBHOOK_KINDS = ["event_ended", "photos_pending", "guestbook_message", "failed_logins", "storage"] as const;
export type WebhookKind = (typeof WEBHOOK_KINDS)[number] | "test";

/** What the admin sees: the URL is masked, the secret never sent back. */
export interface WebhookDto {
  id: string;
  name: string;
  type: WebhookType;
  urlHint: string;
  kinds: WebhookKind[];
  hasSecret: boolean;
  enabled: boolean;
}

/** One thing worth telling the hosts, before it is formatted for a given service. */
export interface Notice {
  kind: WebhookKind;
  title: string;
  message: string;
  /** Where to act on it (the admin page of the event…). */
  url: string;
  event?: { id: string; name: string };
  data?: Record<string, unknown>;
}

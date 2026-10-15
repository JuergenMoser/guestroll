import "server-only";
import { migrationsAppliedAtStart } from "@/lib/db/client";
import { config } from "@/lib/config";
import { mailMessages } from "@/lib/mail/messages";
import { enqueueMail } from "@/lib/mail/outbox";
import { instanceRecipients } from "@/lib/mail/settings";
import { updateAvailableMail } from "@/lib/mail/templates";
import { readSetting, writeSetting } from "@/lib/settings";
import { backgroundBaseUrl } from "@/lib/urls";
import { notify } from "@/lib/webhooks/queue";
import pkg from "../../package.json";

/**
 * Knowing about new releases (GitHub's latest release, checked every 12
 * hours) and remembering the updates this instance went through, with the
 * migrations each one applied.
 */

const REPO = "achedon12/guestroll";
const LATEST = "update_latest";
const HISTORY = "update_history";
const VERSION = "app_version";
export const CHECK_EVERY_MS = 12 * 3_600_000;

export interface Release {
  version: string;
  notes: string;
  url: string;
  publishedAt: string;
}

export interface UpdateRecord {
  from: string;
  to: string;
  at: number;
  migrations: string[];
}

export const currentVersion = (): string => pkg.version;

/** Semantic comparison of `x.y.z`, ignoring a leading `v`; pre-releases sort before their release. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const [main, pre] = v.replace(/^v/, "").split("-", 2);
    return { parts: main.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (x.parts[i] ?? 0) - (y.parts[i] ?? 0);
    if (d) return Math.sign(d);
  }
  if (x.pre && !y.pre) return -1;
  if (!x.pre && y.pre) return 1;
  return (x.pre ?? "").localeCompare(y.pre ?? "");
}

export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function latestKnown(): (Release & { checkedAt: number }) | null {
  try {
    return JSON.parse(readSetting(LATEST) ?? "null");
  } catch {
    return null;
  }
}

/** The newest release, when it is newer than this instance. */
export function availableUpdate(): Release | null {
  const latest = latestKnown();
  return latest && compareVersions(latest.version, currentVersion()) > 0 ? latest : null;
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** Asks GitHub. Stores the answer; tells the owners once per new version. */
export async function checkForUpdate(fetcher: Fetcher = fetch, now = Date.now()): Promise<Release | null> {
  const res = await fetcher(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": `${config.appName}/${currentVersion()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const body = (await res.json()) as { tag_name?: string; body?: string; html_url?: string; published_at?: string; draft?: boolean; prerelease?: boolean };
  const version = (body.tag_name ?? "").replace(/^v/, "");
  if (!VERSION_PATTERN.test(version) || body.draft || body.prerelease) throw new Error("No usable release");
  const release: Release = { version, notes: (body.body ?? "").slice(0, 20_000), url: body.html_url ?? `https://github.com/${REPO}/releases`, publishedAt: body.published_at ?? "" };
  writeSetting(LATEST, JSON.stringify({ ...release, checkedAt: now }));
  if (compareVersions(version, currentVersion()) > 0) announce(release);
  return release;
}

function announce(release: Release) {
  const url = `${backgroundBaseUrl()}/admin/settings#updates`;
  const mail = updateAvailableMail({ app: config.appName, locale: config.locale, url, version: release.version, current: currentVersion() });
  for (const to of instanceRecipients()) enqueueMail({ to, mail, kind: "update", dedupeKey: `update:${release.version}:${to}` });
  const m = mailMessages[config.locale].update;
  notify({ kind: "update_available", title: mail.subject, message: m.body.replace("{version}", release.version).replace("{current}", currentVersion()), url, data: { version: release.version, current: currentVersion() } }, `update:${release.version}`);
}

/** Called by the scheduler: at most every 12 hours, never failing the tick. */
export async function maybeCheckForUpdate(now = Date.now()): Promise<void> {
  if (!config.updateCheck) return;
  const latest = latestKnown();
  if (latest && now - latest.checkedAt < CHECK_EVERY_MS) return;
  await checkForUpdate(fetch, now).catch((error) => console.warn("[updates]", (error as Error).message));
}

export function updateHistory(): UpdateRecord[] {
  try {
    return JSON.parse(readSetting(HISTORY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * At startup: if the version changed since the last start, that was an update.
 * Records it with the migrations this start applied.
 */
export function recordStartup(now = Date.now()): UpdateRecord | null {
  const previous = readSetting(VERSION);
  const current = currentVersion();
  writeSetting(VERSION, current);
  if (!previous || previous === current) return null;
  const record: UpdateRecord = { from: previous, to: current, at: now, migrations: migrationsAppliedAtStart() };
  writeSetting(HISTORY, JSON.stringify([record, ...updateHistory()].slice(0, 20)));
  return record;
}

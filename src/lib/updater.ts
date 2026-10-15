import "server-only";
import { config } from "@/lib/config";

/** Talks to the optional updater container (updater/server.mjs) over the compose network. */

export interface UpdaterJob {
  version: string;
  state: "running" | "done" | "failed" | "rolled_back";
  startedAt: number;
  finishedAt?: number;
  error?: string;
  log: { at: number; line: string }[];
}

export interface UpdaterStatus {
  configured: boolean;
  reachable: boolean;
  image?: string;
  error?: string;
  job?: UpdaterJob | null;
}

export const updaterConfigured = () => Boolean(config.updater.url && config.updater.token);

async function call(path: string, init: RequestInit = {}) {
  return fetch(`${config.updater.url}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.updater.token}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
}

export async function updaterStatus(): Promise<UpdaterStatus> {
  if (!updaterConfigured()) return { configured: false, reachable: false };
  try {
    const res = await call("/status");
    if (!res.ok) return { configured: true, reachable: false, error: `The updater answered ${res.status}` };
    const body = (await res.json()) as { ok: boolean; image?: string; error?: string; job: UpdaterJob | null };
    return { configured: true, reachable: body.ok, image: body.image, error: body.error, job: body.job };
  } catch (error) {
    return { configured: true, reachable: false, error: (error as Error).message };
  }
}

export async function startUpdate(version: string): Promise<UpdaterJob> {
  const res = await call("/update", { method: "POST", body: JSON.stringify({ version }) });
  const body = (await res.json().catch(() => ({}))) as { job?: UpdaterJob; error?: string };
  if (!res.ok || !body.job) throw new Error(body.error === "busy" ? "An update is already running" : `The updater refused: ${body.error ?? res.status}`);
  return body.job;
}

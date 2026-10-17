"use client";

import type { Filter } from "@/lib/effects";

/**
 * Files waiting to be sent, kept in the browser's IndexedDB until the server has
 * them. A guest who locks their phone, switches app or closes the tab mid-upload
 * would otherwise lose them without knowing: the next visit sends them instead.
 *
 * Every call swallows its errors. Private browsing, a full disk or an old
 * browser leave the queue working as before, in memory only.
 */

export interface PendingUpload {
  id: string;
  /** The upload URL, `?at=` included: a photo taken at table 5 stays table 5's. */
  endpoint: string;
  /** The event's photo route without its query: what a page lists its own files by. */
  scope: string;
  file: Blob;
  name: string;
  challengeId: string | null;
  filter: Filter;
  createdAt: number;
}

const DB = "guestroll-uploads";
const STORE = "pending";
// A file still waiting after a week is from a party long over: the event has
// most likely closed its uploads, and the guest moved on.
const MAX_AGE_MS = 7 * 24 * 3600_000;

let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = body(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export const scopeOf = (endpoint: string) => endpoint.split("?")[0];

export async function savePending(upload: PendingUpload): Promise<void> {
  await run("readwrite", (store) => store.put(upload));
}

export async function removePending(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

/** This event's waiting files, oldest first. Expired ones are dropped on the way. */
export async function listPending(scope: string): Promise<PendingUpload[]> {
  const all = (await run("readonly", (store) => store.getAll() as IDBRequest<PendingUpload[]>)) ?? [];
  const now = Date.now();
  for (const upload of all) if (now - upload.createdAt > MAX_AGE_MS) void removePending(upload.id);
  return all.filter((u) => u.scope === scope && now - u.createdAt <= MAX_AGE_MS).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Only one tab of an event sends its waiting files: two tabs resuming the same
 * ones would upload each photo twice. The lock lives as long as the page.
 * Browsers without Web Locks resume in every tab, as there is no telling.
 */
const claims = new Map<string, Promise<boolean>>();

export function claimResume(scope: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks) return Promise.resolve(true);
  // Asked again by the same page (a remount), the answer is the lock it already holds.
  let claim = claims.get(scope);
  if (!claim) {
    claim = request(scope);
    claims.set(scope, claim);
  }
  return claim;
}

function request(scope: string): Promise<boolean> {
  return new Promise((resolve) => {
    navigator.locks
      .request(`guestroll-resume:${scope}`, { ifAvailable: true }, (lock) => {
        resolve(lock !== null);
        // Held until the page goes away.
        return lock ? new Promise<void>(() => {}) : undefined;
      })
      .catch(() => resolve(true));
  });
}

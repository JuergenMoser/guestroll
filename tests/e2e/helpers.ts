import { request, type APIRequestContext } from "@playwright/test";
import sharp from "sharp";

export const ADMIN_PASSWORD = "e2e-admin-password";

/** A request context with its own cookie jar, sending the same-origin header browsers send. */
export async function client(baseURL: string): Promise<APIRequestContext> {
  return request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
}

export async function admin(baseURL: string): Promise<APIRequestContext> {
  return signIn(baseURL, "admin", ADMIN_PASSWORD);
}

export async function signIn(baseURL: string, username: string, password: string): Promise<APIRequestContext> {
  const api = await client(baseURL);
  const res = await api.post("/api/admin/login", { data: { username, password } });
  if (!res.ok()) throw new Error(`admin login failed: ${res.status()}`);
  return api;
}

export interface CreatedEvent {
  id: string;
  slug: string;
  name: string;
}

export async function createEvent(api: APIRequestContext, data: Record<string, unknown> = {}): Promise<CreatedEvent> {
  const res = await api.post("/api/admin/events", { data: { name: `E2E ${Math.random().toString(36).slice(2, 8)}`, ...data } });
  if (res.status() !== 201) throw new Error(`create event failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).event;
}

let seed = 0;
/** A small real JPEG, different every call. */
export async function photo(): Promise<Buffer> {
  seed++;
  return sharp({ create: { width: 640, height: 480, channels: 3, background: { r: (seed * 47) % 255, g: 90, b: 160 } } }).jpeg().toBuffer();
}

export async function joinAndUpload(api: APIRequestContext, slug: string, count = 1) {
  await api.post(`/api/e/${slug}/join`);
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const res = await api.post(`/api/e/${slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } });
    if (res.status() !== 201) throw new Error(`upload failed: ${res.status()} ${await res.text()}`);
    ids.push((await res.json()).photo.id);
  }
  return ids;
}

/** The smallest Ogg/Opus header file-type recognises: enough to stand for a recorded voice note. */
export function voiceNote(): Buffer {
  const page = Buffer.alloc(47);
  page.write("OggS", 0);
  page[5] = 2;
  page[26] = 1;
  page[27] = 19;
  page.write("OpusHead", 28);
  page[36] = 1;
  page[37] = 1;
  return page;
}

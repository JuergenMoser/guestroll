import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { Readable } from "node:stream";
import { config } from "@/lib/config";
import { assertPublicHost, publicLookup } from "@/lib/security/addresses";
import type { CloudSettings } from "./settings";

export class WebdavError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Long enough for a 25 MB original over a slow uplink; the deadline counts from the start.
const TIMEOUT_MS = 120_000;

/**
 * One WebDAV request. node:http, like webhooks, so the connection's own DNS lookup
 * refuses internal addresses (unless CLOUD_ALLOW_PRIVATE): the URL is an owner's.
 */
function call(cloud: CloudSettings, method: string, path: string, body?: { stream: Readable; size: number } | string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const target = new URL(path, cloud.url);
    // The credentials go under the configured root and nowhere else: a path that
    // resolved elsewhere (a `..` segment, a scheme-looking one) is refused outright.
    const root = new URL(cloud.url);
    if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) {
      return reject(new WebdavError(0, "Refused a path outside the configured folder"));
    }
    const guarded = !config.cloudAllowPrivate;
    try {
      if (guarded) assertPublicHost(target);
    } catch (error) {
      return reject(error);
    }
    const size = typeof body === "string" ? Buffer.byteLength(body) : body?.size;
    const send = target.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(
      target,
      {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${cloud.user}:${cloud.password}`).toString("base64")}`,
          ...(size !== undefined ? { "Content-Length": size } : {}),
          ...headers,
        },
        timeout: TIMEOUT_MS,
        ...(guarded ? { lookup: publicLookup } : {}),
      },
      (res) => {
        res.resume();
        res.on("end", () => clearTimeout(deadline));
        resolve(res.statusCode ?? 0);
      },
    );
    const deadline = setTimeout(() => req.destroy(new Error("WebDAV server didn't answer in time")), TIMEOUT_MS);
    req.on("timeout", () => req.destroy(new Error("WebDAV server didn't answer in time")));
    req.on("error", reject);
    req.on("close", () => clearTimeout(deadline));
    if (typeof body === "string") req.end(body);
    else if (body) body.stream.on("error", (e) => req.destroy(e)).pipe(req);
    else req.end();
  });
}

// `.` and `..` survive encodeURIComponent and are dot segments to a URL parser:
// they'd climb out of the folder. Made harmless here, refused again in `call`.
const safeSegment = (segment: string) => encodeURIComponent(/^\.+$/.test(segment) ? segment.replace(/\./g, "_") : segment);
const encodePath = (segments: string[]) => segments.map(safeSegment).join("/");

/** Creates every folder of `segments` that doesn't exist yet (MKCOL is one level at a time). */
export async function ensureFolders(cloud: CloudSettings, segments: string[]): Promise<void> {
  for (let i = 1; i <= segments.length; i++) {
    const status = await call(cloud, "MKCOL", `${encodePath(segments.slice(0, i))}/`);
    // 201 created, 405 already there (some servers answer 301 or 409 for an existing one).
    if (status !== 201 && status !== 405 && status !== 301) throw new WebdavError(status, `Can't create the folder ${segments.slice(0, i).join("/")} (HTTP ${status})`);
  }
}

export async function putFile(cloud: CloudSettings, segments: string[], file: { stream: Readable; size: number }, contentType: string): Promise<void> {
  const status = await call(cloud, "PUT", encodePath(segments), file, { "Content-Type": contentType });
  if (status < 200 || status >= 300) throw new WebdavError(status, `Can't upload ${segments.at(-1)} (HTTP ${status})`);
}

/** Checks the address and the login: a PROPFIND of the root, what every WebDAV client does first. */
export async function testConnection(cloud: CloudSettings): Promise<void> {
  const status = await call(cloud, "PROPFIND", "", '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', {
    Depth: "0",
    "Content-Type": "application/xml",
  });
  if (status === 401 || status === 403) throw new WebdavError(status, "The username or the password was refused");
  if (status !== 207) throw new WebdavError(status, `This address doesn't answer like a WebDAV folder (HTTP ${status})`);
}

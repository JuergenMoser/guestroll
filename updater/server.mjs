// The updater: a tiny HTTP service, reachable only on the compose network,
// that Guestroll asks to move its own container to a new version.
//
//   UPDATER_TOKEN      shared with the app (required)
//   UPDATER_CONTAINER  the container to update (default: guestroll)
//   UPDATER_PORT       default 9900
//
// It needs the Docker socket, which is root on the host: it only ever touches
// UPDATER_CONTAINER, and only pulls that container's own image repository.
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { dockerClient } from "./docker.mjs";
import { updateContainer, VERSION } from "./update.mjs";

const token = process.env.UPDATER_TOKEN ?? "";
const container = process.env.UPDATER_CONTAINER || "guestroll";
const port = Number(process.env.UPDATER_PORT || 9900);
if (token.length < 24) {
  console.error("UPDATER_TOKEN must be set, 24 characters or more: the updater controls Docker.");
  process.exit(1);
}

const docker = dockerClient(process.env.DOCKER_SOCKET || "/var/run/docker.sock");
let job = null;

const authorized = (req) => {
  const given = Buffer.from(req.headers.authorization?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
};

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 4096) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
    if (req.method === "GET" && req.url === "/status") {
      try {
        const info = await docker.inspect(container);
        return send(res, 200, { ok: true, container, image: info.Config.Image, job });
      } catch (error) {
        return send(res, 200, { ok: false, container, error: error.message, job });
      }
    }
    if (req.method === "POST" && req.url === "/update") {
      if (job?.state === "running") return send(res, 409, { error: "busy", job });
      const { version } = await readBody(req);
      if (typeof version !== "string" || !VERSION.test(version)) return send(res, 400, { error: "bad_version" });
      job = { version, state: "running", startedAt: Date.now(), log: [] };
      const current = job;
      const log = (line) => {
        current.log.push({ at: Date.now(), line });
        console.log(`[updater] ${line}`);
      };
      updateContainer(docker, { container, version, log, allowLocalImage: process.env.UPDATER_ALLOW_LOCAL_IMAGE === "true" })
        .then(() => Object.assign(current, { state: "done", finishedAt: Date.now() }))
        .catch((error) => Object.assign(current, { state: error.rolledBack ? "rolled_back" : "failed", error: error.message, finishedAt: Date.now() }));
      return send(res, 202, { job });
    }
    send(res, 404, { error: "not_found" });
  })
  .listen(port, () => console.log(`[updater] listening on ${port}, updating "${container}"`));

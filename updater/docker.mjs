// A minimal Docker Engine API client over the unix socket: the handful of calls
// the updater needs, with Node's own http module (no dependency in the image).
import http from "node:http";

export function dockerClient(socketPath = "/var/run/docker.sock") {
  function request(method, path, body) {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = http.request(
        { socketPath, path: `/v1.43${path}`, method, headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {} },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            if (res.statusCode >= 400) {
              let message = text;
              try {
                message = JSON.parse(text).message ?? text;
              } catch {}
              const error = new Error(`Docker ${method} ${path}: ${res.statusCode} ${message}`.slice(0, 400));
              error.status = res.statusCode;
              return reject(error);
            }
            if (!text) return resolve(null);
            try {
              resolve(JSON.parse(text));
            } catch {
              // Image pulls stream one JSON object per line: keep the last, it holds any error.
              const lines = text.trim().split("\n").map((l) => JSON.parse(l));
              const failed = lines.find((l) => l.error);
              if (failed) return reject(new Error(`Pull failed: ${failed.error}`));
              resolve(lines);
            }
          });
        },
      );
      req.on("error", reject);
      req.setTimeout(10 * 60_000, () => req.destroy(new Error("Docker request timed out")));
      if (payload) req.write(payload);
      req.end();
    });
  }

  return {
    inspect: (name) => request("GET", `/containers/${encodeURIComponent(name)}/json`),
    pull: (image, tag) => request("POST", `/images/create?fromImage=${encodeURIComponent(image)}&tag=${encodeURIComponent(tag)}`),
    inspectImage: (ref) => request("GET", `/images/${encodeURIComponent(ref)}/json`),
    imageExists: (ref) => request("GET", `/images/${encodeURIComponent(ref)}/json`).then(() => true, () => false),
    stop: (id) => request("POST", `/containers/${id}/stop?t=30`).catch((e) => (e.status === 304 ? null : Promise.reject(e))),
    start: (id) => request("POST", `/containers/${id}/start`).catch((e) => (e.status === 304 ? null : Promise.reject(e))),
    rename: (id, name) => request("POST", `/containers/${id}/rename?name=${encodeURIComponent(name)}`),
    remove: (id) => request("DELETE", `/containers/${id}?force=true`),
    create: (name, body) => request("POST", `/containers/create?name=${encodeURIComponent(name)}`, body),
    connect: (network, container, endpoint) => request("POST", `/networks/${encodeURIComponent(network)}/connect`, { Container: container, EndpointConfig: endpoint }),
  };
}

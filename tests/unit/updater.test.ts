import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM shipped in the image, no types
import { ownConfig, recreateBody, repositoryOf, updateContainer } from "../../updater/update.mjs";

type Container = { Id: string; Name: string; Image: string; Config: Record<string, unknown>; HostConfig: Record<string, unknown>; NetworkSettings: { Networks: Record<string, { Aliases?: string[] }> }; State: Record<string, unknown> };

/** A Docker that keeps containers in a map and fails where told to. */
function fakeDocker(opts: { newHealth?: "healthy" | "unhealthy" | "exit"; pullFails?: boolean } = {}) {
  const containers = new Map<string, Container>();
  const calls: string[] = [];
  const old: Container = {
    Id: "old111",
    Name: "/guestroll",
    Image: "sha256:oldimage",
    Config: {
      Image: "ghcr.io/achedon12/guestroll:0.3.0",
      Env: ["ADMIN_PASSWORD=secret", "NODE_ENV=production", "TZ=Europe/Paris"],
      Cmd: ["node", "server.js"],
      Labels: { "org.opencontainers.image.version": "0.3.0", "com.docker.compose.service": "guestroll" },
    },
    HostConfig: { Binds: ["guestroll-data:/data"], PortBindings: { "3000/tcp": [{ HostPort: "3000" }] }, RestartPolicy: { Name: "unless-stopped" } },
    NetworkSettings: { Networks: { app_default: { Aliases: ["guestroll", "old111"] }, proxy: { Aliases: ["photos"] } } },
    State: { Status: "running", Running: true, Health: { Status: "healthy" } },
  };
  containers.set("guestroll", old);
  containers.set(old.Id, old);
  const docker = {
    calls,
    containers,
    inspect: async (id: string) => {
      const c = containers.get(id);
      if (!c) throw Object.assign(new Error("no such container"), { status: 404 });
      return structuredClone(c);
    },
    inspectImage: async () => ({ Config: { Env: ["NODE_ENV=production"], Cmd: ["node", "server.js"], Labels: { "org.opencontainers.image.version": "0.3.0" } } }),
    pull: async (repo: string, tag: string) => {
      calls.push(`pull ${repo}:${tag}`);
      if (opts.pullFails) throw new Error("manifest unknown");
    },
    imageExists: async () => false,
    stop: async (id: string) => {
      calls.push(`stop ${id}`);
      (containers.get(id)!.State as { Running: boolean }).Running = false;
    },
    rename: async (id: string, name: string) => {
      calls.push(`rename ${id} ${name}`);
      const c = containers.get(id)!;
      for (const [k, v] of containers) if (v === c && k !== id) containers.delete(k);
      c.Name = `/${name}`;
      containers.set(name, c);
    },
    create: async (name: string, body: Record<string, unknown>) => {
      calls.push(`create ${name} ${body.Image}`);
      const state =
        opts.newHealth === "exit" ? { Status: "exited", ExitCode: 1 } : { Status: "running", Running: true, Health: { Status: opts.newHealth ?? "healthy" } };
      const c = { Id: "new222", Name: `/${name}`, Image: "sha256:new", Config: body, HostConfig: body.HostConfig as Record<string, unknown>, NetworkSettings: { Networks: {} }, State: state } as Container;
      containers.set(name, c);
      containers.set(c.Id, c);
      return { Id: c.Id };
    },
    connect: async (network: string, id: string) => calls.push(`connect ${network} ${id}`),
    start: async (id: string) => calls.push(`start ${id}`),
    remove: async (id: string) => {
      calls.push(`remove ${id}`);
      for (const [k, v] of containers) if (v.Id === id) containers.delete(k);
    },
  };
  return docker;
}

describe("updater", () => {
  it("reads the repository out of any image reference", () => {
    expect(repositoryOf("ghcr.io/achedon12/guestroll:0.3.0")).toBe("ghcr.io/achedon12/guestroll");
    expect(repositoryOf("achedon12/guestroll:latest")).toBe("achedon12/guestroll");
    expect(repositoryOf("registry.local:5000/guestroll")).toBe("registry.local:5000/guestroll");
    expect(repositoryOf("ghcr.io/achedon12/guestroll@sha256:abc")).toBe("ghcr.io/achedon12/guestroll");
  });

  it("keeps the container's own settings, not its old image's defaults", () => {
    const own = ownConfig(
      { Env: ["NODE_ENV=production", "ADMIN_PASSWORD=x"], Cmd: ["node", "server.js"], Labels: { "org.opencontainers.image.version": "0.3.0", mine: "1" } },
      { Env: ["NODE_ENV=production"], Cmd: ["node", "server.js"], Labels: { "org.opencontainers.image.version": "0.3.0" } },
    );
    expect(own).toEqual({ Env: ["ADMIN_PASSWORD=x"], Labels: { mine: "1" } });
  });

  it("moves the container to the new version, with its volumes, ports and networks", async () => {
    const docker = fakeDocker();
    const log: string[] = [];
    const result = await updateContainer(docker, { container: "guestroll", version: "0.4.0", log: (l: string) => log.push(l), pollMs: 1 });
    expect(result.image).toBe("ghcr.io/achedon12/guestroll:0.4.0");
    const now = docker.containers.get("guestroll")!;
    expect(now.Id).toBe("new222");
    expect(now.Config).toMatchObject({ Image: "ghcr.io/achedon12/guestroll:0.4.0", Env: ["ADMIN_PASSWORD=secret", "TZ=Europe/Paris"], Labels: { "com.docker.compose.service": "guestroll" } });
    expect(now.HostConfig).toMatchObject({ Binds: ["guestroll-data:/data"], RestartPolicy: { Name: "unless-stopped" } });
    expect(docker.calls).toContain("connect proxy new222");
    expect(docker.calls.at(-1)).toBe("remove old111");
    expect(docker.containers.has("old111")).toBe(false);
  });

  it("puts the old container back when the new one is unhealthy or exits", async () => {
    for (const newHealth of ["unhealthy", "exit"] as const) {
      const docker = fakeDocker({ newHealth });
      await expect(updateContainer(docker, { container: "guestroll", version: "0.4.0", pollMs: 1 })).rejects.toMatchObject({ rolledBack: true });
      const back = docker.containers.get("guestroll")!;
      expect(back.Id).toBe("old111");
      expect(docker.calls).toContain("remove new222");
      expect(docker.calls.at(-1)).toBe("start old111");
    }
  });

  it("changes nothing when the image can't be pulled, or the version is odd", async () => {
    const docker = fakeDocker({ pullFails: true });
    await expect(updateContainer(docker, { container: "guestroll", version: "0.4.0" })).rejects.toThrow(/manifest unknown/);
    expect(docker.calls).toEqual(["pull ghcr.io/achedon12/guestroll:0.4.0"]);
    await expect(updateContainer(fakeDocker(), { container: "guestroll", version: "latest; rm -rf /" })).rejects.toThrow(/Not a version/);
    await expect(updateContainer(fakeDocker(), { container: "guestroll", version: "0.3.0" })).rejects.toThrow(/Already on/);
  });

  it("builds a body with the first network, the others connected after", () => {
    const { body, extraNetworks } = recreateBody(
      { Id: "abc123", Config: { Image: "x:1" }, HostConfig: {}, NetworkSettings: { Networks: { a: { Aliases: ["svc", "abc123"] }, b: {} } } },
      "x:2",
    );
    expect(Object.keys(body.NetworkingConfig.EndpointsConfig)).toEqual(["a"]);
    expect(body.NetworkingConfig.EndpointsConfig.a.Aliases).toEqual(["svc"]);
    expect(extraNetworks.map((n: { name: string }) => n.name)).toEqual(["b"]);
  });
});

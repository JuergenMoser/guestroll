// Replaces the Guestroll container with the same one on a new image, and puts
// the old one back if the new one doesn't become healthy. Pure orchestration
// over a Docker client, so it is tested with a fake one.

export const VERSION = /^\d+\.\d+\.\d+$/;

/** `ghcr.io/achedon12/guestroll:0.3.0` -> `ghcr.io/achedon12/guestroll` (a registry port is not a tag). */
export function repositoryOf(image) {
  const at = image.split("@")[0];
  const slash = at.lastIndexOf("/");
  const colon = at.lastIndexOf(":");
  return colon > slash ? at.slice(0, colon) : at;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The container's own settings, without what it inherited from its old image:
 * a container's config also holds its image's defaults (env, command, health
 * check, labels), and copying those would pin the old image's values on the new one.
 */
export function ownConfig(config, imageConfig = {}) {
  const own = { ...config };
  for (const key of ["Cmd", "Entrypoint", "WorkingDir", "User", "Healthcheck", "ExposedPorts", "StopSignal", "Volumes"]) {
    if (same(own[key], imageConfig[key])) delete own[key];
  }
  const inherited = new Set(imageConfig.Env ?? []);
  own.Env = (own.Env ?? []).filter((e) => !inherited.has(e));
  const imageLabels = imageConfig.Labels ?? {};
  own.Labels = Object.fromEntries(Object.entries(own.Labels ?? {}).filter(([k, v]) => imageLabels[k] !== v));
  return own;
}

/** The config a new container needs to be the old one on another image. */
export function recreateBody(old, image, oldImageConfig = {}) {
  const networks = Object.entries(old.NetworkSettings?.Networks ?? {});
  const endpoint = ([, net]) => ({ Aliases: (net.Aliases ?? []).filter((a) => !old.Id.startsWith(a)), IPAMConfig: net.IPAMConfig ?? undefined });
  return {
    body: {
      ...ownConfig(old.Config, oldImageConfig),
      Image: image,
      HostConfig: old.HostConfig,
      NetworkingConfig: networks.length ? { EndpointsConfig: Object.fromEntries([networks[0]].map(([n, net]) => [n, endpoint([n, net])])) } : undefined,
    },
    // Docker attaches one network at creation: the others are connected after.
    extraNetworks: networks.slice(1).map(([name, net]) => ({ name, endpoint: endpoint([name, net]) })),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param docker   a client from docker.mjs (or a fake)
 * @param options  { container, version, log, healthTimeoutMs, pollMs, allowLocalImage }
 */
export async function updateContainer(docker, { container, version, log = () => {}, healthTimeoutMs = 180_000, pollMs = 2_000, allowLocalImage = false }) {
  if (!VERSION.test(version)) throw new Error(`Not a version: ${version}`);
  const old = await docker.inspect(container);
  const name = old.Name.replace(/^\//, "");
  const repository = repositoryOf(old.Config.Image);
  const image = `${repository}:${version}`;
  if (old.Config.Image === image) throw new Error(`Already on ${image}`);

  log(`Pulling ${image}`);
  try {
    await docker.pull(repository, version);
  } catch (error) {
    // Tests and air-gapped hosts: an image already loaded locally is fine.
    if (!(allowLocalImage && (await docker.imageExists(image)))) throw error;
    log(`Using the local ${image}`);
  }

  const oldImage = await docker.inspectImage(old.Image).catch(() => null);
  const { body, extraNetworks } = recreateBody(old, image, oldImage?.Config ?? {});
  const backupName = `${name}-previous-${Date.now()}`;
  log(`Stopping ${name}`);
  await docker.stop(old.Id);
  await docker.rename(old.Id, backupName);

  let created = null;
  try {
    log(`Starting ${name} on ${image}`);
    created = await docker.create(name, body);
    for (const net of extraNetworks) await docker.connect(net.name, created.Id, net.endpoint);
    await docker.start(created.Id);
    await waitHealthy(docker, created.Id, healthTimeoutMs, pollMs, log);
  } catch (error) {
    log(`The new container failed (${error.message}): putting ${old.Config.Image} back`);
    if (created) await docker.remove(created.Id).catch(() => {});
    await docker.rename(old.Id, name);
    await docker.start(old.Id);
    throw Object.assign(new Error(`Update to ${version} failed and was rolled back: ${error.message}`), { rolledBack: true });
  }

  log(`Healthy on ${image}; removing the previous container`);
  await docker.remove(old.Id).catch(() => {});
  return { image, container: created.Id };
}

async function waitHealthy(docker, id, timeoutMs, pollMs, log) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = (await docker.inspect(id)).State;
    if (state.Status === "exited" || state.Status === "dead") throw new Error(`exited with code ${state.ExitCode}`);
    const health = state.Health?.Status;
    // Without a healthcheck, running for a few polls is the best signal there is.
    if (health === "healthy" || (!state.Health && state.Running)) return;
    if (health === "unhealthy") throw new Error("health check failed");
    log(`Waiting for the health check (${health ?? state.Status})`);
    await sleep(pollMs);
  }
  throw new Error("health check timed out");
}

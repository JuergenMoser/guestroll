/** Browser-side JSON helper: resolves with data, or rejects with the API's error code. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly details?: Record<string, string>,
  ) {
    super(code);
  }
}

export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("offline");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; details?: Record<string, string> };
  if (!res.ok) throw new ApiError(data.error ?? "generic", data.details);
  return data;
}

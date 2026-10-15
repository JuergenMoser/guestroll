import { timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { collectMetrics, renderMetrics } from "@/lib/metrics";

/**
 * Prometheus scrape endpoint: `Authorization: Bearer <METRICS_TOKEN>`. Without a
 * token configured, or with a wrong one, it answers 404 like a missing page: no
 * need to tell a stranger it exists.
 */
export async function GET(request: Request) {
  const expected = config.metricsToken;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const ok = expected.length >= 16 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("Not found", { status: 404 });
  return new Response(renderMetrics(await collectMetrics()), {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8", "Cache-Control": "no-store" },
  });
}

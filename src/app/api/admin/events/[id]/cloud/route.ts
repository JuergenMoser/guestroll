import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { listExports, startExport, toCloudExportDto } from "@/lib/cloud/export";
import { getCloudSettings } from "@/lib/cloud/settings";
import { apiError, readJson, requireEventAdmin } from "@/lib/http";

type Context = RouteContext<"/api/admin/events/[id]/cloud">;

export async function GET(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  return NextResponse.json({ configured: getCloudSettings() !== null, exports: listExports(event.id).map(toCloudExportDto) });
}

/** `{ scope: "visible" | "favorites" }`: queues the album; it is sent in the background. */
export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  if (config.demo.enabled) return apiError("forbidden", { demo: "disabled" });
  if (!getCloudSettings()) return apiError("bad_request", { cloud: "not_configured" });
  const scope = ((await readJson(request)) as { scope?: unknown } | undefined)?.scope === "favorites" ? "favorites" : "visible";
  return NextResponse.json({ export: toCloudExportDto(startExport(event.id, scope)) }, { status: 202 });
}

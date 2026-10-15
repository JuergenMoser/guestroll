import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/http";
import { config } from "@/lib/config";
import { availableUpdate, currentVersion, latestKnown, updateHistory } from "@/lib/updates";
import { updaterStatus } from "@/lib/updater";

/** What runs, what's out, what happened, and whether this instance can update itself. */
export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const latest = latestKnown();
  return NextResponse.json({
    current: currentVersion(),
    latest: latest ? { version: latest.version, url: latest.url, publishedAt: latest.publishedAt, checkedAt: latest.checkedAt } : null,
    available: availableUpdate(),
    checkEnabled: config.updateCheck,
    history: updateHistory(),
    updater: await updaterStatus(),
  });
}

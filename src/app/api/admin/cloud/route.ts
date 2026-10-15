import { NextResponse } from "next/server";
import { clearCloudSettings, cloudNeedsPassword, cloudSettingsForForm, parseCloudBody, saveCloudSettings } from "@/lib/cloud/settings";
import { apiError, readJson, requireAdmin } from "@/lib/http";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  return NextResponse.json({ cloud: cloudSettingsForForm() });
}

/** `{ url, user, password, folder, autoExport }`; an empty password keeps the saved one for the same server and account. */
export async function PUT(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  const parsed = parseCloudBody(await readJson(request));
  if ("errors" in parsed) return apiError("bad_request", parsed.errors);
  if (cloudNeedsPassword(parsed.value)) return apiError("bad_request", { password: "required" });
  saveCloudSettings(parsed.value);
  return NextResponse.json({ cloud: cloudSettingsForForm() });
}

export async function DELETE(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  clearCloudSettings();
  return NextResponse.json({ ok: true });
}

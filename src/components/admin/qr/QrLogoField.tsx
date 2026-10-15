"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";

interface QrLogoFieldProps {
  eventId: string;
  slug: string;
  logoVersion: number | null;
  onChange: (logoVersion: number | null) => void;
  onError: (message: string) => void;
}

/** Upload, replace or remove the event logo. The logo is shared by the QR code, the guest page and the social card. */
export function QrLogoField({ eventId, slug, logoVersion, onChange, onError }: QrLogoFieldProps) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const body = new FormData();
    body.append("logo", file);
    const res = await fetch(`/api/admin/events/${eventId}/logo`, { method: "POST", body }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { event?: AdminEvent; error?: string }) : { error: "offline" };
    if (data.event) onChange(data.event.logoVersion);
    else onError(errorText(t, data.error));
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    try {
      const { event } = await api<{ event: AdminEvent }>(`/api/admin/events/${eventId}/logo`, { method: "DELETE" });
      onChange(event.logoVersion);
    } catch (err) {
      onError(errorText(t, err instanceof ApiError ? err.code : undefined));
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {logoVersion !== null && (
        // eslint-disable-next-line @next/next/no-img-element -- small admin preview
        <img src={`/api/e/${slug}/logo?v=${logoVersion}`} alt="" className="size-10 rounded-md bg-canvas object-contain p-1 ring-1 ring-line" />
      )}
      <Button size="sm" variant="secondary" onClick={() => input.current?.click()} loading={busy}>
        <ImagePlus className="size-4" aria-hidden />
        {logoVersion !== null ? t("admin.qr.replaceLogo") : t("admin.qr.uploadLogo")}
      </Button>
      {logoVersion !== null && (
        <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
          <Trash2 className="size-4" aria-hidden />
          {t("admin.qr.removeLogo")}
        </Button>
      )}
    </div>
  );
}

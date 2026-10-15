"use client";

import { AlertTriangle, Download, ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, buttonClass, Card, CardTitle, cn, Input, Switch } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";
import type { MessageKey } from "@/lib/i18n/translate";
import { qrMatrix, renderQrSvg } from "@/lib/qr/render";
import { contrastRatio, DEFAULT_QR_STYLE, EYE_SHAPES, isInverted, MODULE_SHAPES, parseQrStyle, QR_PRESETS, type QrStyle } from "@/lib/qr/style";

const PNG_SIZES = [512, 1024, 2048, 4096];

interface QrDesignerProps {
  event: Pick<AdminEvent, "id" | "slug" | "accentColor" | "logoVersion" | "qrStyle">;
  url: string;
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: (v: T) => string }) {
  return (
    <div role="radiogroup" className="flex gap-1 rounded-full bg-canvas p-1 ring-1 ring-line">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn("flex-1 rounded-full px-3 py-1 text-sm transition", value === option ? "bg-sunken-2 text-ink" : "text-ink-muted hover:text-ink")}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

function ColorInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2 rounded-xl bg-canvas p-1.5 pr-3 ring-1 ring-line", disabled && "opacity-40")}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-8 w-9 cursor-pointer rounded-lg bg-transparent" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

/**
 * Live designer: the preview runs the exact renderer the server uses for
 * downloads, so the saved file matches what's on screen.
 */
export function QrDesigner({ event, url }: QrDesignerProps) {
  const t = useT();
  const router = useRouter();
  const [style, setStyle] = useState<QrStyle>(event.qrStyle);
  const [saved, setSaved] = useState<QrStyle>(event.qrStyle);
  const [logoVersion, setLogoVersion] = useState(event.logoVersion);
  const [pngSize, setPngSize] = useState(2048);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof QrStyle>(key: K, value: QrStyle[K]) => setStyle((s) => ({ ...s, [key]: value }));
  const dirty = JSON.stringify(style) !== JSON.stringify(saved);
  const hasLogo = logoVersion !== null;

  const svg = useMemo(() => {
    // Re-validated before going into innerHTML: only strict #rrggbb colors and escaped text reach the markup.
    const effective = parseQrStyle({ ...style, logo: style.logo && hasLogo });
    return renderQrSvg(qrMatrix(url, effective), effective, { logoHref: hasLogo ? `/api/e/${event.slug}/logo?v=${logoVersion}` : undefined });
  }, [style, url, hasLogo, event.slug, logoVersion]);

  const contrast = style.transparent ? 21 : contrastRatio(style.foreground, style.background);

  function applyPreset(id: string, preset: Partial<QrStyle>) {
    const accent = id === "accent" ? { eyeColor: event.accentColor, foreground: DEFAULT_QR_STYLE.foreground } : {};
    setStyle((s) => ({ ...DEFAULT_QR_STYLE, logo: s.logo, logoScale: s.logoScale, label: s.label, ...preset, ...accent }));
  }

  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      const { event: updated } = await api<{ event: AdminEvent }>(`/api/admin/events/${event.id}`, { method: "PATCH", body: { qrStyle: style } });
      setSaved(updated.qrStyle);
      setStyle(updated.qrStyle);
      router.refresh();
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    body.append("logo", file);
    const res = await fetch(`/api/admin/events/${event.id}/logo`, { method: "POST", body }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { event?: AdminEvent; error?: string }) : { error: "offline" };
    if (data.event) {
      setLogoVersion(data.event.logoVersion);
      set("logo", true);
    } else setError(errorText(t, data.error));
    setBusy(false);
  }

  async function removeLogo() {
    setBusy(true);
    const { event: updated } = await api<{ event: AdminEvent }>(`/api/admin/events/${event.id}/logo`, { method: "DELETE" });
    setLogoVersion(updated.logoVersion);
    setBusy(false);
  }

  const qrUrl = `/api/admin/events/${event.id}/qr`;

  return (
    <Card className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="space-y-4">
        <div
          className="grid place-items-center rounded-xl p-4 [background:repeating-conic-gradient(var(--color-sunken-2)_0_25%,var(--color-sunken)_0_50%)_0_0/20px_20px]"
          aria-label={url}
          role="img"
        >
          <div className="w-full [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>

        {(contrast < 3 || isInverted(style)) && (
          <p className="flex gap-2 text-xs text-accent">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {contrast < 3 ? t("admin.qr.lowContrast") : t("admin.qr.inverted")}
          </p>
        )}

        <div className="space-y-2">
          {dirty && <p className="text-xs text-ink-muted">{t("admin.qr.unsaved")}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pngSize}
              onChange={(e) => setPngSize(Number(e.target.value))}
              aria-label={t("admin.qr.size")}
              className="h-8 rounded-full bg-sunken px-3 text-sm ring-1 ring-line-2"
            >
              {PNG_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
            <a href={`${qrUrl}?size=${pngSize}&download=1`} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" aria-hidden />
              PNG
            </a>
            <a href={`${qrUrl}?format=svg&download=1`} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" aria-hidden />
              SVG
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("admin.qr.title")}</CardTitle>
          <Button onClick={save} loading={busy} disabled={!dirty}>
            {t("common.save")}
          </Button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <Row label={t("admin.qr.presets")}>
          <div className="flex flex-wrap gap-2">
            {QR_PRESETS.map(({ id, style: preset }) => (
              <Button key={id} size="sm" variant="secondary" onClick={() => applyPreset(id, preset)}>
                {t(`admin.qr.presetNames.${id}` as MessageKey)}
              </Button>
            ))}
          </div>
        </Row>

        <Row label={t("admin.qr.colors")}>
          <div className="flex flex-wrap gap-2">
            <ColorInput label={t("admin.qr.foreground")} value={style.foreground} onChange={(v) => set("foreground", v)} />
            <ColorInput label={t("admin.qr.eyes")} value={style.eyeColor} onChange={(v) => set("eyeColor", v)} />
            <ColorInput label={t("admin.qr.background")} value={style.background} onChange={(v) => set("background", v)} disabled={style.transparent} />
          </div>
          <Switch label={t("admin.qr.transparent")} checked={style.transparent} onChange={(v) => set("transparent", v)} />
        </Row>

        <div className="grid gap-6 sm:grid-cols-2">
          <Row label={t("admin.qr.moduleShape")}>
            <Segmented value={style.modules} options={MODULE_SHAPES} onChange={(v) => set("modules", v)} label={(v) => t(`admin.qr.shapes.${v}`)} />
          </Row>
          <Row label={t("admin.qr.eyeShape")}>
            <Segmented value={style.eyes} options={EYE_SHAPES} onChange={(v) => set("eyes", v)} label={(v) => t(`admin.qr.shapes.${v}`)} />
          </Row>
        </div>

        <Row label={`${t("admin.qr.margin")}: ${style.margin}`}>
          <input type="range" min={0} max={8} value={style.margin} onChange={(e) => set("margin", Number(e.target.value))} className="w-full accent-accent" />
        </Row>

        <Row label={t("admin.qr.logo")}>
          <p className="text-xs text-ink-muted">{t("admin.qr.logoHint")}</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadLogo(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {hasLogo && (
              // eslint-disable-next-line @next/next/no-img-element -- small admin preview
              <img src={`/api/e/${event.slug}/logo?v=${logoVersion}`} alt="" className="size-10 rounded-lg bg-canvas object-contain p-1 ring-1 ring-line" />
            )}
            <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
              <ImagePlus className="size-4" aria-hidden />
              {hasLogo ? t("admin.qr.replaceLogo") : t("admin.qr.uploadLogo")}
            </Button>
            {hasLogo && (
              <Button size="sm" variant="ghost" onClick={removeLogo} disabled={busy}>
                <Trash2 className="size-4" aria-hidden />
                {t("admin.qr.removeLogo")}
              </Button>
            )}
          </div>
          {hasLogo && (
            <>
              <Switch label={t("admin.qr.showLogo")} checked={style.logo} onChange={(v) => set("logo", v)} />
              {style.logo && (
                <input
                  type="range"
                  min={0.12}
                  max={0.3}
                  step={0.01}
                  value={style.logoScale}
                  onChange={(e) => set("logoScale", Number(e.target.value))}
                  aria-label={t("admin.qr.logoSize")}
                  className="w-full accent-accent"
                />
              )}
            </>
          )}
        </Row>

        <Row label={t("admin.qr.label")}>
          <Input value={style.label} maxLength={40} onChange={(e) => set("label", e.target.value)} placeholder={t("admin.qr.labelPlaceholder")} />
        </Row>
      </div>
    </Card>
  );
}

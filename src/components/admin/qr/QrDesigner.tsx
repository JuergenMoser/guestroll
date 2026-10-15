"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Card, CardTitle, ColorField, Input, SegmentedControl, Switch } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";
import type { MessageKey } from "@/lib/i18n/translate";
import { qrMatrix, renderQrSvg } from "@/lib/qr/render";
import { DEFAULT_QR_STYLE, EYE_SHAPES, MODULE_SHAPES, parseQrStyle, QR_PRESETS, type QrStyle } from "@/lib/qr/style";
import { QrLogoField } from "./QrLogoField";
import { QrPreview } from "./QrPreview";

interface QrDesignerProps {
  event: Pick<AdminEvent, "id" | "slug" | "accentColor" | "logoVersion" | "qrStyle">;
  url: string;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const set = <K extends keyof QrStyle>(key: K, value: QrStyle[K]) => setStyle((s) => ({ ...s, [key]: value }));
  const dirty = JSON.stringify(style) !== JSON.stringify(saved);
  const hasLogo = logoVersion !== null;

  const svg = useMemo(() => {
    // Re-validated before going into innerHTML: only strict #rrggbb colors and escaped text reach the markup.
    const effective = parseQrStyle({ ...style, logo: style.logo && hasLogo });
    return renderQrSvg(qrMatrix(url, effective), effective, { logoHref: hasLogo ? `/api/e/${event.slug}/logo?v=${logoVersion}` : undefined });
  }, [style, url, hasLogo, event.slug, logoVersion]);

  function applyPreset(id: string, preset: Partial<QrStyle>) {
    const accent = id === "accent" ? { eyeColor: event.accentColor } : {};
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

  return (
    <Card className="grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr] lg:grid-cols-[minmax(0,22rem)_1fr]">
      <QrPreview svg={svg} style={style} url={url} downloadBase={`/api/admin/events/${event.id}/qr`} dirty={dirty} />

      <div className="min-w-0 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("admin.qr.title")}</CardTitle>
          <Button onClick={save} loading={busy} disabled={!dirty}>
            {t("common.save")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

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
            <ColorField label={t("admin.qr.foreground")} value={style.foreground} onChange={(v) => set("foreground", v)} />
            <ColorField label={t("admin.qr.eyes")} value={style.eyeColor} onChange={(v) => set("eyeColor", v)} />
            <ColorField label={t("admin.qr.background")} value={style.background} onChange={(v) => set("background", v)} disabled={style.transparent} />
          </div>
          <Switch label={t("admin.qr.transparent")} checked={style.transparent} onChange={(v) => set("transparent", v)} />
        </Row>

        <div className="grid gap-6 xl:grid-cols-2">
          <Row label={t("admin.qr.moduleShape")}>
            <SegmentedControl name={t("admin.qr.moduleShape")} value={style.modules} options={MODULE_SHAPES} onChange={(v) => set("modules", v)} label={(v) => t(`admin.qr.shapes.${v}`)} />
          </Row>
          <Row label={t("admin.qr.eyeShape")}>
            <SegmentedControl name={t("admin.qr.eyeShape")} value={style.eyes} options={EYE_SHAPES} onChange={(v) => set("eyes", v)} label={(v) => t(`admin.qr.shapes.${v}`)} />
          </Row>
        </div>

        <Row label={`${t("admin.qr.margin")}: ${style.margin}`}>
          <input type="range" min={0} max={8} value={style.margin} onChange={(e) => set("margin", Number(e.target.value))} aria-label={t("admin.qr.margin")} className="w-full accent-ink" />
        </Row>

        <Row label={t("admin.qr.logo")} hint={t("admin.qr.logoHint")}>
          <QrLogoField
            eventId={event.id}
            slug={event.slug}
            logoVersion={logoVersion}
            onError={setError}
            onChange={(version) => {
              setLogoVersion(version);
              if (version !== null) set("logo", true);
            }}
          />
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
                  className="w-full accent-ink"
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

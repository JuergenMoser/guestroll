"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Card, CardTitle, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";

type FormState = {
  name: string;
  description: string;
  eventDate: string;
  accentColor: string;
  accessCode: string;
  removeCode: boolean;
  uploadsOpen: boolean;
  uploadsCloseAt: string;
  galleryVisibility: "private" | "guests";
  guestDownload: boolean;
  moderation: "post" | "pre";
  captureMode: "camera" | "picker" | "both";
  askGuestName: boolean;
  maxPhotosPerGuest: number;
};

// <input type="datetime-local"> works in local time without a zone suffix.
function toLocalInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialState(event?: AdminEvent): FormState {
  return {
    name: event?.name ?? "",
    description: event?.description ?? "",
    eventDate: event?.eventDate ?? "",
    accentColor: event?.accentColor ?? "#f59e0b",
    accessCode: "",
    removeCode: false,
    uploadsOpen: event?.uploadsOpen ?? true,
    uploadsCloseAt: toLocalInput(event?.uploadsCloseAt ?? null),
    galleryVisibility: event?.galleryVisibility ?? "private",
    guestDownload: event?.guestDownload ?? false,
    moderation: event?.moderation ?? "post",
    captureMode: event?.captureMode ?? "camera",
    askGuestName: event?.askGuestName ?? true,
    maxPhotosPerGuest: event?.maxPhotosPerGuest ?? 0,
  };
}

export function EventForm({ event }: { event?: AdminEvent }) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(event));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(undefined);

    const { accessCode, removeCode, uploadsCloseAt, eventDate, ...rest } = form;
    const body: Record<string, unknown> = {
      ...rest,
      eventDate: eventDate || null,
      uploadsCloseAt: uploadsCloseAt ? new Date(uploadsCloseAt).getTime() : null,
    };
    if (removeCode) body.accessCode = null;
    else if (accessCode) body.accessCode = accessCode;

    try {
      if (event) {
        await api(`/api/admin/events/${event.id}`, { method: "PATCH", body });
        setForm((f) => ({ ...f, accessCode: "", removeCode: false }));
        setMessage({ ok: true, text: t("common.saved") });
        router.refresh();
      } else {
        const { event: created } = await api<{ event: AdminEvent }>("/api/admin/events", { body });
        router.push(`/admin/events/${created.id}?tab=share`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setMessage({ ok: false, text: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(false);
    }
  }

  const hasCode = event?.hasAccessCode && !form.removeCode;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-5">
        <Field label={t("admin.form.name")} error={errors.name}>
          {(id) => <Input id={id} value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />}
        </Field>
        <Field label={t("admin.form.description")} hint={t("admin.form.descriptionHint")} error={errors.description}>
          {(id) => <Textarea id={id} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("admin.form.date")} error={errors.eventDate}>
            {(id) => <Input id={id} type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} />}
          </Field>
          <Field label={t("admin.form.color")} error={errors.accentColor}>
            {(id) => (
              <div className="flex gap-2">
                <input
                  id={id}
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl bg-ink-900 p-1 ring-1 ring-ink-700"
                />
                <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="font-mono" aria-label={t("admin.form.color")} />
              </div>
            )}
          </Field>
        </div>
      </Card>

      <Card className="space-y-5">
        <CardTitle>{t("admin.form.accessCode")}</CardTitle>
        <Field label={t("admin.form.accessCode")} hint={hasCode ? t("admin.form.accessCodeSet") : t("admin.form.accessCodeHint")} error={errors.accessCode}>
          {(id, describedBy) => (
            <div className="flex gap-2">
              <Input
                id={id}
                aria-describedby={describedBy}
                value={form.accessCode}
                onChange={(e) => set("accessCode", e.target.value)}
                autoComplete="off"
                minLength={6}
                maxLength={64}
                placeholder={hasCode ? "••••••" : ""}
                className="font-mono"
              />
              {hasCode && (
                <Button variant="secondary" onClick={() => set("removeCode", true)}>
                  {t("admin.form.removeCode")}
                </Button>
              )}
            </div>
          )}
        </Field>
      </Card>

      <Card className="space-y-5">
        <Switch label={t("admin.form.uploadsOpen")} checked={form.uploadsOpen} onChange={(v) => set("uploadsOpen", v)} />
        <Field label={t("admin.form.uploadsCloseAt")} error={errors.uploadsCloseAt}>
          {(id) => <Input id={id} type="datetime-local" value={form.uploadsCloseAt} onChange={(e) => set("uploadsCloseAt", e.target.value)} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("admin.form.captureMode")}>
            {(id) => (
              <Select id={id} value={form.captureMode} onChange={(e) => set("captureMode", e.target.value as FormState["captureMode"])}>
                {(["camera", "both", "picker"] as const).map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`admin.form.captureModes.${mode}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("admin.form.maxPhotos")} hint={t("admin.form.maxPhotosHint")} error={errors.maxPhotosPerGuest}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={10000}
                value={form.maxPhotosPerGuest}
                onChange={(e) => set("maxPhotosPerGuest", Number(e.target.value) || 0)}
              />
            )}
          </Field>
        </div>
        <Switch label={t("admin.form.askGuestName")} checked={form.askGuestName} onChange={(v) => set("askGuestName", v)} />
      </Card>

      <Card className="space-y-5">
        <Field label={t("admin.form.gallery")}>
          {(id) => (
            <Select id={id} value={form.galleryVisibility} onChange={(e) => set("galleryVisibility", e.target.value as FormState["galleryVisibility"])}>
              <option value="private">{t("admin.form.galleryModes.private")}</option>
              <option value="guests">{t("admin.form.galleryModes.guests")}</option>
            </Select>
          )}
        </Field>
        <Field label={t("admin.form.moderation")}>
          {(id) => (
            <Select id={id} value={form.moderation} onChange={(e) => set("moderation", e.target.value as FormState["moderation"])}>
              <option value="post">{t("admin.form.moderationModes.post")}</option>
              <option value="pre">{t("admin.form.moderationModes.pre")}</option>
            </Select>
          )}
        </Field>
        <Switch
          label={t("admin.form.guestDownload")}
          checked={form.guestDownload}
          onChange={(v) => set("guestDownload", v)}
          disabled={form.galleryVisibility === "private"}
        />
      </Card>

      <div className="flex items-center justify-end gap-3">
        {message && (
          <p role="status" className={message.ok ? "text-sm text-ok" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}
        <Button type="submit" loading={busy}>
          {event ? t("common.save") : t("admin.form.create")}
        </Button>
      </div>
    </form>
  );
}

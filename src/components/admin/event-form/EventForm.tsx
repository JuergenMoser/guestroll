"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, StatusMessage } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";
import { AccessSection } from "./AccessSection";
import { AfterSection } from "./AfterSection";
import { DetailsSection } from "./DetailsSection";
import { GuestsSection } from "./GuestsSection";
import { initialState, toRequestBody, type SetField } from "./state";
import { UploadsSection } from "./UploadsSection";

/** Creates an event, or edits one when `event` is given. */
export function EventForm({ event }: { event?: AdminEvent }) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(event));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const sectionProps = { form, set, errors };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    try {
      if (event) {
        await api(`/api/admin/events/${event.id}`, { method: "PATCH", body: toRequestBody(form) });
        setForm((f) => ({ ...f, accessCode: "", removeCode: false }));
        setMessage({ ok: true, text: t("common.saved") });
        router.refresh();
      } else {
        const { event: created } = await api<{ event: AdminEvent }>("/api/admin/events", { body: toRequestBody(form) });
        router.push(`/admin/events/${created.id}?tab=share`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setMessage({ ok: false, text: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <DetailsSection {...sectionProps} />
      <AccessSection {...sectionProps} hasCode={Boolean(event?.hasAccessCode) && !form.removeCode} />
      <UploadsSection {...sectionProps} />
      <GuestsSection {...sectionProps} />
      <AfterSection {...sectionProps} />
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm">
        <StatusMessage message={message} />
        <Button type="submit" loading={busy}>
          {event ? t("common.save") : t("admin.form.create")}
        </Button>
      </div>
    </form>
  );
}

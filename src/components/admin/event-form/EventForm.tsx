"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, StatusMessage } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import type { AdminEvent } from "@/lib/events";
import { errorText } from "@/lib/i18n/errors";
import { AccessSection } from "./AccessSection";
import { AfterSection } from "./AfterSection";
import { ChallengesSection } from "./ChallengesSection";
import { DetailsSection } from "./DetailsSection";
import { GuestbookSection } from "./GuestbookSection";
import { GuestsSection } from "./GuestsSection";
import { LookSection } from "./LookSection";
import { initialState, toRequestBody, type SetField } from "./state";
import { UploadsSection } from "./UploadsSection";

/** Creates an event, or edits one when `event` is given. */
export function EventForm({ event }: { event?: AdminEvent }) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(event));
  // What's saved: the bar shows, and leaving warns, only when the form differs from it.
  const [saved, setSaved] = useState(form);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  const set: SetField = (key, value) => {
    setMessage(undefined);
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => {
    if (!dirty || !event) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, event]);

  // "Saved" stays a moment, then the bar steps aside.
  useEffect(() => {
    if (!message?.ok) return;
    const timer = setTimeout(() => setMessage(undefined), 3_000);
    return () => clearTimeout(timer);
  }, [message]);
  const sectionProps = { form, set, errors };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    try {
      if (event) {
        await api(`/api/admin/events/${event.id}`, { method: "PATCH", body: toRequestBody(form) });
        const next = { ...form, accessCode: "", removeCode: false };
        setForm(next);
        setSaved(next);
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
      <LookSection {...sectionProps} />
      <GuestsSection {...sectionProps} />
      <ChallengesSection {...sectionProps} />
      <GuestbookSection {...sectionProps} />
      <AfterSection {...sectionProps} />
      {(!event || dirty || message) && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm md:mx-0 md:mb-4 md:rounded-xl md:border md:shadow-lg">
          {event && dirty && (
            <p className="mr-auto flex items-center gap-2 text-sm font-medium">
              <span className="size-2 rounded-full bg-accent" aria-hidden />
              {t("admin.form.unsaved")}
            </p>
          )}
          <StatusMessage message={message} />
          {event && dirty && (
            <Button
              variant="ghost"
              onClick={() => {
                setForm(saved);
                setErrors({});
                setMessage(undefined);
              }}
            >
              {t("admin.form.discard")}
            </Button>
          )}
          {(!event || dirty) && (
            <Button type="submit" loading={busy}>
              {event ? t("common.save") : t("admin.form.create")}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}

"use client";

import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

/** Opt-in: the guest leaves an address to get the album's link when the event ends. */
export function GuestContactCard({ slug, initialEmail }: { slug: string; initialEmail: string | null }) {
  const t = useT();
  const [saved, setSaved] = useState(initialEmail);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ email: string }>(`/api/e/${slug}/contact`, { body: { email } });
      setSaved(res.email);
      setEmail("");
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    await api(`/api/e/${slug}/contact`, { method: "DELETE" }).catch(() => {});
    setSaved(null);
    setBusy(false);
  }

  return (
    <section className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-line">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Mail className="size-5 shrink-0" aria-hidden />
        {t("guest.contactTitle")}
      </h2>
      {saved ? (
        <div className="space-y-2">
          <p className="text-[15px] text-ink-soft">{t("guest.contactSaved", { email: saved })}</p>
          <Button size="sm" variant="ghost" onClick={remove} loading={busy}>
            {t("guest.contactRemove")}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <p className="text-[15px] text-pretty text-ink-soft">{t("guest.contactHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("guest.contactPlaceholder")}
              aria-label={t("guest.contactTitle")}
              className="min-w-0 flex-1 basis-48"
            />
            <Button type="submit" loading={busy}>
              {t("guest.contactSubmit")}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
      <p className="text-xs text-ink-muted">{t("guest.contactPrivacy")}</p>
    </section>
  );
}

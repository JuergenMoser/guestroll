"use client";

import { Plug, Unplug } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input, StatusMessage, Switch } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";
import { SettingsSection } from "./settings/SettingsSection";

interface Form {
  url: string;
  user: string;
  password: string;
  folder: string;
  autoExport: boolean;
}

const EMPTY: Form = { url: "", user: "", password: "", folder: "Guestroll", autoExport: false };

/** The WebDAV server albums are sent to (Nextcloud and the like). */
export function CloudSettings() {
  const t = useT();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<{ hasPassword: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);

  const load = useCallback(
    () =>
      api<{ cloud: (Omit<Form, "password"> & { hasPassword: boolean }) | null }>("/api/admin/cloud")
        .then(({ cloud }) => {
          setSaved(cloud ? { hasPassword: cloud.hasPassword } : null);
          setForm(cloud ? { url: cloud.url, user: cloud.user, password: "", folder: cloud.folder, autoExport: cloud.autoExport } : EMPTY);
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const fieldError = (key: string) =>
    errors[key] ? t(key === "password" ? "admin.mail.passwordAgain" : key === "url" ? "admin.cloud.urlInvalid" : "errors.invalidField") : undefined;

  async function run(kind: "save" | "test", e?: FormEvent) {
    e?.preventDefault();
    setBusy(kind);
    setErrors({});
    setMessage(undefined);
    try {
      if (kind === "save") {
        await api("/api/admin/cloud", { method: "PUT", body: form });
        setMessage({ ok: true, text: t("common.saved") });
        await load();
      } else {
        const res = await api<{ ok: boolean; message?: string }>("/api/admin/cloud/test", { body: form });
        setMessage(res.ok ? { ok: true, text: t("admin.cloud.testOk") } : { ok: false, text: t("admin.cloud.testFailed", { message: res.message ?? "" }) });
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setMessage({ ok: false, text: errorText(t, err instanceof ApiError ? err.code : undefined) });
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("clear");
    await api("/api/admin/cloud", { method: "DELETE" }).catch(() => {});
    setMessage(undefined);
    await load();
    setBusy(null);
  }

  return (
    <SettingsSection id="cloud" title={t("admin.cloud.title")} description={t("admin.cloud.hint")}>
      <form onSubmit={(e) => run("save", e)} className="space-y-4">
        <Field label={t("admin.cloud.url")} hint={t("admin.cloud.urlHint")} error={fieldError("url")}>
          {(id, describedBy) => (
            <Input id={id} aria-describedby={describedBy} value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://cloud.example.com/remote.php/dav/files/lea/" autoComplete="off" />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.mail.user")} error={fieldError("user")}>
            {(id) => <Input id={id} value={form.user} onChange={(e) => set("user", e.target.value)} autoComplete="off" />}
          </Field>
          <Field label={t("admin.cloud.password")} hint={saved?.hasPassword ? t("admin.mail.passwordKept") : t("admin.cloud.passwordHint")} error={fieldError("password")}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={saved?.hasPassword ? "••••••••" : ""} autoComplete="new-password" />
            )}
          </Field>
        </div>
        <Field label={t("admin.cloud.folder")} hint={t("admin.cloud.folderHint")} error={fieldError("folder")}>
          {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.folder} onChange={(e) => set("folder", e.target.value)} />}
        </Field>
        <Switch label={t("admin.cloud.autoExport")} checked={form.autoExport} onChange={(v) => set("autoExport", v)} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusMessage message={message} />
          {saved && (
            <Button variant="ghost" onClick={clear} loading={busy === "clear"}>
              <Unplug className="size-4" aria-hidden />
              {t("admin.cloud.disconnect")}
            </Button>
          )}
          <Button variant="secondary" onClick={() => run("test")} loading={busy === "test"} disabled={!form.url || !form.user}>
            <Plug className="size-4" aria-hidden />
            {t("admin.cloud.test")}
          </Button>
          <Button type="submit" loading={busy === "save"}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

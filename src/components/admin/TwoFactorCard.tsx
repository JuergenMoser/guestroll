"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, Card, CardTitle, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { CopyField } from "./CopyField";

type Status = { enabled: boolean; recoveryCodesLeft: number };

/** Sets up, shows and turns off two-step verification for the signed-in account. */
export function TwoFactorCard() {
  const t = useT();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<Status>("/api/admin/me/two-factor").then(setStatus).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError && err.details?.password ? t("admin.twoFactor.wrongPassword") : t("admin.twoFactor.wrongCode"));
    } finally {
      setBusy(false);
    }
  }

  const [starting, setStarting] = useState(false);
  const start = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      setSetup(await api<{ secret: string; qr: string }>("/api/admin/me/two-factor", { body: { action: "start", password } }));
      setPassword("");
      setStarting(false);
    });
  };
  const confirm = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const res = await api<{ recoveryCodes: string[] }>("/api/admin/me/two-factor", { body: { action: "confirm", code } });
      setCodes(res.recoveryCodes);
      setSetup(null);
      setCode("");
      await load();
    });
  };
  const disable = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await api("/api/admin/me/two-factor", { method: "DELETE", body: { password, code } });
      setDisabling(false);
      setPassword("");
      setCode("");
      setCodes(null);
      await load();
    });
  };
  const newCodes = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      setCodes((await api<{ recoveryCodes: string[] }>("/api/admin/me/two-factor", { body: { action: "recovery", code, password } })).recoveryCodes);
      setCode("");
      setPassword("");
      await load();
    });
  };

  if (!status) return null;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden />
            {t("admin.twoFactor.title")}
          </CardTitle>
          <p className="max-w-prose text-sm text-ink-muted">{t("admin.twoFactor.hint")}</p>
        </div>
        {status.enabled ? <Badge tone="ok">{t("admin.twoFactor.on")}</Badge> : <Badge>{t("admin.twoFactor.off")}</Badge>}
      </div>

      {codes && (
        <div role="status" className="space-y-3 rounded-lg bg-sunken p-4">
          <p className="text-sm font-medium">{t("admin.twoFactor.codesOnce")}</p>
          <ul role="list" className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[15px] tabular-nums sm:grid-cols-5">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <CopyField value={codes.join("\n")} />
        </div>
      )}

      {!status.enabled && !setup && !starting && <Button onClick={() => setStarting(true)}>{t("admin.twoFactor.setUp")}</Button>}

      {starting && (
        <form onSubmit={start} className="flex flex-wrap items-end gap-3">
          <Field label={t("admin.twoFactor.confirmPassword")} error={error}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required autoFocus />
            )}
          </Field>
          <Button type="submit" loading={busy}>
            {t("admin.twoFactor.continue")}
          </Button>
          <Button variant="ghost" onClick={() => setStarting(false)}>
            {t("common.cancel")}
          </Button>
        </form>
      )}

      {setup && (
        <form onSubmit={confirm} className="grid gap-5 rounded-lg p-4 ring-1 ring-line sm:grid-cols-[12rem_1fr]">
          {/* The QR code comes from our own server: no third party ever sees the secret. */}
          <div role="img" aria-label={t("admin.twoFactor.qrAlt")} className="w-48 rounded-lg bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: setup.qr }} />
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">{t("admin.twoFactor.scan")}</p>
            <div className="space-y-1">
              <p className="text-xs text-ink-muted">{t("admin.twoFactor.manual")}</p>
              <CopyField value={setup.secret.match(/.{1,4}/g)!.join(" ")} />
            </div>
            <Field label={t("admin.twoFactor.code")} error={error}>
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="max-w-40 tracking-[0.3em] tabular-nums" required />
              )}
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>
                {t("admin.twoFactor.turnOn")}
              </Button>
              <Button variant="ghost" onClick={() => setSetup(null)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </form>
      )}

      {status.enabled && !disabling && (
        <div className="flex flex-wrap items-end gap-3">
          <p className="flex-1 text-sm text-ink-muted">{t("admin.twoFactor.codesLeft", { n: status.recoveryCodesLeft })}</p>
          <form onSubmit={newCodes} className="flex flex-wrap items-end gap-2">
            <Field label={t("admin.password")}>
              {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-44" required />}
            </Field>
            <Field label={t("admin.twoFactor.code")}>
              {(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={7} className="w-32 tabular-nums" required />}
            </Field>
            <Button type="submit" variant="secondary" loading={busy}>
              {t("admin.twoFactor.newCodes")}
            </Button>
          </form>
          <Button variant="ghost" onClick={() => setDisabling(true)}>
            {t("admin.twoFactor.turnOff")}
          </Button>
          {error && !disabling && <p className="w-full text-sm text-danger">{error}</p>}
        </div>
      )}

      {disabling && (
        <form onSubmit={disable} className="grid gap-4 rounded-lg p-4 ring-1 ring-line sm:grid-cols-2">
          <Field label={t("admin.password")}>
            {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />}
          </Field>
          <Field label={t("admin.twoFactor.codeOrRecovery")} error={error}>
            {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" required />}
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="danger" loading={busy}>
              {t("admin.twoFactor.turnOff")}
            </Button>
            <Button variant="ghost" onClick={() => setDisabling(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

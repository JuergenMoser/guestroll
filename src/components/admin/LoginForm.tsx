"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/client/api";
import { errorText } from "@/lib/i18n/errors";

/** Username and password, then a code from the authenticator app when the account has one. */
export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function done() {
    router.replace("/admin");
    router.refresh();
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ ok: boolean; codeRequired?: boolean }>("/api/admin/login", { body: { username, password } });
      if (res.codeRequired) {
        setStep("code");
        setBusy(false);
        return;
      }
      done();
    } catch (err) {
      setError(errorText(t, err instanceof ApiError ? err.code : undefined));
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/api/admin/login/code", { body: { code } });
      done();
    } catch (err) {
      if (err instanceof ApiError && err.details?.code === "expired") {
        setStep("password");
        setError(t("admin.twoFactor.expired"));
      } else setError(err instanceof ApiError && err.code === "rate_limited" ? errorText(t, err.code) : t("admin.twoFactor.wrongCode"));
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="space-y-5">
        <p className="text-[15px] text-ink-soft">{t(recovery ? "admin.twoFactor.recoveryHint" : "admin.twoFactor.codeHint")}</p>
        <Field label={t(recovery ? "admin.twoFactor.recoveryCode" : "admin.twoFactor.code")} error={error}>
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode={recovery ? "text" : "numeric"}
              autoComplete="one-time-code"
              pattern={recovery ? undefined : "[0-9 ]{6,7}"}
              maxLength={recovery ? 12 : 7}
              className="text-lg tracking-[0.3em] tabular-nums"
              required
              autoFocus
            />
          )}
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          {t("admin.signIn")}
        </Button>
        <button
          type="button"
          onClick={() => {
            setRecovery(!recovery);
            setCode("");
            setError(undefined);
          }}
          className="w-full text-center text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          {t(recovery ? "admin.twoFactor.useApp" : "admin.twoFactor.useRecovery")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="space-y-5">
      <Field label={t("admin.username")}>
        {(id) => (
          <Input id={id} autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />
        )}
      </Field>
      <Field label={t("admin.password")} error={error}>
        {(id, describedBy) => (
          <Input id={id} type="password" aria-describedby={describedBy} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        )}
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        {t("admin.signIn")}
      </Button>
    </form>
  );
}

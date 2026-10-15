"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, Card, CardTitle, Field, Input } from "@/components/ui";
import { api } from "@/lib/client/api";

/** Typing the name is the confirmation: deleting removes every photo from disk. */
export function DeleteEvent({ eventId, name }: { eventId: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    await api(`/api/admin/events/${eventId}`, { method: "DELETE" }).catch(() => {});
    router.replace("/admin/events");
    router.refresh();
  }

  return (
    <Card className="space-y-4 ring-danger/30">
      <CardTitle className="text-danger">{t("admin.form.dangerZone")}</CardTitle>
      <Field label={t("admin.form.deleteConfirm")}>
        {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoComplete="off" />}
      </Field>
      <Button variant="danger" disabled={typed !== name} loading={busy} onClick={remove}>
        {t("admin.form.deleteEvent")}
      </Button>
    </Card>
  );
}

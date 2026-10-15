"use client";

import { Printer } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";

export function PrintButton() {
  const t = useT();
  return (
    <Button onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {t("admin.poster.print")}
    </Button>
  );
}

"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";

export function CopyField({ value }: { value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-950 p-1.5 pl-3 ring-1 ring-ink-700">
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink-300">{value}</code>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? t("common.copied") : t("common.copy")}
      </Button>
    </div>
  );
}

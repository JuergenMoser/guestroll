"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";

/**
 * Server components can't set cookies, so joining an open event takes one
 * request from the browser right after the first render.
 */
export function AutoJoin({ slug }: { slug: string }) {
  const t = useT();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/e/${slug}/join`, { method: "POST" })
      .then((res) => (res.ok ? router.refresh() : setFailed(true)))
      .catch(() => setFailed(true));
  }, [router, slug]);

  return (
    <div className="flex justify-center py-16" aria-live="polite">
      {failed ? (
        <Button variant="secondary" onClick={() => location.reload()}>
          {t("common.retry")}
        </Button>
      ) : (
        <span className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-label={t("common.loading")} />
      )}
    </div>
  );
}

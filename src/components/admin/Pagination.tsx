import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClass, cn } from "@/components/ui";
import type { Translate } from "@/lib/i18n/translate";

/** Plain links, so paging works before the page's script has loaded. */
export function Pagination({ t, page, pageCount, total, perPage, href }: { t: Translate; page: number; pageCount: number; total: number; perPage: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const link = (target: number, label: string, icon: React.ReactNode, after = false) =>
    target < 1 || target > pageCount ? (
      <span className={cn(buttonClass("secondary", "sm"), "pointer-events-none opacity-40")} aria-disabled>
        {!after && icon}
        {label}
        {after && icon}
      </span>
    ) : (
      <Link href={href(target)} rel={target < page ? "prev" : "next"} className={buttonClass("secondary", "sm")} scroll={false}>
        {!after && icon}
        {label}
        {after && icon}
      </Link>
    );
  return (
    <nav aria-label={t("admin.eventList.pages")} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm tabular-nums text-ink-muted">{t("admin.eventList.range", { from, to, total })}</p>
      <div className="flex items-center gap-2">
        {link(page - 1, t("admin.eventList.previous"), <ChevronLeft className="size-4" aria-hidden />)}
        <span className="px-1 text-sm tabular-nums text-ink-soft">{t("admin.eventList.page", { page, pageCount })}</span>
        {link(page + 1, t("admin.eventList.next"), <ChevronRight className="size-4" aria-hidden />, true)}
      </div>
    </nav>
  );
}

"use client";

import { CalendarDays, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Locale } from "@/lib/constants";
import type { Theme } from "@/lib/theme/theme";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { api } from "@/lib/client/api";

export function AdminNav({ appName, locale, theme, account }: { appName: string; locale: Locale; theme: Theme; account: { name: string; role: "owner" | "organizer" } }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard, active: pathname === "/admin" },
    { href: "/admin/events", label: t("admin.events"), icon: CalendarDays, active: pathname.startsWith("/admin/events") },
    { href: "/admin/settings", label: t("admin.settings"), icon: Settings, active: pathname.startsWith("/admin/settings") },
  ];

  async function signOut() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/admin" className="mr-2 sm:mr-4">
          <Brand name={appName} compact />
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[15px] transition-colors",
                active ? "bg-sunken font-medium text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        {/* On phones these live in Settings: the bar keeps its room for navigation. */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguagePicker current={locale} />
          <ThemeToggle initial={theme} />
        </div>
        <span className="hidden max-w-40 truncate text-sm text-ink-muted lg:inline" title={t(`admin.accounts.roles.${account.role}`)}>
          {account.name}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[15px] text-ink-muted hover:text-ink"
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("admin.signOut")}</span>
        </button>
      </div>
    </header>
  );
}

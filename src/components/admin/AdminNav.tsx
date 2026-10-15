"use client";

import { Aperture, CalendarDays, LayoutDashboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { api } from "@/lib/client/api";

export function AdminNav({ appName }: { appName: string }) {
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
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/admin" className="mr-4 flex items-center gap-2 font-semibold tracking-tight">
          <Aperture className="size-5 text-accent" aria-hidden />
          <span className="hidden sm:inline">{appName}</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm transition",
                active ? "bg-ink-800 text-paper" : "text-ink-400 hover:text-paper",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-ink-400 hover:text-paper"
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("admin.signOut")}</span>
        </button>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { todayLocalDate } from "@/lib/dates";
import { cn } from "@/lib/cn";

export function Nav({ dayStartHour }: { dayStartHour: number }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  const today = todayLocalDate(dayStartHour);
  const items = [
    { href: `/day/${today}`, label: t("day"), match: "/day" },
    { href: "/schedule", label: t("schedule"), match: "/schedule" },
    { href: "/tasks", label: t("taskTypes"), match: "/tasks" },
    { href: "/settings", label: t("settings"), match: "/settings" },
  ];

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-4">
        <span className="me-2 text-sm font-semibold tracking-tight">Tasker</span>
        <nav className="flex flex-1 items-center gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.match);
            return (
              <Link
                key={item.match}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          {t("signOut")}
        </button>
      </div>
    </header>
  );
}

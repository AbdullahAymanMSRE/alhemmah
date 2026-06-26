"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { todayLocalDate } from "@/lib/dates";
import type { Locale } from "@/i18n/routing";

/**
 * Computes the user's local "today" (honoring day-start hour) and routes to it.
 * When a `locale` is given (the user's saved preference), the redirect carries it
 * so a logged-in visitor lands in their own language regardless of the URL they hit.
 */
export function TodayRedirect({
  dayStartHour,
  locale,
}: {
  dayStartHour: number;
  locale?: Locale;
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/day/${todayLocalDate(dayStartHour)}`, { locale });
  }, [router, dayStartHour, locale]);
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span
        dir="rtl"
        className="logo-loading font-[family-name:var(--font-logo)] text-6xl leading-none"
      >
        الهمّة
      </span>
    </div>
  );
}

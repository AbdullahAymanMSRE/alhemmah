"use client";

import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { addDays, todayLocalDate } from "@/lib/dates";

/**
 * Date navigation for the day page: prev / next / today and a date picker. Kept
 * separate from the day's content and rendered outside its Suspense boundary, so
 * stepping days swaps only the task list, not these controls.
 */
export function DayHeader({
  date,
  dayStartHour,
}: {
  date: string;
  dayStartHour: number;
}) {
  const t = useTranslations("day");
  const locale = useLocale();
  const router = useRouter();

  const intlLocale = locale === "ar" ? "ar" : "en";
  const today = todayLocalDate(dayStartHour);
  const isToday = date === today;

  const formattedDate = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));

  // Label relative to today ("Today", "Yesterday", "2 days ago", "In 3 days"…).
  const diffDays = Math.round(
    (new Date(`${date}T12:00:00`).getTime() -
      new Date(`${today}T12:00:00`).getTime()) /
      86_400_000,
  );
  const relativeLabel = capitalize(
    new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" }).format(
      diffDays,
      "day",
    ),
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <button
          onClick={() => router.push(`/day/${addDays(date, -1)}`)}
          className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
          aria-label={t("previousDay")}
        >
          ‹
        </button>

        <div className="flex flex-col items-center">
          <span className="auto-dir text-sm font-semibold">{formattedDate}</span>
          {isToday ? (
            <span className="text-xs text-accent">{relativeLabel}</span>
          ) : (
            <button
              onClick={() => router.push(`/day/${today}`)}
              className="text-xs text-accent hover:underline"
              title={t("goToToday")}
            >
              {relativeLabel}
            </button>
          )}
        </div>

        <button
          onClick={() => router.push(`/day/${addDays(date, 1)}`)}
          className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
          aria-label={t("nextDay")}
        >
          ›
        </button>
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && router.push(`/day/${e.target.value}`)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-muted outline-none focus:border-border-strong"
        aria-label={t("pickDate")}
      />
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

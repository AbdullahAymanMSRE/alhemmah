"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SortableList } from "@/components/SortableList";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { CheckIcon, GripIcon, TrashIcon } from "@/components/icons";
import { addDays, todayLocalDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import {
  deleteDayBlock,
  reorderDayBlocks,
  toggleDayBlock,
} from "@/server/actions";

type Block = {
  id: string;
  kind: "work" | "break";
  label: string;
  durationHours: number;
  done: boolean;
  isAdhoc: boolean;
};

export function DayView({
  date,
  recordId,
  dayStartHour,
  suggestions,
  blocks,
}: {
  date: string;
  recordId: string;
  dayStartHour: number;
  suggestions: string[];
  blocks: Block[];
}) {
  const t = useTranslations("day");
  const locale = useLocale();
  const router = useRouter();
  const [, start] = useTransition();
  const [items, setItems] = useState(blocks);
  const [adding, setAdding] = useState(false);

  const sig = useMemo(
    () => JSON.stringify(blocks.map((b) => [b.id, b.done, b.durationHours, b.label])),
    [blocks],
  );
  useEffect(() => {
    setItems(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const today = todayLocalDate(dayStartHour);
  const isToday = date === today;

  const intlLocale = locale === "ar" ? "ar" : "en";
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

  // Summary over work blocks only (breaks aren't tasks).
  const work = items.filter((b) => b.kind === "work");
  const totalH = round(work.reduce((s, b) => s + b.durationHours, 0));
  const doneH = round(
    work.filter((b) => b.done).reduce((s, b) => s + b.durationHours, 0),
  );
  const perType = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const b of work) {
      const key = b.label || "—";
      const cur = map.get(key) ?? { done: 0, total: 0 };
      cur.total += b.durationHours;
      if (b.done) cur.done += b.durationHours;
      map.set(key, cur);
    }
    return [...map.entries()];
  }, [work]);

  function toggle(id: string, done: boolean) {
    setItems((prev) => prev.map((b) => (b.id === id ? { ...b, done } : b)));
    start(async () => {
      await toggleDayBlock(id, done);
      router.refresh();
    });
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((b) => b.id !== id));
    start(async () => {
      await deleteDayBlock(id);
      router.refresh();
    });
  }
  function reorder(ids: string[]) {
    setItems((prev) => ids.map((id) => prev.find((b) => b.id === id)!));
    start(async () => {
      await reorderDayBlocks(recordId, ids);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Date navigation */}
      <div className="flex items-center justify-between gap-2">
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

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && router.push(`/day/${e.target.value}`)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-muted outline-none focus:border-border-strong"
            aria-label={t("pickDate")}
          />
          <button
            onClick={() => router.push(`/day/${addDays(date, 1)}`)}
            className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
            aria-label={t("nextDay")}
          >
            ›
          </button>
        </div>
      </div>

      {/* Summary */}
      {work.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-faint">
              {t("summary")}
            </span>
            <span className="text-sm tabular-nums text-muted">
              {t("doneOfTotal", { done: doneH, total: totalH })}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-success"
              style={{ width: `${totalH > 0 ? (doneH / totalH) * 100 : 0}%` }}
            />
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {perType.map(([label, v]) => (
              <li key={label} className="flex justify-between text-xs">
                <span className="auto-dir text-muted">{label}</span>
                <span className="tabular-nums text-faint">
                  {round(v.done)}/{round(v.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm">{t("empty")}</p>
          <p className="mt-1 text-xs text-faint">{t("emptyHint")}</p>
          <a
            href="/schedule"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            {t("setUpSchedule")}
          </a>
        </div>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          renderItem={(b, handle) => (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5",
                b.kind === "break"
                  ? "border-border bg-surface/60"
                  : "border-border bg-surface",
              )}
            >
              <button
                {...handle}
                className="cursor-grab touch-none rounded p-1 text-faint hover:text-muted active:cursor-grabbing"
                aria-label={t("reorderHint")}
              >
                <GripIcon />
              </button>

              {b.kind === "work" ? (
                <button
                  onClick={() => toggle(b.id, !b.done)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    b.done
                      ? "border-success bg-success text-accent-foreground"
                      : "border-border-strong text-transparent hover:border-muted",
                  )}
                  aria-pressed={b.done}
                >
                  <CheckIcon />
                </button>
              ) : (
                <span className="h-5 w-5 shrink-0" />
              )}

              <span
                className={cn(
                  "auto-dir flex-1 text-sm",
                  b.kind === "break" && "text-muted",
                  b.done && "text-faint line-through",
                )}
              >
                {b.kind === "break" ? b.label || t("break") : b.label}
              </span>

              <span className="shrink-0 text-xs tabular-nums text-faint">
                {b.durationHours}
              </span>

              <button
                onClick={() => remove(b.id)}
                className="rounded p-1.5 text-faint transition-colors hover:text-danger"
                aria-label="delete"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        />
      )}

      <button
        onClick={() => setAdding(true)}
        className="rounded-lg border border-dashed border-border-strong bg-surface/50 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        + {t("addTask")}
      </button>

      {adding && (
        <AddTaskDialog
          date={date}
          suggestions={suggestions}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SortableList } from "@/components/SortableList";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { BlockTimer } from "@/components/BlockTimer";
import { Tooltip } from "@/components/Tooltip";
import { CheckIcon, GripIcon, TrashIcon } from "@/components/icons";
import { todayLocalDate } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";
import { liveElapsed, targetSecondsOf, type TimerState } from "@/lib/timer";
import { cn } from "@/lib/cn";
import {
  deleteDayBlock,
  reorderDayBlocks,
  resetBlockTimer,
  resyncDayFromTemplate,
  setBlockTracked,
  settleDayTimers,
  startBlockTimer,
  stopBlockTimer,
  toggleDayBlock,
} from "@/server/actions";

type Block = {
  id: string;
  kind: "work" | "break";
  label: string;
  durationHours: number;
  done: boolean;
  isAdhoc: boolean;
  trackedSeconds: number;
  runningSince: number | null;
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
  const tc = useTranslations("common");
  const locale = useLocale();
  // Arabic puts a (non-breaking) space between number and unit: "5 س"; English is "5h".
  const unitGap = locale === "ar" ? " " : "";
  const units = { h: `${unitGap}${tc("hUnit")}`, m: `${unitGap}${tc("mUnit")}` };
  const router = useRouter();
  const [, start] = useTransition();
  const [items, setItems] = useState(blocks);
  const [adding, setAdding] = useState(false);

  const sig = useMemo(
    () =>
      JSON.stringify(
        blocks.map((b) => [
          b.id,
          b.done,
          b.durationHours,
          b.label,
          b.trackedSeconds,
          b.runningSince,
        ]),
      ),
    [blocks],
  );
  useEffect(() => {
    setItems(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const today = todayLocalDate(dayStartHour);
  const isToday = date === today;
  const isPast = date < today;

  // A today/future day that is still untouched should mirror the current Plan,
  // not a stale snapshot taken before the routine was finished. Run once per
  // record: if pristine, ask the server to re-sync from the Template. Past days
  // stay frozen. (The server re-checks "pristine" and "content changed".)
  const resyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (resyncedRef.current === recordId || isPast) return;
    const pristine = items.every(
      (b) => !b.done && !b.isAdhoc && b.trackedSeconds === 0 && b.runningSince === null,
    );
    if (!pristine) return;
    resyncedRef.current = recordId;
    start(async () => {
      const changed = await resyncDayFromTemplate(recordId);
      if (changed) router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, isPast]);

  // Live wall clock: ticks once a second only while a timer is running on today.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasRunning = items.some((b) => b.runningSince != null);
  useEffect(() => {
    if (!isToday || !hasRunning) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isToday, hasRunning]);

  // When the running block crosses its target, fire the notification and let the
  // server settle the hand-off / auto-done (ADR 0004). Guarded so each running
  // segment notifies at most once.
  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isToday) return;
    const running = items.find((b) => b.runningSince != null);
    if (!running) return;
    const target = targetSecondsOf(running.durationHours);
    const state: TimerState = {
      id: running.id,
      kind: running.kind,
      label: running.label,
      done: running.done,
      targetSeconds: target,
      trackedSeconds: running.trackedSeconds,
      runningSinceMs: running.runningSince,
    };
    if (running.done || liveElapsed(state, nowMs) < target) return;

    const key = `${running.id}:${running.runningSince}`;
    if (firedRef.current === key) return;
    firedRef.current = key;

    notify(
      running.kind === "break"
        ? t("notify.breakDone")
        : t("notify.workDone", { label: running.label }),
    );
    start(async () => {
      await settleDayTimers(recordId);
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs, sig, isToday]);

  // The 24h cap counts every block (work + breaks).
  const dayFull = items.reduce((s, b) => s + b.durationHours, 0) >= 24;

  // Summary over work blocks only (breaks aren't tasks).
  const work = items.filter((b) => b.kind === "work");
  const totalH = round(work.reduce((s, b) => s + b.durationHours, 0));
  const doneH = round(
    work.filter((b) => b.done).reduce((s, b) => s + b.durationHours, 0),
  );
  const perType = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const b of work) {
      const key = b.label || "-";
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

  function startTimer(id: string) {
    requestNotifyPermission();
    const at = Date.now();
    // Exclusive: fold any other running timer, then run this one (optimistic).
    setItems((prev) =>
      prev.map((b) => {
        if (b.id === id) return { ...b, runningSince: at };
        if (b.runningSince != null) {
          const elapsed = b.trackedSeconds + Math.max(0, (at - b.runningSince) / 1000);
          return { ...b, trackedSeconds: Math.round(elapsed), runningSince: null };
        }
        return b;
      }),
    );
    firedRef.current = null;
    start(async () => {
      await startBlockTimer(id);
      router.refresh();
    });
  }

  function stopTimer(id: string) {
    const at = Date.now();
    setItems((prev) =>
      prev.map((b) => {
        if (b.id !== id || b.runningSince == null) return b;
        const elapsed = b.trackedSeconds + Math.max(0, (at - b.runningSince) / 1000);
        return { ...b, trackedSeconds: Math.round(elapsed), runningSince: null };
      }),
    );
    start(async () => {
      await stopBlockTimer(id);
      router.refresh();
    });
  }

  function resetTimer(id: string) {
    setItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, trackedSeconds: 0, runningSince: null } : b)),
    );
    start(async () => {
      await resetBlockTimer(id);
      router.refresh();
    });
  }

  function setTracked(id: string, seconds: number) {
    setItems((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const done = b.done || seconds >= targetSecondsOf(b.durationHours);
        return { ...b, trackedSeconds: seconds, runningSince: null, done };
      }),
    );
    start(async () => {
      await setBlockTracked(id, seconds);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      {work.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-faint">
              {t("summary")}
            </span>
            <span className="text-sm tabular-nums text-muted">
              {t("doneOfTotal", {
                done: formatDuration(doneH, units),
                total: formatDuration(totalH, units),
              })}
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
                  {formatDuration(v.done, units)}/{formatDuration(v.total, units)}
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
          <Link
            href="/schedule"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            {t("setUpSchedule")}
          </Link>
        </div>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          renderItem={(b, handle) => (
            <div
              className={cn(
                "rounded-lg border p-2.5",
                b.kind === "break"
                  ? "border-border bg-surface/60"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex items-center gap-2">
                <Tooltip label={t("reorderHint")}>
                  <button
                    {...handle}
                    className="cursor-grab touch-none rounded p-1 text-faint hover:text-muted active:cursor-grabbing"
                    aria-label={t("reorderHint")}
                  >
                    <GripIcon />
                  </button>
                </Tooltip>

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
                  {formatDuration(b.durationHours, units)}
                </span>

                <Tooltip label={t("delete")}>
                  <button
                    onClick={() => remove(b.id)}
                    className="rounded p-1.5 text-faint transition-colors hover:text-danger"
                    aria-label={t("delete")}
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              </div>

              <BlockTimer
                block={b}
                nowMs={nowMs}
                isToday={isToday}
                units={units}
                onStart={() => startTimer(b.id)}
                onStop={() => stopTimer(b.id)}
                onReset={() => resetTimer(b.id)}
                onSetTracked={(secs) => setTracked(b.id, secs)}
              />
            </div>
          )}
        />
      )}

      {dayFull ? (
        <p className="rounded-lg border border-dashed border-border py-3 text-center text-xs text-faint">
          {tc("dayFull")}
        </p>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg border border-dashed border-border-strong bg-surface/50 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          + {t("addTask")}
        </button>
      )}

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

/** Ask for notification permission lazily, on the first Start press (ADR 0004). */
function requestNotifyPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

/** Best-effort "finished" ping; silently a no-op if unsupported or not granted. */
function notify(body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(body);
  } catch {
    /* ignore */
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

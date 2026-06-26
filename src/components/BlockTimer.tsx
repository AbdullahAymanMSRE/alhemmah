"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlayIcon, PauseIcon, PencilIcon, ResetIcon } from "@/components/icons";
import { Tooltip } from "@/components/Tooltip";
import { formatDuration } from "@/lib/duration";
import { liveElapsed, targetSecondsOf, type TimerState } from "@/lib/timer";
import { cn } from "@/lib/cn";

export type TimerBlock = {
  id: string;
  kind: "work" | "break";
  label: string;
  durationHours: number;
  done: boolean;
  trackedSeconds: number;
  runningSince: number | null;
};

/** Seconds as `H:MM:SS` (or `M:SS` under an hour), the live stopwatch readout. */
function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = String(sec).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

function asState(b: TimerBlock): TimerState {
  return {
    id: b.id,
    kind: b.kind,
    label: b.label,
    done: b.done,
    targetSeconds: targetSecondsOf(b.durationHours),
    trackedSeconds: b.trackedSeconds,
    runningSinceMs: b.runningSince,
  };
}

export function BlockTimer({
  block,
  nowMs,
  isToday,
  units,
  onStart,
  onStop,
  onReset,
  onSetTracked,
}: {
  block: TimerBlock;
  nowMs: number;
  isToday: boolean;
  units: { h: string; m: string };
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onSetTracked: (seconds: number) => void;
}) {
  const t = useTranslations("day");
  const [editing, setEditing] = useState(false);

  const target = targetSecondsOf(block.durationHours);
  const elapsed = liveElapsed(asState(block), nowMs);
  const running = block.runningSince != null;
  const overtime = Math.max(0, elapsed - target);
  const isOver = overtime > 0.5;
  const pct = target > 0 ? Math.min(100, (elapsed / target) * 100) : elapsed > 0 ? 100 : 0;

  // Past days carry no timer controls; hide the row entirely when nothing was tracked.
  if (!isToday && block.trackedSeconds === 0 && !running) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      {isToday && (
        <Tooltip label={running ? t("timer.pause") : t("timer.start")}>
          <button
            onClick={running ? onStop : onStart}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
              running
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-strong text-muted hover:text-foreground",
            )}
            aria-label={running ? t("timer.pause") : t("timer.start")}
          >
            {running ? <PauseIcon /> : <PlayIcon />}
          </button>
        </Tooltip>
      )}

      {editing ? (
        <TrackedEditor
          initialSeconds={Math.floor(elapsed)}
          onCancel={() => setEditing(false)}
          onSave={(secs) => {
            setEditing(false);
            onSetTracked(secs);
          }}
        />
      ) : (
        <>
          <div className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                isOver ? "text-danger" : running ? "text-foreground" : "text-muted",
              )}
            >
              {clock(elapsed)}
              <span className="text-faint"> / {clock(target)}</span>
            </span>
            {isOver && (
              <span className="shrink-0 rounded bg-danger/10 px-1 text-[10px] font-medium tabular-nums text-danger">
                +{formatDuration(overtime / 3600, units)}
              </span>
            )}
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full transition-[width] duration-500",
                  isOver ? "bg-danger" : block.done ? "bg-success" : "bg-accent",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {isToday && (
            <div className="flex shrink-0 items-center">
              <Tooltip label={t("timer.edit")}>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded p-1 text-faint transition-colors hover:text-foreground"
                  aria-label={t("timer.edit")}
                >
                  <PencilIcon />
                </button>
              </Tooltip>
              {(block.trackedSeconds > 0 || running) && (
                <Tooltip label={t("timer.reset")}>
                  <button
                    onClick={onReset}
                    className="rounded p-1 text-faint transition-colors hover:text-danger"
                    aria-label={t("timer.reset")}
                  >
                    <ResetIcon />
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Inline h/m editor for setting tracked time directly. */
function TrackedEditor({
  initialSeconds,
  onSave,
  onCancel,
}: {
  initialSeconds: number;
  onSave: (seconds: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("day");
  const tc = useTranslations("common");
  const total = Math.round(initialSeconds / 60);
  const [h, setH] = useState(String(Math.floor(total / 60)));
  const [m, setM] = useState(String(total % 60));

  const field =
    "h-7 w-10 rounded-md border border-border bg-surface-2 px-1.5 text-xs tabular-nums outline-none focus:border-border-strong";

  function save() {
    const minutes = Math.max(0, (Math.floor(Number(h) || 0)) * 60 + Math.floor(Number(m) || 0));
    onSave(minutes * 60);
  }

  return (
    <div className="flex flex-1 items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        maxLength={3}
        value={h}
        onChange={(e) => setH(e.target.value.replace(/\D/g, ""))}
        className={field}
        aria-label={`${t("timer.edit")}, ${tc("hUnit")}`}
        autoFocus
      />
      <span className="text-xs text-faint">{tc("hUnit")}</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={m}
        onChange={(e) => setM(e.target.value.replace(/\D/g, ""))}
        className={field}
        aria-label={`${t("timer.edit")}, ${tc("mUnit")}`}
      />
      <span className="text-xs text-faint">{tc("mUnit")}</span>
      <button
        onClick={save}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:border-border-strong"
      >
        {t("timer.save")}
      </button>
      <button
        onClick={onCancel}
        className="rounded-md px-1.5 py-1 text-xs text-faint hover:text-foreground"
      >
        {t("timer.cancel")}
      </button>
    </div>
  );
}

/**
 * Block-timer reconciliation (ADR 0004). A single pure function settles a day's
 * timers given the current wall-clock time, so the server (on load) and the
 * client (on a live target-crossing) always agree.
 *
 * Tracked time is in seconds; a block's target is its planned duration in hours
 * converted to seconds. At most one block runs at a time (`runningSinceMs` set).
 */

export type TimerState = {
  id: string;
  kind: "work" | "break";
  label: string;
  done: boolean;
  targetSeconds: number;
  trackedSeconds: number;
  runningSinceMs: number | null;
};

export function targetSecondsOf(durationHours: number): number {
  return Math.round(durationHours * 3600);
}

/** Live elapsed seconds on a block, including any time since it started running. */
export function liveElapsed(b: TimerState, nowMs: number): number {
  if (b.runningSinceMs == null) return b.trackedSeconds;
  return b.trackedSeconds + Math.max(0, (nowMs - b.runningSinceMs) / 1000);
}

function sameTask(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export type SettleResult = {
  changed: boolean;
  blocks: TimerState[];
  /** Blocks that newly crossed into `done` during this settle (for notifications). */
  completed: { id: string; kind: "work" | "break"; label: string }[];
};

/**
 * Advance the single running timer through any target-crossings:
 * - a work block at target is frozen at exactly its target and the running clock
 *   (plus its surplus) hands off to the next not-done same-task work block later
 *   in the day; breaks are skipped over and never a hand-off target;
 * - with no such block left, the timer keeps running in place as overtime;
 * - a break at target is marked done and runs in place as overtime (never hands off).
 *
 * Returns updated copies of every block plus the set that newly became done.
 */
export function settleTimers(input: TimerState[], nowMs: number): SettleResult {
  const blocks = input.map((b) => ({ ...b }));
  const completed: SettleResult["completed"] = [];
  let changed = false;

  let i = blocks.findIndex((b) => b.runningSinceMs != null);
  if (i === -1) return { changed: false, blocks, completed };

  // Bounded by the number of blocks: each hand-off strictly advances `i`.
  while (i >= 0 && i < blocks.length) {
    const b = blocks[i];
    const elapsed = liveElapsed(b, nowMs);
    if (elapsed < b.targetSeconds) break; // still running normally toward target

    if (!b.done) {
      b.done = true;
      completed.push({ id: b.id, kind: b.kind, label: b.label });
      changed = true;
    }

    // Breaks never hand off, they run over in place.
    if (b.kind === "break") break;

    const surplus = elapsed - b.targetSeconds;
    const j = blocks.findIndex(
      (n, idx) =>
        idx > i && n.kind === "work" && !n.done && sameTask(n.label, b.label),
    );
    if (j === -1) break; // no later same-task block, overtime in place

    // Freeze this block exactly at target; carry the surplus onto the next one.
    b.trackedSeconds = b.targetSeconds;
    b.runningSinceMs = null;
    const n = blocks[j];
    n.trackedSeconds = n.trackedSeconds + surplus;
    n.runningSinceMs = nowMs;
    changed = true;
    i = j;
  }

  return { changed, blocks, completed };
}

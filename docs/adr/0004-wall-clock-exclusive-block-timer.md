# 4. Block timer is wall-clock, exclusive, with best-effort notifications

Date: 2026-06-26

## Status

Accepted

## Context

Each Block carries a planned duration and a binary `done`. We added an optional **timer** that
accrues **tracked time** toward that planned duration (the timer's *target*), drives a per-block
progress bar, auto-marks `done` at target, and — for repeated tasks — hands the running clock off
to the next same-label Block so a split task times as one continuous session.

This collides with the app's founding principle (`CONTEXT.md`): "There are no clock times — only
durations and order." The timer is the one place real wall-clock time enters the model, so how it
behaves needed deciding deliberately.

## Decision

- **Wall-clock, not active-only.** Starting a timer persists a `running_since` timestamp on the
  Day Block; live elapsed = `tracked_seconds + (now − running_since)`. Time keeps accruing while
  the tab is closed, the device sleeps, or the app is reloaded. The alternative — counting only
  while the page is open and focused — silently loses time and defeats the point of tracking a
  real day.
- **Exclusive.** At most one Block's timer runs per day; starting one folds any other running
  timer's elapsed into its `tracked_seconds` and stops it. Two concurrent timers would
  double-count the same wall-clock minutes for one person living one timeline.
- **Reconciliation is authoritative on the server.** A pure `settleTimers(blocks, now)` function
  (`src/lib/timer.ts`) computes target-crossings, hand-offs, and overtime. It runs server-side on
  every day load (so reopening after a long absence settles correctly) and is re-run by a
  `settleDayTimers` action when the live client detects a crossing. Same logic both places.
- **Notifications are best-effort, in-app only.** The "finished" / "break over" notification fires
  via the browser Notification API while the app is open at the moment of crossing; permission is
  requested lazily on first Start, and timers work fully if it is denied. A truly background ping
  (target crossed while the tab is closed) would require a Service Worker push subscription —
  deliberately out of scope for a personal app. On reopening, the block is simply already done.

## Consequences

- Adds `tracked_seconds` (int) and `running_since` (timestamp, nullable) to `day_blocks`. Tracked
  time is stored in **seconds** for precision; planned durations remain decimal hours.
- A block's `tracked_seconds` may exceed its target — that is overtime (the last block of a task,
  or any break run over). The progress bar caps at 100%; the surplus shows in the numeric readout.
- Live timing exists on **today only**; past days are read-only. `running_since` is therefore only
  ever set on the current day, so settling a past day is a harmless no-op.
- `done` and the timer stay independent: a block can be ticked with no tracked time, and a manual
  edit of tracked time past target marks done but never notifies or hands off (those are
  live-timer events only).

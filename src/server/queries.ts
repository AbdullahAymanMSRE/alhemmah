import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  dayBlocks,
  dayRecords,
  templateBlocks,
  userSettings,
  type DayBlock,
} from "@/db/schema";
import { newId } from "@/lib/ids";
import { weekdayOf } from "@/lib/dates";
import { settleTimers, targetSecondsOf, type TimerState } from "@/lib/timer";

/* All functions here are scoped by userId, the authorization boundary (ADR 0001). */

export async function getSettings(userId: string) {
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoNothing();
  const created = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return created[0];
}

export type TemplateBlockView = {
  id: string;
  kind: "work" | "break";
  label: string | null;
  durationHours: number;
  excludedWeekdays: number[];
  position: number;
};

export async function getTemplateBlocks(
  userId: string,
): Promise<TemplateBlockView[]> {
  const rows = await db
    .select({
      id: templateBlocks.id,
      kind: templateBlocks.kind,
      label: templateBlocks.label,
      durationHours: templateBlocks.durationHours,
      excludedWeekdays: templateBlocks.excludedWeekdays,
      position: templateBlocks.position,
    })
    .from(templateBlocks)
    .where(eq(templateBlocks.userId, userId))
    .orderBy(asc(templateBlocks.position), asc(templateBlocks.createdAt));
  return rows.map((r) => ({ ...r, excludedWeekdays: r.excludedWeekdays ?? [] }));
}

/**
 * Distinct work-block labels the user has typed anywhere, across the Template
 * and every Day Record, for the label autocomplete (ADR 0003). Deduped case-
 * insensitively (most-recent casing wins), most-recently-used first.
 */
export async function getLabelSuggestions(userId: string): Promise<string[]> {
  const [tmpl, day] = await Promise.all([
    db
      .select({ label: templateBlocks.label, createdAt: templateBlocks.createdAt })
      .from(templateBlocks)
      .where(and(eq(templateBlocks.userId, userId), eq(templateBlocks.kind, "work"))),
    db
      .select({ label: dayBlocks.label, createdAt: dayBlocks.createdAt })
      .from(dayBlocks)
      .where(and(eq(dayBlocks.userId, userId), eq(dayBlocks.kind, "work"))),
  ]);

  const rows = [...tmpl, ...day]
    .filter((r) => r.label && r.label.trim())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const label = r.label!.trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/**
 * Returns the Day Record for a date, creating it on first visit by snapshotting
 * the current Template (applying weekday exclusions). Snapshot is frozen: later
 * Template edits never change an existing Day Record.
 */
export async function getOrCreateDay(
  userId: string,
  localDate: string,
): Promise<{ recordId: string; blocks: DayBlock[] }> {
  const existing = await db
    .select()
    .from(dayRecords)
    .where(and(eq(dayRecords.userId, userId), eq(dayRecords.localDate, localDate)))
    .limit(1);

  if (existing[0]) {
    const record = existing[0];
    let blocks = await loadDayBlocks(record.id);
    // Backfill a day that was created empty before any Template existed.
    // Guarded by `populated` so an intentionally-emptied day is left alone.
    if (blocks.length === 0 && !record.populated) {
      const inserted = await seedDayFromTemplate(userId, record.id, localDate, 0);
      if (inserted > 0) {
        await db
          .update(dayRecords)
          .set({ populated: true })
          .where(eq(dayRecords.id, record.id));
        blocks = await loadDayBlocks(record.id);
      }
    }
    await settleDayRecordTimers(record.id);
    return { recordId: record.id, blocks: await loadDayBlocks(record.id) };
  }

  const recordId = newId();
  const inserted = await db
    .insert(dayRecords)
    .values({ id: recordId, userId, localDate })
    .onConflictDoNothing()
    .returning({ id: dayRecords.id });

  // Lost a race to create this day, load whatever the winner created.
  if (!inserted[0]) {
    const winner = await db
      .select()
      .from(dayRecords)
      .where(
        and(eq(dayRecords.userId, userId), eq(dayRecords.localDate, localDate)),
      )
      .limit(1);
    return { recordId: winner[0].id, blocks: await loadDayBlocks(winner[0].id) };
  }

  const count = await seedDayFromTemplate(userId, recordId, localDate, 0);
  if (count > 0) {
    await db
      .update(dayRecords)
      .set({ populated: true })
      .where(eq(dayRecords.id, recordId));
  }

  return { recordId, blocks: await loadDayBlocks(recordId) };
}

/**
 * Snapshots the current Template into a day, skipping Blocks excluded on that
 * weekday. Returns the number of blocks inserted. `basePosition` lets it append
 * after any blocks already present (e.g. an ad-hoc block on a not-yet-seeded day).
 */
async function seedDayFromTemplate(
  userId: string,
  recordId: string,
  localDate: string,
  basePosition: number,
): Promise<number> {
  const weekday = weekdayOf(localDate);
  const template = await getTemplateBlocks(userId);

  const toInsert = template
    .filter((b) => !b.excludedWeekdays.includes(weekday))
    .map((b, i) => ({
      id: newId(),
      dayRecordId: recordId,
      userId,
      kind: b.kind,
      label: b.label ?? "",
      durationHours: b.durationHours,
      done: false,
      isAdhoc: false,
      position: basePosition + i,
    }));

  if (toInsert.length > 0) {
    await db.insert(dayBlocks).values(toInsert);
  }
  return toInsert.length;
}

async function loadDayBlocks(dayRecordId: string): Promise<DayBlock[]> {
  return db
    .select()
    .from(dayBlocks)
    .where(eq(dayBlocks.dayRecordId, dayRecordId))
    .orderBy(asc(dayBlocks.position), asc(dayBlocks.createdAt));
}

/**
 * Keep an untouched present/future day in sync with the current Template.
 *
 * A Day Record is auto-created (and snapshotted) the first time its date is
 * visited, which for a brand-new user happens before they have finished authoring
 * their Plan. Without this, that early snapshot freezes and later Template edits
 * never appear. So: while a day is **pristine** (nothing done, no ad-hoc block, no
 * tracked time, no running timer) we re-seed it from the live Template whenever the
 * content differs. Pure reordering is preserved (the comparison ignores order), and
 * the caller must only invoke this for today-or-future dates so past snapshots stay
 * frozen. Returns whether anything changed.
 */
export async function resyncDayIfPristine(
  userId: string,
  recordId: string,
): Promise<boolean> {
  const rec = await db
    .select()
    .from(dayRecords)
    .where(and(eq(dayRecords.id, recordId), eq(dayRecords.userId, userId)))
    .limit(1);
  if (!rec[0]) return false;

  const blocks = await loadDayBlocks(recordId);
  const touched = blocks.some(
    (b) => b.done || b.isAdhoc || b.trackedSeconds > 0 || b.runningSince != null,
  );
  if (touched) return false;

  const weekday = weekdayOf(rec[0].localDate);
  const template = await getTemplateBlocks(userId);
  const seed = template.filter((b) => !b.excludedWeekdays.includes(weekday));

  // Compare content ignoring order, so a pure day-only reorder is left alone.
  const key = (kind: string, label: string | null, dur: number) =>
    `${kind}|${(label ?? "").trim().toLowerCase()}|${dur}`;
  const cur = blocks.map((b) => key(b.kind, b.label, b.durationHours)).sort();
  const next = seed.map((b) => key(b.kind, b.label, b.durationHours)).sort();
  if (cur.length === next.length && cur.every((v, i) => v === next[i])) return false;

  await db
    .delete(dayBlocks)
    .where(and(eq(dayBlocks.dayRecordId, recordId), eq(dayBlocks.userId, userId)));
  if (seed.length > 0) {
    await db.insert(dayBlocks).values(
      seed.map((b, i) => ({
        id: newId(),
        dayRecordId: recordId,
        userId,
        kind: b.kind,
        label: b.label ?? "",
        durationHours: b.durationHours,
        done: false,
        isAdhoc: false,
        position: i,
      })),
    );
  }
  await db
    .update(dayRecords)
    .set({ populated: seed.length > 0 })
    .where(eq(dayRecords.id, recordId));
  return true;
}

function toTimerState(b: DayBlock): TimerState {
  return {
    id: b.id,
    kind: b.kind,
    label: b.label,
    done: b.done,
    targetSeconds: targetSecondsOf(b.durationHours),
    trackedSeconds: b.trackedSeconds,
    runningSinceMs: b.runningSince ? b.runningSince.getTime() : null,
  };
}

/**
 * Reconcile a day's timers to the current wall clock (ADR 0004), persisting any
 * target-crossings, hand-offs, and auto-done flips. Idempotent: a no-op when no
 * timer is running or none has reached its target. Runs on every day load so a
 * day reopened after the app was closed reflects the time that actually passed.
 */
export async function settleDayRecordTimers(dayRecordId: string): Promise<void> {
  const rows = await loadDayBlocks(dayRecordId);
  const before = rows.map(toTimerState);
  const { changed, blocks } = settleTimers(before, Date.now());
  if (!changed) return;

  await Promise.all(
    blocks.map((nb, idx) => {
      const ob = before[idx];
      if (
        nb.done === ob.done &&
        nb.trackedSeconds === ob.trackedSeconds &&
        nb.runningSinceMs === ob.runningSinceMs
      ) {
        return null;
      }
      return db
        .update(dayBlocks)
        .set({
          done: nb.done,
          trackedSeconds: Math.round(nb.trackedSeconds),
          runningSince:
            nb.runningSinceMs == null ? null : new Date(nb.runningSinceMs),
        })
        .where(eq(dayBlocks.id, nb.id));
    }),
  );
}

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

/* All functions here are scoped by userId — the authorization boundary (ADR 0001). */

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
 * Distinct work-block labels the user has typed anywhere — across the Template
 * and every Day Record — for the label autocomplete (ADR 0003). Deduped case-
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
    return { recordId: record.id, blocks };
  }

  const recordId = newId();
  const inserted = await db
    .insert(dayRecords)
    .values({ id: recordId, userId, localDate })
    .onConflictDoNothing()
    .returning({ id: dayRecords.id });

  // Lost a race to create this day — load whatever the winner created.
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

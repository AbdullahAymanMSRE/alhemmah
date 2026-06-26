"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  dayBlocks,
  templateBlocks,
  userSettings,
} from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { newId } from "@/lib/ids";
import { getOrCreateDay } from "@/server/queries";
import { setUserLocale, type Locale } from "@/i18n/locale";

/* Every action resolves the user first and scopes all writes by userId (ADR 0001). */

function refreshAll() {
  revalidatePath("/", "layout");
}

const MAX_DAY_HOURS = 24;

function clampHours(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Hours still available in a 24h day, given an already-used total. */
function remainingHours(usedHours: number): number {
  return Math.max(0, Math.round((MAX_DAY_HOURS - usedHours) * 100) / 100);
}

/** Sum of every template block's hours, optionally excluding one block. */
async function templateTotalHours(userId: string, excludeId?: string): Promise<number> {
  const rows = await db
    .select({ sum: sql<number>`coalesce(sum(${templateBlocks.durationHours}), 0)` })
    .from(templateBlocks)
    .where(
      excludeId
        ? and(eq(templateBlocks.userId, userId), ne(templateBlocks.id, excludeId))
        : eq(templateBlocks.userId, userId),
    );
  return Number(rows[0]?.sum ?? 0);
}

/** Sum of every block's hours on one day record, optionally excluding one block. */
async function dayTotalHours(recordId: string, excludeId?: string): Promise<number> {
  const rows = await db
    .select({ sum: sql<number>`coalesce(sum(${dayBlocks.durationHours}), 0)` })
    .from(dayBlocks)
    .where(
      excludeId
        ? and(eq(dayBlocks.dayRecordId, recordId), ne(dayBlocks.id, excludeId))
        : eq(dayBlocks.dayRecordId, recordId),
    );
  return Number(rows[0]?.sum ?? 0);
}

function cleanWeekdays(days: number[] | undefined): number[] {
  if (!days) return [];
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(
    (a, b) => a - b,
  );
}

async function nextTemplatePosition(userId: string): Promise<number> {
  const rows = await db
    .select({ max: sql<number>`coalesce(max(${templateBlocks.position}), -1)` })
    .from(templateBlocks)
    .where(eq(templateBlocks.userId, userId));
  return (rows[0]?.max ?? -1) + 1;
}

/* --------------------------- Template Blocks --------------------------- */

export async function addTemplateWorkBlock(
  label: string,
  durationHours: number,
  excludedWeekdays?: number[],
) {
  const userId = await requireUserId();
  const clean = label.trim();
  if (!clean) return;
  const duration = Math.min(
    clampHours(durationHours),
    remainingHours(await templateTotalHours(userId)),
  );
  if (duration <= 0) return; // day already full
  await db.insert(templateBlocks).values({
    id: newId(),
    userId,
    kind: "work",
    label: clean,
    durationHours: duration,
    excludedWeekdays: cleanWeekdays(excludedWeekdays),
    position: await nextTemplatePosition(userId),
  });
  refreshAll();
}

export async function addTemplateBreak(durationHours: number, label?: string) {
  const userId = await requireUserId();
  const duration = Math.min(
    clampHours(durationHours),
    remainingHours(await templateTotalHours(userId)),
  );
  if (duration <= 0) return; // day already full
  await db.insert(templateBlocks).values({
    id: newId(),
    userId,
    kind: "break",
    label: label?.trim() || null,
    durationHours: duration,
    position: await nextTemplatePosition(userId),
  });
  refreshAll();
}

export async function updateTemplateBlock(
  id: string,
  data: { durationHours?: number; label?: string; excludedWeekdays?: number[] },
) {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (data.durationHours !== undefined) {
    const used = await templateTotalHours(userId, id);
    patch.durationHours = Math.min(
      clampHours(data.durationHours),
      remainingHours(used),
    );
  }
  if (data.label !== undefined) patch.label = data.label.trim() || null;
  if (data.excludedWeekdays !== undefined)
    patch.excludedWeekdays = cleanWeekdays(data.excludedWeekdays);
  if (Object.keys(patch).length === 0) return;

  await db
    .update(templateBlocks)
    .set(patch)
    .where(and(eq(templateBlocks.id, id), eq(templateBlocks.userId, userId)));
  refreshAll();
}

/**
 * One-shot copy of a Block's weekday exclusions onto every other work Block
 * sharing its label (trimmed, case-insensitive). Blocks stay independent
 * afterward — this is a copy, not a link (ADR 0003).
 */
export async function applyWeekdaysToLabel(id: string, excludedWeekdays: number[]) {
  const userId = await requireUserId();
  const source = await db
    .select({ label: templateBlocks.label })
    .from(templateBlocks)
    .where(and(eq(templateBlocks.id, id), eq(templateBlocks.userId, userId)))
    .limit(1);
  const label = source[0]?.label?.trim();
  if (!label) return;
  const days = cleanWeekdays(excludedWeekdays);
  await db
    .update(templateBlocks)
    .set({ excludedWeekdays: days })
    .where(
      and(
        eq(templateBlocks.userId, userId),
        eq(templateBlocks.kind, "work"),
        ne(templateBlocks.id, id),
        sql`lower(trim(${templateBlocks.label})) = ${label.toLowerCase()}`,
      ),
    );
  refreshAll();
}

export async function deleteTemplateBlock(id: string) {
  const userId = await requireUserId();
  await db
    .delete(templateBlocks)
    .where(and(eq(templateBlocks.id, id), eq(templateBlocks.userId, userId)));
  refreshAll();
}

export async function reorderTemplateBlocks(orderedIds: string[]) {
  const userId = await requireUserId();
  await Promise.all(
    orderedIds.map((id, i) =>
      db
        .update(templateBlocks)
        .set({ position: i })
        .where(and(eq(templateBlocks.id, id), eq(templateBlocks.userId, userId))),
    ),
  );
  refreshAll();
}

/* ------------------------------ Day Blocks ----------------------------- */

export async function toggleDayBlock(blockId: string, done: boolean) {
  const userId = await requireUserId();
  await db
    .update(dayBlocks)
    .set({ done })
    .where(and(eq(dayBlocks.id, blockId), eq(dayBlocks.userId, userId)));
  refreshAll();
}

export async function deleteDayBlock(blockId: string) {
  const userId = await requireUserId();
  await db
    .delete(dayBlocks)
    .where(and(eq(dayBlocks.id, blockId), eq(dayBlocks.userId, userId)));
  refreshAll();
}

export async function reorderDayBlocks(dayRecordId: string, orderedIds: string[]) {
  const userId = await requireUserId();
  await Promise.all(
    orderedIds.map((id, i) =>
      db
        .update(dayBlocks)
        .set({ position: i })
        .where(
          and(
            eq(dayBlocks.id, id),
            eq(dayBlocks.userId, userId),
            eq(dayBlocks.dayRecordId, dayRecordId),
          ),
        ),
    ),
  );
  refreshAll();
}

export async function addAdhocBlock(
  localDate: string,
  data: {
    label: string;
    durationHours: number;
    withBreak: boolean;
    breakDuration: number;
    promote: boolean;
  },
) {
  const userId = await requireUserId();
  const label = data.label.trim();
  if (!label) return;

  // Ensure the day exists (snapshot created if first visit), then append blocks.
  const { recordId } = await getOrCreateDay(userId, localDate);

  // Fit the new work block (and its break) into whatever the day has left of 24h.
  const dayLeft = remainingHours(await dayTotalHours(recordId));
  const duration = Math.min(clampHours(data.durationHours), dayLeft);
  if (duration <= 0) return; // day already full
  const breakDuration = data.withBreak
    ? Math.min(clampHours(data.breakDuration), clampHours(dayLeft - duration))
    : 0;

  const posRow = await db
    .select({ max: sql<number>`coalesce(max(${dayBlocks.position}), -1)` })
    .from(dayBlocks)
    .where(eq(dayBlocks.dayRecordId, recordId));
  let pos = (posRow[0]?.max ?? -1) + 1;

  if (data.promote) {
    // Promotion: append the work Block (and its break) to the recurring Template,
    // each capped to the template's own remaining 24h.
    const tLeft = remainingHours(await templateTotalHours(userId));
    const tDuration = Math.min(duration, tLeft);
    let tPos = await nextTemplatePosition(userId);
    if (tDuration > 0) {
      await db.insert(templateBlocks).values({
        id: newId(),
        userId,
        kind: "work",
        label,
        durationHours: tDuration,
        position: tPos++,
      });
      const tBreak = Math.min(breakDuration, clampHours(tLeft - tDuration));
      if (data.withBreak && tBreak > 0) {
        await db.insert(templateBlocks).values({
          id: newId(),
          userId,
          kind: "break",
          label: null,
          durationHours: tBreak,
          position: tPos,
        });
      }
    }
  }

  // Add to this day regardless of promotion.
  await db.insert(dayBlocks).values({
    id: newId(),
    dayRecordId: recordId,
    userId,
    kind: "work",
    label,
    durationHours: duration,
    done: false,
    isAdhoc: !data.promote,
    position: pos++,
  });
  if (data.withBreak && breakDuration > 0) {
    await db.insert(dayBlocks).values({
      id: newId(),
      dayRecordId: recordId,
      userId,
      kind: "break",
      label: "",
      durationHours: breakDuration,
      done: false,
      isAdhoc: !data.promote,
      position: pos,
    });
  }
  refreshAll();
}

/* ------------------------------ Settings ------------------------------ */

export async function updateSettings(data: {
  language?: Locale;
  dayStartHour?: number;
}) {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (data.language === "en" || data.language === "ar") {
    patch.language = data.language;
  }
  if (data.dayStartHour !== undefined) {
    const h = Math.trunc(data.dayStartHour);
    patch.dayStartHour = Math.min(23, Math.max(0, Number.isFinite(h) ? h : 0));
  }

  await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });

  // Keep the locale cookie (used by next-intl) in sync with the saved preference.
  if (patch.language) {
    await setUserLocale(patch.language as Locale);
  }
  refreshAll();
}

"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  dayBlocks,
  dayRecords,
  taskTypes,
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

function clampHours(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

async function nextPosition(
  table: typeof templateBlocks | typeof taskTypes,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ max: sql<number>`coalesce(max(${table.position}), -1)` })
    .from(table)
    .where(eq(table.userId, userId));
  return (rows[0]?.max ?? -1) + 1;
}

/* ----------------------------- Task Types ----------------------------- */

export async function createTaskType(label: string, targetHours: number) {
  const userId = await requireUserId();
  const clean = label.trim();
  if (!clean) return;
  await db.insert(taskTypes).values({
    id: newId(),
    userId,
    label: clean,
    targetHours: clampHours(targetHours),
    position: await nextPosition(taskTypes, userId),
  });
  refreshAll();
}

export async function updateTaskType(
  id: string,
  data: { label?: string; targetHours?: number; excludedWeekdays?: number[] },
) {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (data.label !== undefined) patch.label = data.label.trim();
  if (data.targetHours !== undefined) patch.targetHours = clampHours(data.targetHours);
  if (data.excludedWeekdays !== undefined) {
    patch.excludedWeekdays = data.excludedWeekdays
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort((a, b) => a - b);
  }
  if (Object.keys(patch).length === 0) return;
  await db
    .update(taskTypes)
    .set(patch)
    .where(and(eq(taskTypes.id, id), eq(taskTypes.userId, userId)));
  refreshAll();
}

export async function deleteTaskType(id: string) {
  const userId = await requireUserId();
  // Cascade removes its template blocks; existing Day Records keep their snapshots.
  await db
    .delete(taskTypes)
    .where(and(eq(taskTypes.id, id), eq(taskTypes.userId, userId)));
  refreshAll();
}

/* --------------------------- Template Blocks --------------------------- */

export async function addTemplateWorkBlock(taskTypeId: string, durationHours: number) {
  const userId = await requireUserId();
  // Verify the task type belongs to the user.
  const owned = await db
    .select({ id: taskTypes.id })
    .from(taskTypes)
    .where(and(eq(taskTypes.id, taskTypeId), eq(taskTypes.userId, userId)))
    .limit(1);
  if (!owned[0]) return;
  await db.insert(templateBlocks).values({
    id: newId(),
    userId,
    kind: "work",
    taskTypeId,
    durationHours: clampHours(durationHours),
    position: await nextPosition(templateBlocks, userId),
  });
  refreshAll();
}

export async function addTemplateBreak(durationHours: number, label?: string) {
  const userId = await requireUserId();
  await db.insert(templateBlocks).values({
    id: newId(),
    userId,
    kind: "break",
    taskTypeId: null,
    label: label?.trim() || null,
    durationHours: clampHours(durationHours),
    position: await nextPosition(templateBlocks, userId),
  });
  refreshAll();
}

export async function updateTemplateBlock(
  id: string,
  data: { durationHours?: number; taskTypeId?: string; label?: string },
) {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (data.durationHours !== undefined) patch.durationHours = clampHours(data.durationHours);
  if (data.taskTypeId !== undefined) patch.taskTypeId = data.taskTypeId;
  if (data.label !== undefined) patch.label = data.label.trim() || null;
  if (Object.keys(patch).length === 0) return;
  await db
    .update(templateBlocks)
    .set(patch)
    .where(and(eq(templateBlocks.id, id), eq(templateBlocks.userId, userId)));
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
  const duration = clampHours(data.durationHours);
  const breakDuration = clampHours(data.breakDuration);

  // Ensure the day exists (snapshot created if first visit), then append blocks.
  const { recordId } = await getOrCreateDay(userId, localDate);
  const posRow = await db
    .select({ max: sql<number>`coalesce(max(${dayBlocks.position}), -1)` })
    .from(dayBlocks)
    .where(eq(dayBlocks.dayRecordId, recordId));
  let pos = (posRow[0]?.max ?? -1) + 1;

  let newTaskTypeId: string | null = null;

  if (data.promote) {
    // Promotion: becomes a recurring Template block + a new Task Type.
    newTaskTypeId = newId();
    await db.insert(taskTypes).values({
      id: newTaskTypeId,
      userId,
      label,
      targetHours: duration,
      position: await nextPosition(taskTypes, userId),
    });
    let tPos = await nextPosition(templateBlocks, userId);
    await db.insert(templateBlocks).values({
      id: newId(),
      userId,
      kind: "work",
      taskTypeId: newTaskTypeId,
      durationHours: duration,
      position: tPos++,
    });
    if (data.withBreak && breakDuration > 0) {
      await db.insert(templateBlocks).values({
        id: newId(),
        userId,
        kind: "break",
        taskTypeId: null,
        durationHours: breakDuration,
        position: tPos,
      });
    }
  }

  // Add to this day regardless of promotion.
  await db.insert(dayBlocks).values({
    id: newId(),
    dayRecordId: recordId,
    userId,
    kind: "work",
    taskTypeId: newTaskTypeId,
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
      taskTypeId: null,
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

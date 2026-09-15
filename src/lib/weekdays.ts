/**
 * Describing a Block's weekday schedule.
 *
 * The stored model is negative (`excludedWeekdays`, "skip on"), but users think
 * positively ("runs on"), and the schedule editor now states it on the row so
 * the feature is visible without opening anything. This turns the stored
 * exclusions into what to say; the words themselves live in the messages files.
 */

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type WeekdaysSummary =
  | { kind: "every" }
  | { kind: "none" }
  | { kind: "some"; days: number[] };

export function weekdaysSummary(excludedWeekdays: number[]): WeekdaysSummary {
  const excluded = new Set(excludedWeekdays);
  const days = WEEKDAYS.filter((d) => !excluded.has(d));
  if (days.length === WEEKDAYS.length) return { kind: "every" };
  if (days.length === 0) return { kind: "none" };
  return { kind: "some", days: [...days] };
}

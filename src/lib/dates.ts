/**
 * Date helpers. A "local date" is a `YYYY-MM-DD` string in the user's own
 * timezone. There are no clock times in the app — only calendar dates for
 * bucketing Day Records. Parsing uses noon to dodge DST/UTC edge cases.
 */

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The current "today" for the user, shifted by their day-start hour. Client-side. */
export function todayLocalDate(dayStartHour: number): string {
  const now = new Date();
  now.setHours(now.getHours() - dayStartHour);
  return toLocalDateString(now);
}

/** Weekday for a local date, JS convention: 0 = Sunday .. 6 = Saturday. */
export function weekdayOf(localDate: string): number {
  return new Date(`${localDate}T12:00:00`).getDay();
}

/** Add (or subtract) days to a local date string. */
export function addDays(localDate: string, n: number): string {
  const d = new Date(`${localDate}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
}

/** Basic shape check for a YYYY-MM-DD string. */
export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && toLocalDateString(d) === value;
}

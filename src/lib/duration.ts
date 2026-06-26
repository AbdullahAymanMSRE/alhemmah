/** Render a decimal-hours value as "1h 30m" / "45m" / "2h". Units are localized. */
export function formatDuration(hours: number, units: { h: string; m: string }): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `${h}${units.h} ${m}${units.m}`;
  if (h) return `${h}${units.h}`;
  return `${m}${units.m}`;
}

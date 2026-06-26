import { requireUserId } from "@/lib/session";
import { getLabelSuggestions, getOrCreateDay, getSettings } from "@/server/queries";
import { isValidLocalDate } from "@/lib/dates";
import { DayView } from "@/components/DayView";
import { redirect } from "@/i18n/navigation";

export default async function DayPage({
  params,
}: {
  params: Promise<{ locale: string; date: string }>;
}) {
  const { locale, date } = await params;
  if (!isValidLocalDate(date)) redirect({ href: "/", locale });

  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const [{ recordId, blocks }, suggestions] = await Promise.all([
    getOrCreateDay(userId, date),
    getLabelSuggestions(userId),
  ]);

  return (
    <DayView
      date={date}
      recordId={recordId}
      dayStartHour={settings.dayStartHour}
      suggestions={suggestions}
      blocks={blocks.map((b) => ({
        id: b.id,
        kind: b.kind,
        label: b.label,
        durationHours: b.durationHours,
        done: b.done,
        isAdhoc: b.isAdhoc,
        trackedSeconds: b.trackedSeconds,
        runningSince: b.runningSince ? b.runningSince.getTime() : null,
      }))}
    />
  );
}

import { Suspense } from "react";
import { requireUserId } from "@/lib/session";
import { getLabelSuggestions, getOrCreateDay, getSettings } from "@/server/queries";
import { isValidLocalDate } from "@/lib/dates";
import { DayView } from "@/components/DayView";
import { DayHeader } from "@/components/DayHeader";
import { AppLoading } from "@/components/AppLoading";
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

  // The header stays put while only the task list reloads. Stepping day to day is a
  // param change on the same route, so the keyed Suspense (not the segment's
  // loading.tsx) is what re-fires the loading state, scoped to the content alone.
  return (
    <div className="flex flex-col gap-5">
      <DayHeader date={date} dayStartHour={settings.dayStartHour} />
      <Suspense key={date} fallback={<AppLoading />}>
        <DayBody userId={userId} date={date} dayStartHour={settings.dayStartHour} />
      </Suspense>
    </div>
  );
}

async function DayBody({
  userId,
  date,
  dayStartHour,
}: {
  userId: string;
  date: string;
  dayStartHour: number;
}) {
  const [{ recordId, blocks }, suggestions] = await Promise.all([
    getOrCreateDay(userId, date),
    getLabelSuggestions(userId),
  ]);

  return (
    <DayView
      date={date}
      recordId={recordId}
      dayStartHour={dayStartHour}
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

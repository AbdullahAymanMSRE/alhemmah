import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { getOrCreateDay, getSettings } from "@/server/queries";
import { isValidLocalDate } from "@/lib/dates";
import { DayView } from "@/components/DayView";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidLocalDate(date)) redirect("/");

  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const { recordId, blocks } = await getOrCreateDay(userId, date);

  return (
    <DayView
      date={date}
      recordId={recordId}
      dayStartHour={settings.dayStartHour}
      blocks={blocks.map((b) => ({
        id: b.id,
        kind: b.kind,
        label: b.label,
        taskTypeId: b.taskTypeId,
        durationHours: b.durationHours,
        done: b.done,
        isAdhoc: b.isAdhoc,
      }))}
    />
  );
}

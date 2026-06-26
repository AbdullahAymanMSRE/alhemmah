import { requireUserId } from "@/lib/session";
import { getLabelSuggestions, getTemplateBlocks } from "@/server/queries";
import { ScheduleEditor } from "@/components/ScheduleEditor";

export default async function PlanPage() {
  const userId = await requireUserId();
  const [template, suggestions] = await Promise.all([
    getTemplateBlocks(userId),
    getLabelSuggestions(userId),
  ]);

  return (
    <ScheduleEditor
      blocks={template.map((b) => ({
        id: b.id,
        kind: b.kind,
        label: b.label,
        durationHours: b.durationHours,
        excludedWeekdays: b.excludedWeekdays,
      }))}
      suggestions={suggestions}
    />
  );
}

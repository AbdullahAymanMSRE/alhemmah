import { requireUserId } from "@/lib/session";
import { getTaskTypes, getTemplateBlocks } from "@/server/queries";
import { ScheduleEditor } from "@/components/ScheduleEditor";

export default async function SchedulePage() {
  const userId = await requireUserId();
  const [template, types] = await Promise.all([
    getTemplateBlocks(userId),
    getTaskTypes(userId),
  ]);

  return (
    <ScheduleEditor
      blocks={template.map((b) => ({
        id: b.id,
        kind: b.kind,
        taskTypeId: b.taskTypeId,
        label: b.label,
        taskTypeLabel: b.taskTypeLabel,
        durationHours: b.durationHours,
      }))}
      taskTypes={types.map((t) => ({ id: t.id, label: t.label }))}
    />
  );
}

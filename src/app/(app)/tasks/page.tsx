import { requireUserId } from "@/lib/session";
import { getTaskTypes, getTemplateBlocks } from "@/server/queries";
import { TaskTypesManager } from "@/components/TaskTypesManager";

export default async function TasksPage() {
  const userId = await requireUserId();
  const [types, template] = await Promise.all([
    getTaskTypes(userId),
    getTemplateBlocks(userId),
  ]);

  // Planned hours per task type = sum of its work blocks in the Template.
  const plannedByType = new Map<string, number>();
  for (const b of template) {
    if (b.kind === "work" && b.taskTypeId) {
      plannedByType.set(
        b.taskTypeId,
        (plannedByType.get(b.taskTypeId) ?? 0) + b.durationHours,
      );
    }
  }

  const items = types.map((t) => ({
    id: t.id,
    label: t.label,
    targetHours: t.targetHours,
    excludedWeekdays: t.excludedWeekdays ?? [],
    plannedHours: Math.round((plannedByType.get(t.id) ?? 0) * 100) / 100,
  }));

  return <TaskTypesManager items={items} />;
}

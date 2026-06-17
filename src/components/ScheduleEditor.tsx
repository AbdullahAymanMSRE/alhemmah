"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SortableList } from "@/components/SortableList";
import { GripIcon, TrashIcon } from "@/components/icons";
import {
  addTemplateBreak,
  addTemplateWorkBlock,
  deleteTemplateBlock,
  reorderTemplateBlocks,
  updateTemplateBlock,
} from "@/server/actions";

type Block = {
  id: string;
  kind: "work" | "break";
  taskTypeId: string | null;
  label: string | null;
  taskTypeLabel: string | null;
  durationHours: number;
};
type TaskTypeOption = { id: string; label: string };

export function ScheduleEditor({
  blocks,
  taskTypes,
}: {
  blocks: Block[];
  taskTypes: TaskTypeOption[];
}) {
  const t = useTranslations("schedule");
  const td = useTranslations("day");
  const router = useRouter();
  const [, start] = useTransition();
  const [items, setItems] = useState(blocks);

  // Resync local order/values whenever the server data changes (after refresh).
  const sig = useMemo(
    () =>
      JSON.stringify(
        blocks.map((b) => [b.id, b.durationHours, b.taskTypeId, b.label])
      ),
    [blocks]
  );
  useEffect(() => {
    setItems(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const total =
    Math.round(items.reduce((s, b) => s + b.durationHours, 0) * 100) / 100;

  function reorder(ids: string[]) {
    setItems((prev) => ids.map((id) => prev.find((b) => b.id === id)!));
    start(async () => {
      await reorderTemplateBlocks(ids);
      router.refresh();
    });
  }

  function setDuration(id: string, value: number) {
    setItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, durationHours: value } : b))
    );
    start(async () => {
      await updateTemplateBlock(id, { durationHours: value });
      router.refresh();
    });
  }

  function setType(id: string, taskTypeId: string) {
    start(async () => {
      await updateTemplateBlock(id, { taskTypeId });
      router.refresh();
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((b) => b.id !== id));
    start(async () => {
      await deleteTemplateBlock(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1 text-xs tabular-nums text-muted">
            {t("totalPlanned", { hours: total })}
          </span>
        )}
      </header>

      <AddBlocks taskTypes={taskTypes} />

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm">{t("empty")}</p>
          <p className="mt-1 text-xs text-faint">{t("emptyHint")}</p>
        </div>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          renderItem={(b, handle) => (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
              <button
                {...handle}
                className="cursor-grab touch-none rounded p-1 text-faint hover:text-muted active:cursor-grabbing"
                aria-label={t("reorderHint")}
              >
                <GripIcon />
              </button>

              {b.kind === "work" ? (
                <select
                  value={b.taskTypeId ?? ""}
                  onChange={(e) => setType(b.id, e.target.value)}
                  className="auto-dir h-9 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm outline-none focus:border-border-strong"
                >
                  {taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="flex-1 text-sm text-muted">
                  {b.label || td("break")}
                </span>
              )}

              <input
                type="number"
                min={0}
                step={0.25}
                defaultValue={b.durationHours}
                onBlur={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (v !== b.durationHours) setDuration(b.id, v);
                }}
                className="h-9 w-16 rounded-md border border-border bg-surface-2 px-2 text-sm tabular-nums outline-none focus:border-border-strong"
                aria-label={t("duration")}
              />

              <button
                onClick={() => remove(b.id)}
                className="rounded p-1.5 text-faint transition-colors hover:text-danger"
                aria-label={t("delete")}
              >
                <TrashIcon />
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}

function AddBlocks({ taskTypes }: { taskTypes: TaskTypeOption[] }) {
  const t = useTranslations("schedule");
  const router = useRouter();
  const [, start] = useTransition();
  const [typeId, setTypeId] = useState(taskTypes[0]?.id ?? "");
  const [workDur, setWorkDur] = useState("1");
  const [breakDur, setBreakDur] = useState("0.25");

  function addWork() {
    if (!typeId) return;
    start(async () => {
      await addTemplateWorkBlock(typeId, Number(workDur) || 0);
      router.refresh();
    });
  }
  function addBreak() {
    start(async () => {
      await addTemplateBreak(Number(breakDur) || 0);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong bg-surface/50 p-4">
      {taskTypes.length === 0 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">{t("noTaskTypes")}</span>
          <a href="/tasks" className="text-accent hover:underline">
            {t("createTaskType")}
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {t("selectTaskType")}
            </span>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="auto-dir h-9 rounded-md border border-border bg-surface-2 px-2 text-sm outline-none focus:border-border-strong"
            >
              {taskTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-16 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {t("duration")}
            </span>
            <input
              type="number"
              min={0}
              step={0.25}
              value={workDur}
              onChange={(e) => setWorkDur(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm tabular-nums outline-none focus:border-border-strong"
            />
          </label>
          <button
            onClick={addWork}
            className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("addWork")}
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-border pt-3">
        <label className="flex w-16 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">
            {t("duration")}
          </span>
          <input
            type="number"
            min={0}
            step={0.25}
            value={breakDur}
            onChange={(e) => setBreakDur(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm tabular-nums outline-none focus:border-border-strong"
          />
        </label>
        <button
          onClick={addBreak}
          className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          {t("addBreak")}
        </button>
      </div>
    </div>
  );
}

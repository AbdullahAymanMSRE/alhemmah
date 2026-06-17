"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createTaskType,
  updateTaskType,
  deleteTaskType,
} from "@/server/actions";
import { cn } from "@/lib/cn";

type Item = {
  id: string;
  label: string;
  targetHours: number;
  excludedWeekdays: number[];
  plannedHours: number;
};

export function TaskTypesManager({ items }: { items: Item[] }) {
  const t = useTranslations("taskTypes");

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </header>

      <AddTaskType />

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm">{t("empty")}</p>
          <p className="mt-1 text-xs text-faint">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <TaskRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: Item }) {
  const t = useTranslations("taskTypes");
  const tw = useTranslations("weekdays");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(item.label);
  const [target, setTarget] = useState(String(item.targetHours));
  const [excluded, setExcluded] = useState<number[]>(item.excludedWeekdays);

  const dirty =
    label !== item.label ||
    Number(target) !== item.targetHours ||
    excluded.slice().sort().join() !==
      item.excludedWeekdays.slice().sort().join();

  const mismatch = Math.abs(item.plannedHours - item.targetHours) > 0.001;

  function toggleDay(d: number) {
    setExcluded((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function save() {
    start(async () => {
      await updateTaskType(item.id, {
        label,
        targetHours: Number(target) || 0,
        excludedWeekdays: excluded,
      });
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(t("deleteConfirm"))) return;
    start(async () => {
      await deleteTaskType(item.id);
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t("label")}</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="auto-dir h-9 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-border-strong"
          />
        </label>
        <label className="flex w-24 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">
            {t("targetHours")}
          </span>
          <input
            type="number"
            min={0}
            step={0.25}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm tabular-nums outline-none focus:border-border-strong"
          />
        </label>
      </div>

      <div className="mt-3">
        <span className="text-xs font-medium text-muted">
          {t("excludedDays")}
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                excluded.includes(d)
                  ? "border-border-strong bg-surface-2 text-faint line-through"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {tw(String(d))}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={cn("text-xs", mismatch ? "text-danger" : "text-faint")}
        >
          {t("plannedVsTarget", {
            planned: item.plannedHours,
            target: item.targetHours,
          })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={remove}
            disabled={pending}
            className="rounded-md px-2 py-1.5 text-xs text-muted transition-colors hover:text-danger disabled:opacity-50"
          >
            {t("delete")}
          </button>
          <button
            onClick={save}
            disabled={!dirty || pending}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </li>
  );
}

function AddTaskType() {
  const t = useTranslations("taskTypes");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("1");

  function add() {
    if (!label.trim()) return;
    start(async () => {
      await createTaskType(label, Number(target) || 0);
      setLabel("");
      setTarget("1");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface/50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t("label")}</span>
          <input
            value={label}
            placeholder={t("labelPlaceholder")}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="auto-dir h-9 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-border-strong"
          />
        </label>
        <label className="flex w-24 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">
            {t("targetHours")}
          </span>
          <input
            type="number"
            min={0}
            step={0.25}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm tabular-nums outline-none focus:border-border-strong"
          />
        </label>
        <button
          onClick={add}
          disabled={pending || !label.trim()}
          className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {t("add")}
        </button>
      </div>
    </div>
  );
}

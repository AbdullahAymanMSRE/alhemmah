"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SortableList } from "@/components/SortableList";
import { DurationInput } from "@/components/DurationInput";
import { CalendarIcon, GripIcon, TrashIcon } from "@/components/icons";
import { formatDuration } from "@/lib/duration";
import { cn } from "@/lib/cn";
import {
  addTemplateBreak,
  addTemplateWorkBlock,
  applyWeekdaysToLabel,
  deleteTemplateBlock,
  reorderTemplateBlocks,
  updateTemplateBlock,
} from "@/server/actions";

type Block = {
  id: string;
  kind: "work" | "break";
  label: string | null;
  durationHours: number;
  excludedWeekdays: number[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const SUGGESTIONS_ID = "label-suggestions";

export function ScheduleEditor({
  blocks,
  suggestions,
}: {
  blocks: Block[];
  suggestions: string[];
}) {
  const t = useTranslations("schedule");
  const td = useTranslations("day");
  const tc = useTranslations("common");
  const locale = useLocale();
  // Arabic puts a non-breaking space between number and unit: "5 س"; English is "5h".
  const unitGap = locale === "ar" ? " " : "";
  const units = { h: `${unitGap}${tc("hUnit")}`, m: `${unitGap}${tc("mUnit")}` };
  const router = useRouter();
  const [, start] = useTransition();
  const [items, setItems] = useState(blocks);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});

  // Resync local order/values whenever the server data changes (after refresh).
  const sig = useMemo(
    () =>
      JSON.stringify(
        blocks.map((b) => [b.id, b.durationHours, b.label, b.excludedWeekdays]),
      ),
    [blocks],
  );
  useEffect(() => {
    setItems(blocks);
    setLabelDrafts({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const total = round2(items.reduce((s, b) => s + b.durationHours, 0));

  // Group work blocks by normalized label; sum hours. First-seen casing is canonical.
  const totals = useMemo(() => {
    const map = new Map<string, { label: string; hours: number }>();
    for (const b of items) {
      if (b.kind !== "work") continue;
      const raw = (b.label ?? "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const cur = map.get(key);
      if (cur) cur.hours += b.durationHours;
      else map.set(key, { label: raw, hours: b.durationHours });
    }
    return [...map.values()]
      .map((v) => ({ ...v, hours: round2(v.hours) }))
      .sort((a, b) => b.hours - a.hours);
  }, [items]);

  function reorder(ids: string[]) {
    setItems((prev) => ids.map((id) => prev.find((b) => b.id === id)!));
    start(async () => {
      await reorderTemplateBlocks(ids);
      router.refresh();
    });
  }

  function commitDuration(id: string, value: number) {
    const b = items.find((x) => x.id === id);
    if (!b) return;
    const v = Math.max(0, round2(value));
    if (v === b.durationHours) return;
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, durationHours: v } : x)),
    );
    start(async () => {
      await updateTemplateBlock(id, { durationHours: v });
      router.refresh();
    });
  }

  function commitLabel(id: string, raw: string) {
    const b = items.find((x) => x.id === id);
    if (!b) return;
    const value = raw.trim();
    setLabelDrafts((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    });
    if (value === (b.label ?? "")) return;
    if (b.kind === "work" && !value) return; // don't blank a work label
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, label: value } : x)));
    start(async () => {
      await updateTemplateBlock(id, { label: value });
      router.refresh();
    });
  }

  function setWeekdays(id: string, excludedWeekdays: number[]) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, excludedWeekdays } : x)),
    );
    start(async () => {
      await updateTemplateBlock(id, { excludedWeekdays });
      router.refresh();
    });
  }

  function applyWeekdaysEverywhere(id: string, excludedWeekdays: number[]) {
    const src = items.find((x) => x.id === id);
    const label = (src?.label ?? "").trim().toLowerCase();
    setItems((prev) =>
      prev.map((x) =>
        x.kind === "work" && (x.label ?? "").trim().toLowerCase() === label
          ? { ...x, excludedWeekdays }
          : x,
      ),
    );
    start(async () => {
      await applyWeekdaysToLabel(id, excludedWeekdays);
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
          <span
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md border bg-surface px-2.5 py-1 text-xs tabular-nums",
              total >= 24
                ? "border-danger/40 text-danger"
                : "border-border text-muted",
            )}
            title={total >= 24 ? tc("dayFull") : undefined}
          >
            {t("totalPlanned", { hours: formatDuration(total, units) })}
          </span>
        )}
      </header>

      {totals.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-faint">
            {t("totalsTitle")}
          </span>
          <ul className="mt-2 flex flex-col gap-1">
            {totals.map((row) => (
              <li key={row.label} className="flex justify-between text-xs">
                <span className="auto-dir text-muted">{row.label}</span>
                <span className="tabular-nums text-faint">
                  {t("hoursShort", { hours: formatDuration(row.hours, units) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <datalist id={SUGGESTIONS_ID}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <AddBlocks />

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
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <div className="flex items-center gap-2">
                <button
                  {...handle}
                  className="cursor-grab touch-none rounded p-1 text-faint hover:text-muted active:cursor-grabbing"
                  aria-label={t("reorderHint")}
                >
                  <GripIcon />
                </button>

                {b.kind === "work" ? (
                  <input
                    value={labelDrafts[b.id] ?? b.label ?? ""}
                    list={SUGGESTIONS_ID}
                    placeholder={t("labelPlaceholder")}
                    onChange={(e) =>
                      setLabelDrafts((d) => ({ ...d, [b.id]: e.target.value }))
                    }
                    onBlur={(e) => commitLabel(b.id, e.target.value)}
                    className="auto-dir h-9 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm outline-none focus:border-border-strong"
                    aria-label={t("workLabel")}
                  />
                ) : (
                  <span className="flex-1 text-sm text-muted">
                    {b.label || td("break")}
                  </span>
                )}

                <DurationInput
                  valueHours={b.durationHours}
                  onChange={(hours) => commitDuration(b.id, hours)}
                  ariaLabel={t("duration")}
                />

                <WeekdayDisclosure
                  block={b}
                  onChange={(days) => setWeekdays(b.id, days)}
                  onApplyAll={(days) => applyWeekdaysEverywhere(b.id, days)}
                />

                <button
                  onClick={() => remove(b.id)}
                  className="rounded p-1.5 text-faint transition-colors hover:text-danger"
                  aria-label={t("delete")}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}

/** A small calendar button that expands the 7 weekday toggles + apply-to-all. */
function WeekdayDisclosure({
  block,
  onChange,
  onApplyAll,
}: {
  block: Block;
  onChange: (days: number[]) => void;
  onApplyAll: (days: number[]) => void;
}) {
  const t = useTranslations("schedule");
  const tw = useTranslations("weekdays");
  const [open, setOpen] = useState(false);
  const excluded = block.excludedWeekdays;
  const active = excluded.length > 0;

  function toggleDay(d: number) {
    onChange(
      excluded.includes(d)
        ? excluded.filter((x) => x !== d)
        : [...excluded, d].sort((a, b) => a - b),
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative rounded p-1.5 transition-colors",
          active ? "text-accent" : "text-faint hover:text-muted",
        )}
        aria-label={t("skipOn")}
        aria-expanded={open}
      >
        <CalendarIcon />
        {active && (
          <span className="absolute end-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-10 mt-1 w-48 rounded-lg border border-border-strong bg-surface p-3 shadow-lg">
          <span className="text-xs font-medium text-muted">{t("skipOn")}</span>
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
                    : "border-border text-muted hover:text-foreground",
                )}
              >
                {tw(String(d))}
              </button>
            ))}
          </div>
          {block.kind === "work" && (block.label ?? "").trim() && (
            <button
              onClick={() => onApplyAll(excluded)}
              className="mt-2.5 w-full rounded-md border border-border px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              {t("applyToAll", { label: (block.label ?? "").trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddBlocks() {
  const t = useTranslations("schedule");
  const router = useRouter();
  const [, start] = useTransition();
  const [label, setLabel] = useState("");
  const [workDur, setWorkDur] = useState(1);
  const [breakDur, setBreakDur] = useState(0.25);

  function addWork() {
    const clean = label.trim();
    if (!clean) return;
    const value = Math.max(0, round2(workDur));
    start(async () => {
      await addTemplateWorkBlock(clean, value);
      setLabel("");
      setWorkDur(1);
      router.refresh();
    });
  }
  function addBreak() {
    start(async () => {
      await addTemplateBreak(Math.max(0, round2(breakDur)));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong bg-surface/50 p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t("workLabel")}</span>
          <input
            value={label}
            list={SUGGESTIONS_ID}
            placeholder={t("labelPlaceholder")}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWork()}
            className="auto-dir h-9 rounded-md border border-border bg-surface-2 px-2 text-sm outline-none focus:border-border-strong"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t("duration")}</span>
          <DurationInput valueHours={workDur} onChange={setWorkDur} ariaLabel={t("duration")} />
        </div>
        <button
          onClick={addWork}
          disabled={!label.trim()}
          className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {t("addWork")}
        </button>
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t("duration")}</span>
          <DurationInput valueHours={breakDur} onChange={setBreakDur} ariaLabel={t("duration")} />
        </div>
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

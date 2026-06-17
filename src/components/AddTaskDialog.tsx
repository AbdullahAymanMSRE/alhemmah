"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addAdhocBlock } from "@/server/actions";

export function AddTaskDialog({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const t = useTranslations("addTask");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("1");
  const [withBreak, setWithBreak] = useState(false);
  const [breakDuration, setBreakDuration] = useState("0.25");
  const [promote, setPromote] = useState(false);

  function submit() {
    if (!label.trim()) return;
    start(async () => {
      await addAdhocBlock(date, {
        label,
        durationHours: Number(duration) || 0,
        withBreak,
        breakDuration: Number(breakDuration) || 0,
        promote,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border-strong bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold">{t("title")}</h2>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">{t("label")}</span>
            <input
              autoFocus
              value={label}
              placeholder={t("labelPlaceholder")}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="auto-dir h-9 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-border-strong"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">{t("duration")}</span>
            <input
              type="number"
              min={0}
              step={0.25}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="h-9 w-24 rounded-md border border-border bg-surface-2 px-3 text-sm tabular-nums outline-none focus:border-border-strong"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withBreak}
              onChange={(e) => setWithBreak(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-muted">{t("withBreak")}</span>
          </label>
          {withBreak && (
            <label className="flex flex-col gap-1.5 ps-6">
              <span className="text-xs font-medium text-muted">{t("breakDuration")}</span>
              <input
                type="number"
                min={0}
                step={0.25}
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                className="h-9 w-24 rounded-md border border-border bg-surface-2 px-3 text-sm tabular-nums outline-none focus:border-border-strong"
              />
            </label>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={promote}
              onChange={(e) => setPromote(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className="text-muted">{t("promote")}</span>
              <span className="mt-0.5 block text-xs text-faint">{t("promoteHint")}</span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={pending || !label.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}

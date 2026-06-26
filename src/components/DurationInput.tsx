"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Edits a decimal-hours value as paired hours + minutes fields, emitting the
 * combined value (rounded to 2 decimals, matching server-side `clampHours`) on
 * blur. Manages its own draft text so typing never round-trips through the
 * server mid-edit; resyncs when the upstream value changes.
 */
export function DurationInput({
  valueHours,
  onChange,
  ariaLabel,
  className,
}: {
  valueHours: number;
  onChange: (hours: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const tc = useTranslations("common");
  const total = Math.round(valueHours * 60);
  const [h, setH] = useState(String(Math.floor(total / 60)));
  const [m, setM] = useState(String(total % 60));

  useEffect(() => {
    const t = Math.round(valueHours * 60);
    setH(String(Math.floor(t / 60)));
    setM(String(t % 60));
  }, [valueHours]);

  function commit() {
    const minutes = Math.max(
      0,
      (Math.floor(Number(h) || 0) || 0) * 60 + Math.floor(Number(m) || 0),
    );
    onChange(round2(minutes / 60));
  }

  const field =
    "h-9 w-12 rounded-md border border-border bg-surface-2 px-2 text-sm tabular-nums outline-none focus:border-border-strong";

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={h}
        onChange={(e) => setH(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        className={field}
        aria-label={ariaLabel ? `${ariaLabel}, ${tc("hUnit")}` : tc("hUnit")}
      />
      <span className="text-xs text-faint">{tc("hUnit")}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={m}
        onChange={(e) => setM(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        className={field}
        aria-label={ariaLabel ? `${ariaLabel}, ${tc("mUnit")}` : tc("mUnit")}
      />
      <span className="text-xs text-faint">{tc("mUnit")}</span>
    </div>
  );
}

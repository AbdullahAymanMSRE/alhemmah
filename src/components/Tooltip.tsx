"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Minimal CSS tooltip: wraps a trigger and reveals a small label above it on
 * hover or keyboard focus. Flat and dark to match the theme; no JS, no deps.
 * The trigger should keep its own aria-label — this label is supplementary.
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2",
          "whitespace-nowrap rounded-md border border-border bg-surface-2 px-2 py-1",
          "text-xs text-foreground opacity-0 transition-opacity duration-100",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}

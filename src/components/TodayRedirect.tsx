"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { todayLocalDate } from "@/lib/dates";

/** Computes the user's local "today" (honoring day-start hour) and routes to it. */
export function TodayRedirect({ dayStartHour }: { dayStartHour: number }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/day/${todayLocalDate(dayStartHour)}`);
  }, [router, dayStartHour]);
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted">
      <span className="text-sm">…</span>
    </div>
  );
}

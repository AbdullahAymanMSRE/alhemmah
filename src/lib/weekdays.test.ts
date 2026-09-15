import { describe, expect, it } from "vitest";
import { weekdaysSummary } from "./weekdays";

describe("weekdaysSummary", () => {
  it("says a Block with no exclusions runs every day", () => {
    expect(weekdaysSummary([])).toEqual({ kind: "every" });
  });

  it("lists the days a partly-excluded Block still runs, in week order", () => {
    // Excluding Sun, Tue, Thu, Sat leaves Mon, Wed, Fri.
    expect(weekdaysSummary([6, 0, 4, 2])).toEqual({ kind: "some", days: [1, 3, 5] });
  });

  it("says a Block excluded on every day never runs", () => {
    expect(weekdaysSummary([0, 1, 2, 3, 4, 5, 6])).toEqual({ kind: "none" });
  });

  it("ignores junk weekday numbers rather than reporting a wrong schedule", () => {
    expect(weekdaysSummary([9, -1])).toEqual({ kind: "every" });
  });
});

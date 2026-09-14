import { describe, expect, it } from "vitest";
import { defaultTemplateBlocks, shouldSeedTemplate } from "./default-template";

describe("defaultTemplateBlocks", () => {
  it("gives an English user a complete day, in order", () => {
    expect(defaultTemplateBlocks("en")).toEqual([
      { kind: "work", label: "Deep Work", durationHours: 2, position: 0 },
      { kind: "break", label: "Break", durationHours: 0.5, position: 1 },
      { kind: "work", label: "Deep Work", durationHours: 2, position: 2 },
      { kind: "break", label: "Lunch", durationHours: 1, position: 3 },
      { kind: "work", label: "Admin & Email", durationHours: 1, position: 4 },
      { kind: "work", label: "Exercise", durationHours: 1, position: 5 },
    ]);
  });

  it("gives an Arabic user the same day in Arabic", () => {
    expect(defaultTemplateBlocks("ar")).toEqual([
      { kind: "work", label: "عمل مركّز", durationHours: 2, position: 0 },
      { kind: "break", label: "استراحة", durationHours: 0.5, position: 1 },
      { kind: "work", label: "عمل مركّز", durationHours: 2, position: 2 },
      { kind: "break", label: "غداء", durationHours: 1, position: 3 },
      { kind: "work", label: "مهام إدارية", durationHours: 1, position: 4 },
      { kind: "work", label: "رياضة", durationHours: 1, position: 5 },
    ]);
  });
});

describe("shouldSeedTemplate", () => {
  it("seeds anyone who has no template and was never seeded", () => {
    expect(shouldSeedTemplate({ alreadySeeded: false, templateBlockCount: 0 })).toBe(true);
  });

  it("never overwrites a template the user authored", () => {
    expect(shouldSeedTemplate({ alreadySeeded: false, templateBlockCount: 6 })).toBe(false);
  });

  it("does not re-seed a user who deliberately emptied their template", () => {
    expect(shouldSeedTemplate({ alreadySeeded: true, templateBlockCount: 0 })).toBe(false);
  });
});

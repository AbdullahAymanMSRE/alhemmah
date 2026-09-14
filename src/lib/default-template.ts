/**
 * The Template a brand-new user starts with (see CONTEXT.md, "Template").
 *
 * A new account used to land on an empty day, and more than half of all users
 * never created a single Block, so they never saw the product work at all. A
 * seeded Template makes the first day a filled, working one that the user edits
 * down to their own routine instead of authoring from nothing.
 */

export type DefaultTemplateBlock = {
  kind: "work" | "break";
  label: string;
  durationHours: number;
  position: number;
};

/** The shape of the starter day, labelled per language. Durations are shared. */
const SHAPE = [
  { kind: "work", key: "deepWork", durationHours: 2 },
  { kind: "break", key: "break", durationHours: 0.5 },
  { kind: "work", key: "deepWork", durationHours: 2 },
  { kind: "break", key: "lunch", durationHours: 1 },
  { kind: "work", key: "admin", durationHours: 1 },
  { kind: "work", key: "exercise", durationHours: 1 },
] as const;

type LabelKey = (typeof SHAPE)[number]["key"];

const LABELS: Record<"en" | "ar", Record<LabelKey, string>> = {
  en: {
    deepWork: "Deep Work",
    break: "Break",
    lunch: "Lunch",
    admin: "Admin & Email",
    exercise: "Exercise",
  },
  ar: {
    deepWork: "عمل مركّز",
    break: "استراحة",
    lunch: "غداء",
    admin: "مهام إدارية",
    exercise: "رياضة",
  },
};

export function defaultTemplateBlocks(
  language: "en" | "ar",
): DefaultTemplateBlock[] {
  const labels = LABELS[language] ?? LABELS.en;
  return SHAPE.map((b, position) => ({
    kind: b.kind,
    label: labels[b.key],
    durationHours: b.durationHours,
    position,
  }));
}

/**
 * Whether to seed this user's Template. Two guards, both necessary:
 * `templateBlockCount` keeps us from touching a routine the user authored, and
 * `alreadySeeded` keeps us from re-seeding someone who deliberately emptied
 * theirs. Together they let the seed back-fill existing accounts that never got
 * a Template, exactly once.
 */
export function shouldSeedTemplate({
  alreadySeeded,
  templateBlockCount,
}: {
  alreadySeeded: boolean;
  templateBlockCount: number;
}): boolean {
  return !alreadySeeded && templateBlockCount === 0;
}

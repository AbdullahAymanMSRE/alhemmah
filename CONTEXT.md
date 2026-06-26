# Context: Tasker

A personal daily-schedule tracker. Replays a hand-authored daily routine, lets the
user check off what they finish, and keeps a per-day history. Bilingual (Arabic / English),
RTL-aware.

## Glossary

### Block
A single entry in the daily timeline — the primary unit of the app. A Block is either a
**Task block** (a free-text label plus a duration) or a **Break**. It is **self-describing**:
it carries its own label, with no separate master record behind it. Blocks are ordered,
top-to-bottom. There are no clock times — only durations and order. The user follows the
sequence loosely, not on a clock.
_Avoid_: "task type", "category".

### Task
Not a stored entity — just the **label** a Task block carries (e.g. `علم شرعي`, `Work`,
`Gym / جيم`). Two blocks are **the same task** when their labels match after trimming and
ignoring case. A **repeated task** is the same label across several Blocks (e.g. `Work`
split into 2 + 1.5 + 1.5); the app sums their durations into a single total rather than
listing the label more than once. There is no budget or cap on a task's hours.
_Avoid_: "Task Type" (removed — see ADR 0003).

### Tracked time
The actual elapsed time accrued on a Block via its **timer** — distinct from the block's
planned duration. Optional: a block can be ticked done with no tracked time at all, and the
timer is never required. The timer is **wall-clock** (counts real elapsed time even while the
app is closed) and **exclusive** (at most one Block's timer runs at a time per day; starting
one pauses any other). Live start/stop exists only on **today**; past days are read-only.
The planned duration acts as the timer's **target**; when tracked time reaches it the Block is
auto-marked **done** and a browser notification fires.

On reaching target a **Task block's** timer **hands off**: it freezes the finished block at
exactly its target and resumes on the **next not-done block sharing the same task** (same label
— trimmed, case-insensitive — later in the day's order), so a task split across several blocks
times as one continuous session that ticks off each block in turn. Breaks are invisible to the
hand-off (skipped over, never a hand-off target). Only when no later same-task block remains
does the timer keep running **in place** as overtime.

A **Break's** timer also notifies and auto-marks done at target, but never hands off — it just
runs **in place** as overtime (you have run over your break).

Each Block shows its own **numeric** tracked/target time (e.g. `1h 42m / 1h 30m`, where the
surplus reads as overtime) alongside a progress bar that fills toward target and caps at 100%.
The per-day Summary total is unchanged by this feature.
_Avoid_: "stopwatch" (the target makes it a countdown-toward-done, not an open stopwatch).

### Break (استراحة)
A Block that represents rest, not work. Has a duration and an optional label. Excluded from
task totals.

### Template
The fixed, hand-authored ordered list of Blocks that defines the standard day. The user edits
it rarely. The app instantiates a fresh copy each day. Source of truth for the routine.

### Day Record
A single calendar day's instance of the Template: which Blocks were completed, plus any
ad-hoc Blocks added just for that day. Auto-created on first visit of a date, snapshotting
the Template (labels + durations) as it was that day — later Template edits do not change past
Day Records. Every Day Record stays editable (tick/untick, add ad-hoc), past or present.

### Day-start Hour
A per-user setting (default 00:00) defining the rollover boundary — the hour at which a new
Day Record begins. Lets late-night work still count as the previous day. Governs which date is
"today" and how history is bucketed. Unrelated to Block timing (Blocks have no clock times).

### Weekday Exclusion
A per-Block rule marking a Block as not-appearing on specific weekdays (e.g. Gym only some
days). Applied when instantiating the Template for a given date — the seeder skips any Block
excluded on that weekday, regardless of kind. As a convenience, the editor can **copy** one
Block's exclusions onto every other Block sharing its label in a single action; the Blocks
remain independent afterward (editing one does not re-sync the others).

### Label Suggestion
The autocomplete offered while typing a Block's label. Sourced from the distinct work-Block
labels already used anywhere — across the Template and all Day Records — deduped case-
insensitively, most-recently-used first. Shared by the schedule editor and the add-task dialog.

### Ad-hoc Block
A standalone Block (label + duration, optional following break) added directly to a single Day
Record. If left as-is, it lives only in that Day Record. If **promoted** ("Add to my standard
day"), it is appended to the Template as a recurring Block. Promotion affects future days only;
past Day Records are untouched.

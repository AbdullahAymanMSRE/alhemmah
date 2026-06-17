# Context: Tasker

A personal daily-schedule tracker. Replays a hand-authored daily routine, lets the
user check off what they finish, and keeps a per-day history. Bilingual (Arabic / English),
RTL-aware.

## Glossary

### Task Type
A category of work the user does, e.g. `علم شرعي`, `Work`, `Gym / جيم`, `CCAT test practice`.
Lives in the master list (right-hand table in the original sheet). Carries a label and a
user-entered estimated total time. This is the **source**: the user authors Task Types and
their totals first, then arranges them into the Template. The total acts as a planning
**target** — the app indicates when the Template's Blocks for that type don't sum to it, but
never blocks editing.

### Block
A single entry in the daily timeline (left-hand table). A Block is either a portion of a
Task Type (with a duration) or a Break. One Task Type may be split across several Blocks
(e.g. `Work` 5h → 2 + 1.5 + 1.5). Blocks are ordered, top-to-bottom. There are no clock
times — only durations and order. The user follows the sequence loosely, not on a clock.

### Break (استراحة)
A Block that represents rest, not work. Has a duration but no Task Type. Excluded from the
Task Type totals.

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
A rule on a Task Type (or Block) marking it as not-appearing on specific weekdays
(e.g. Gym only some days). Applied when instantiating the Template for a given date.

### Ad-hoc Block
A standalone Block (label + duration, optional following break) added directly to a single Day
Record. Never attached to an existing Task Type. If left as-is, it lives only in that Day
Record. If **promoted** ("Add to my standard day"), it is appended to the Template as a
recurring Block and becomes its own new Task Type (its duration seeds that type's target
total). Promotion affects future days only; past Day Records are untouched.

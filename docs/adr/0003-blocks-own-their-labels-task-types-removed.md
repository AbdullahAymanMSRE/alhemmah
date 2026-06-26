# 3. Blocks own their labels; Task Types removed

Date: 2026-06-26

## Status

Accepted (supersedes ADR 0002, and the Task Type model in ADR 0001-era `CONTEXT.md`)

## Context

The original model made **Task Type** the source: the user authored a master list of types,
each with a target total in hours, then arranged those types into Template **Blocks**. ADR 0002
hardened the target into a budget (a cap enforced at add/grow time, with a "remaining" figure).
A work Block stored no label of its own — it displayed its type's label via a join, and the
type carried the weekday-exclusion rule.

In practice the master list and its budgeting were more ceremony than the user wanted. Authoring
a type before you could schedule it, and being blocked by a cap, got in the way of the actual
task: typing out a day. The user asked to delete the list and instead type labels directly into
the schedule, with autocomplete, and to simply see summed hours for repeated labels.

## Decision

The **Block** becomes self-describing and the **Task Type** entity is removed entirely:

- A work Block stores its own free-text **label**. There is no master list, no per-task target,
  and **no cap** — any hours are allowed. This reverses ADR 0002's budget gate.
- "The same task" is defined by label match (trimmed, case-insensitive). Repeated labels are
  summed into one total in a rollup; rows display the label as typed, totals use a canonical form.
- Labels autocomplete from the distinct work-Block labels used anywhere (Template + all Day
  Records), most-recently-used first.
- **Weekday Exclusion** moves from the type onto each Block. A one-shot "apply to all blocks with
  this label" action copies exclusions onto siblings; blocks stay independent afterward (no
  hidden link — re-introducing a linked entity would resurrect Task Type by the back door).
- Promotion of an ad-hoc Block now appends a Template Block only; it no longer creates a type.

The `task_types` table and the `task_type_id` columns on `template_blocks` and `day_blocks` are
dropped. A data migration first backfills each work Block's label from its type so the existing
routine survives the drop.

## Consequences

- Removes a whole entity, a join, and the budget machinery (client + server gates, "remaining").
  The Plan page collapses from two panels (types + schedule) to one.
- One-way, destructive migration: targets and weekday-exclusion rules that lived on types are not
  recoverable after the drop (exclusions are reconstructable per-block; targets are simply gone).
- Per-block exclusion means a label split across several Blocks must be excluded on each (the
  bulk-apply action mitigates this); there is no longer a single place that owns a task's rule.
- Grouping/totalling is now string-based, so it tolerates near-duplicate labels by normalizing
  rather than by referential identity.

# 2. Task Type total is a hard cap, enforced at add/grow time

Date: 2026-06-22

## Status

Superseded by ADR 0003 (Task Types and their caps were removed entirely).

Originally: Accepted (superseded the soft-target rule described for Task Type in `CONTEXT.md`)

## Context

A Task Type carries a user-entered total in hours, and the Template arranges that type
into one or more work Blocks. Originally (see ADR 0001-era `CONTEXT.md`) the total was a
**soft target**: the app merely *indicated* when a type's Blocks didn't sum to its total
and "never blocks editing." The number was advisory.

In practice the user wanted the total to mean something stronger: while building the
schedule they want to spend a fixed budget of hours per task and be told how much is left,
not silently overspend it. "Don't let me schedule more than the task's total, and show me
what remains."

The tension: enforcing `scheduled ≤ target` as a global invariant is brittle. The target is
also user-editable, so a strict invariant would trap the user the moment they lowered a
target below what they'd already scheduled, forcing destructive trimming.

## Decision

The total becomes a **budget (hard cap)**, but enforced as a **gate at add/grow time**, not
as a global invariant:

- Adding a work Block, growing its duration, retyping its hours, or switching a Block *into*
  a type is **rejected** if it would push that type's scheduled hours past its total. The
  input reverts and an inline message is shown. `remaining = total − scheduled`.
- Enforced in **both** the client (immediate feedback) and the Server Actions
  (`addTemplateWorkBlock` / `updateTemplateBlock`), since client checks can be bypassed.
- **Not** enforced when lowering a target: a target may be set below already-scheduled hours.
  This surfaces as negative remaining (shown red), never an error, never auto-trimming.
- Breaks are unbound, they belong to no type and never count against a budget.

## Consequences

- The advisory "mismatch" display is replaced by a meaningful per-task **remaining** figure
  the user plans against; the Tasks and Schedule views are merged so the budget and the
  spending of it sit side by side.
- "Add/grow time gate" keeps the rule simple and non-trapping: the only place a type can end
  up over budget is by deliberately lowering its target, which is always allowed.
- Because enforcement is point-in-time rather than a DB invariant, there is no constraint
  guaranteeing `scheduled ≤ target` at rest; reports must tolerate negative remaining.
- Reverses a previously documented promise ("never blocks editing"); `CONTEXT.md` updated to
  describe the budget. This ADR records why, for future readers who find the older framing.

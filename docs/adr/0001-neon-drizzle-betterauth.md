# 1. Neon + Drizzle + BetterAuth, with server-side authorization

Date: 2026-06-17

## Status

Accepted

## Context

Tasker is a multi-user, hosted web app: each user owns their own Task Types, Template,
and per-day history, reachable from both laptop and phone. We needed to choose where data
lives, how identity is handled, and how per-user authorization is enforced.

Alternatives considered:

- **Supabase (Postgres + Auth + RLS)**: one vendor, batteries included. Downsides: Row-Level
  Security policies are powerful but fiddly to author and easy to get subtly wrong, and the
  auth model pushes you toward client-side data access.
- **Neon (Postgres) + Drizzle ORM + BetterAuth**: pure serverless Postgres, a typed schema/
  query layer, and a self-hosted auth library. More pieces, but each is small and explicit.

## Decision

- **Neon** for serverless Postgres.
- **Drizzle ORM** for a typed schema and queries.
- **BetterAuth** for identity (email/password + Google OAuth).
- **Authorization enforced in our own server layer**: every query is scoped by `user_id` in
  server-side code (Server Actions / route handlers). We deliberately do **not** rely on
  Postgres RLS.

## Consequences

- Schema is typed and explicit; migrations are code-reviewed via Drizzle.
- Authorization lives in one auditable place (the server data layer) rather than in DB
  policies, simpler to reason about for a small app, at the cost of discipline: every query
  MUST filter by the authenticated `user_id`. A missed filter is a data leak, so this is the
  one invariant to guard in review.
- No vendor lock-in to Supabase's auth/RLS model; swapping Neon for any other Postgres is a
  connection-string change.
- More initial wiring than Supabase's all-in-one, accepted in exchange for clarity and control.

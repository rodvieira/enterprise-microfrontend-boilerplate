# 0010 — Remote examples: dashboard + admin

**Status:** Accepted

## Context

Every competitor researched (Piral, single-spa, Nx's own official examples)
ships toy domain examples (shop, cart, "characters") that prove federation
mechanics but never prove the operational concerns real teams hit: shared
state, cross-remote communication, or what a second team building a second
remote actually needs.

## Decision

Ship two remotes:

- **`apps/dashboard`** — analytics/overview (KPI cards, activity chart, recent
  activity feed).
- **`apps/admin`** — users & permissions (user table, invite/edit modal, role
  change action).

These mirror the most common real enterprise micro-frontend adoption pattern:
an internal backoffice portal split by team ownership.

## The proof point

When Admin changes a user's role, Dashboard's "active users" KPI updates live,
with no reload and no direct coupling between the two apps — the update
travels through `packages/event-bus`. This is the detail the README demo GIF
is built around, and it's the thing that proves the architecture works beyond
"two apps can be loaded side by side."

## Consequences

Any future third remote should be chosen with the same bar: does it prove
something the existing two don't, or is it just another CRUD screen?

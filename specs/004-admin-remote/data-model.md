# Phase 1 Data Model: Admin Remote

**Feature**: `004-admin-remote` | **Date**: 2026-08-06

Two data surfaces: the admin remote's own user-management fixture (internal
to `apps/admin`), and the one typed event that crosses the federation
boundary through `packages/event-bus`.

---

## User (reused, not redefined)

`packages/shared-types`'s existing `User`/`Role`/`Permission` (sprint 2) are
used exactly as they are — `id`, `name`, `email`, `role`, `permissions`. No
new fields. `apps/admin/src/internal/users/fixtures.ts` owns a mutable
in-memory list of these, seeded with enough rows to prove pagination
(`FR-006`) — at least 25, to guarantee more than one page at any reasonable
page size.

**Mutation surface**: invite appends a new `User` (with `permissions`
derived via `permissionsForRole`, same as the auth stub does); a role
change replaces one user's `role` and re-derives `permissions` the same
way. Both are the *only* mutations this fixture supports — no delete, no
field edits beyond role, matching the spec's stated scope.

---

## RoleChangedEvent

The one event type `packages/event-bus`'s `EventMap` carries this sprint.

| Field | Type | Rules |
|---|---|---|
| `userId` | `string` | The changed user's `id` — an opaque identifier, not their name or email (nothing about admin's internal state beyond what's needed, per Key Entities in spec.md). |
| `newRole` | `Role` | The role after the change. |

**Published**: once per successful role-change submission
(`apps/admin/src/internal/users/`), after the fixture mutation succeeds —
never published for a rejected/invalid submission (`FR-011`).

**Consumed**: `apps/dashboard/src/exposed/App.tsx`, via
`useEventSubscription('user:role-changed', handler)`. The handler
increments the dashboard's locally-held "active users" adjustment by 1
(research D3) — it does not read `userId` or `newRole` beyond receiving the
event at all, since the dashboard has no reason to know which user or role
changed, only that a role-change happened.

---

## EventMap (the pub/sub contract's shape)

```ts
export interface EventMap {
  'user:role-changed': RoleChangedEvent;
}
```

**Deliberately closed union, not `Record<string, unknown>`**: a topic not
listed here fails type-checking at both `publish` and `subscribe` call
sites — the same discipline `Permission` and `Role` already use. Adding a
second event later is a type addition, not an API change (research D2).

---

## Pagination / sort state (internal to `apps/admin`, not shared)

| Field | Type | Rules |
|---|---|---|
| `page` | `number` | 0-indexed. Reset to `0` whenever the sort changes or a user is added, so a newly invited user is always reachable without hunting for the page it landed on. |
| `pageSize` | `number` | Fixed for this sprint — not user-configurable (no requirement asks for it). |
| `sortColumn` | `'name' \| 'email' \| 'role'` | Which column drives ordering. |
| `sortDirection` | `'asc' \| 'desc'` | |

Held in `apps/admin/src/internal/users/` component state — never exposed
outside the admin remote, and not part of `RoleChangedEvent` or any other
cross-boundary shape (research D6: pagination stays admin-local).

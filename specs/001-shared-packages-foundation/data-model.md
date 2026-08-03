# Phase 1 Data Model: Shared Packages Foundation

**Feature**: `001-shared-packages-foundation` | **Date**: 2026-08-02

These are the shared contracts that live in `@enterprise-mfe/shared-types`. They
are type declarations only — no runtime code ships from this package (FR-014).
Each concept is defined exactly once in the workspace (FR-015, SC-004).

---

## Permission

A named capability that can be granted to a person and checked before an action
is allowed.

| Field | Type | Rules |
|---|---|---|
| — | `string` union | Closed union, not an open `string`. |

Defined as a union of literal values rather than a free-form string, so a typo in
a permission check fails type-checking instead of silently denying access at
runtime. The initial set covers what the two planned remotes need:

- `users:read` — view the user list
- `users:write` — invite, edit, and change roles
- `dashboard:read` — view analytics

**Validation**: A value outside the union is a compile-time error. There is no
runtime validation, because nothing crosses a network boundary in this sprint.

---

## Role

A named bundle of permissions, so the admin remote can change one thing rather
than reconciling a permission list.

| Field | Type | Rules |
|---|---|---|
| — | `'admin' \| 'editor' \| 'viewer'` | Closed union. |

**Relationship**: Each role maps to a fixed set of `Permission` values. The
mapping is data, exported alongside the type, so both the admin remote (which
changes roles) and the dashboard (which reacts) read the same table.

**State transitions**: A person's role changes through the admin remote. That
change is what the cross-remote event bus will broadcast in sprint 6 — out of
scope here, but the shape must not need to change when it arrives.

---

## User

Someone with an identity in the system.

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Stable, opaque, non-empty. Never reused. |
| `name` | `string` | Display name. Non-empty. |
| `email` | `string` | Unique per user. Not validated at runtime in this sprint. |
| `role` | `Role` | Exactly one. |
| `permissions` | `readonly Permission[]` | Derived from `role`. Readonly so a consumer cannot mutate another consumer's copy. |

**Relationships**: A `User` holds one `Role`, which resolves to many
`Permission` values. Referenced by `Session` and, later, by the admin remote's
user table and the dashboard's active-user metric.

**Scope boundary**: Deliberately does not model profile management, groups,
organizations, or authentication credentials. Credentials never enter this model
— the stub has no password and a real provider's tokens never reach it
(Principle VI).

---

## Session

The current authentication state of the running application. Exactly one exists
per application (FR-009).

| Field | Type | Rules |
|---|---|---|
| `status` | `'unknown' \| 'authenticated' \| 'unauthenticated'` | Three states, not a boolean. |
| `user` | `User \| null` | Non-null if and only if `status` is `authenticated`. |
| `isAuthenticated` | `boolean` | Derived; true only when `status` is `authenticated`. |

**Why three states**: A boolean cannot distinguish "we have not determined this
yet" from "signed out". With only a boolean, every protected screen renders its
signed-out fallback on first paint and then corrects itself — the flash of
unauthenticated content this model exists to prevent (spec edge case 1).

**State transitions**:

```text
unknown ──login()──▶ authenticated ──logout()──▶ unauthenticated
   │                                                     │
   └──────────── initialization resolves ────────────────┘
                    (stub: immediately)
```

- `unknown` is the initial state. The stub leaves it within a tick; a real
  provider would leave it after restoring or failing to restore a session.
- `login()` moves to `authenticated` and populates `user`.
- `logout()` moves to `unauthenticated` and clears `user` to `null`.
- No transition back to `unknown` after initialization.

**Invariant**: `user !== null` exactly when `status === 'authenticated'`. Any
other combination is a defect and must be unrepresentable through the public
contract.

---

## Component contract types

Prop shapes for anything intended to cross an app boundary, defined once so both
sides agree (FR-013).

| Type | Represents |
|---|---|
| `RemoteAppProps` | What the shell passes into a remote's exposed root component. |
| `WithClassName` | The style hook every design-system component accepts and forwards (FR-004). |

`RemoteAppProps` is defined now even though no remote exists, because the shell
and both remotes in sprints 3–5 must be written against the same shape rather
than each inventing one. It stays minimal: what a remote needs from its host and
nothing speculative.

---

## Ownership

| Concept | Defined in | Consumed by |
|---|---|---|
| `Permission`, `Role`, `User` | `@enterprise-mfe/shared-types` | `auth`, later `admin` and `dashboard` |
| `Session` | `@enterprise-mfe/auth` (composed from `User`) | every app |
| `WithClassName`, `RemoteAppProps` | `@enterprise-mfe/shared-types` | `ui`, later the shell and remotes |

`shared-types` depends on nothing. `auth` depends on `shared-types`. `ui` depends
on `shared-types` for `WithClassName` only, and never on `auth` (FR-005).

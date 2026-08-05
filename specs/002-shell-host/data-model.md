# Phase 1 Data Model: Shell Host

**Feature**: `002-shell-host` | **Date**: 2026-08-03

The shell's data is configuration, not domain data: what remotes exist, where
they live, which origins may be executed from, and where each region is in its
lifecycle.

---

## RemoteRegistry

The fetched document that tells the host what it may compose. One per
environment; exactly one is deployed beside the built assets as `remotes.json`.

| Field | Type | Rules |
|---|---|---|
| `environment` | `'dev' \| 'staging' \| 'production'` | Must match the file it was deployed from. Reported in diagnostics so a wrong deployment is visible. |
| `allowedOrigins` | `readonly string[]` | Origins the host may execute code from. May be empty — an empty list with a non-empty `remotes` is a configuration error, not "allow all". |
| `remotes` | `readonly RemoteRegistration[]` | May be empty. An empty registry is a valid state (US1 scenario 2). |

**Validation** (`FR-009`), all at startup, all naming the file:

- The document must parse. A parse failure names the file and the environment.
- `environment` must be one of the three.
- No two registrations may share a `name` — a duplicate is reported, never
  resolved last-wins (spec edge case 1).
- Every registration must pass origin control (see `OriginDecision`).

**Lifecycle**: fetched once at startup, before the first render that could mount
a remote. Never re-fetched — a registry change is a deployment, not a runtime
event.

---

## RemoteRegistration

One remote as the host knows it. The unit a team adds when shipping a remote, and
the only thing that changes to add one (`FR-008`, `SC-003`).

| Field | Type | Rules |
|---|---|---|
| `name` | `string` | Unique within the registry. Matches the name the remote's own build declares, or nothing loads. |
| `entry` | `string` | Absolute URL of the remote's entry manifest. Subject to origin control. |
| `routePath` | `string` | The path the host mounts it under. Leading slash, no trailing slash. |
| `label` | `string` | What navigation shows a person. |

**Relationships**: each registration produces exactly one route and at most one
mounted region. A registration whose `routePath` collides with a host-owned route
is a configuration error reported at startup (`FR-009` and US2 scenario 3).

**Deliberately absent**: anything about what the remote exposes beyond its entry.
The host mounts a remote's root and nothing else — the contract is one exposed
component, so a richer description would be speculative until sprint 4 proves
otherwise.

---

## OriginDecision

The result of checking one registration against the allow-list. The security
boundary of the whole composition (`FR-016`–`FR-018`).

| Field | Type | Meaning |
|---|---|---|
| `allowed` | `boolean` | Whether the remote may be registered at all. |
| `reason` | `'ok' \| 'origin-not-allowed' \| 'insecure-transport' \| 'malformed-url'` | Why. Never absent, including on success. |
| `origin` | `string` | The origin that was judged, echoed for the diagnostic. |

**Rules**:

1. The `entry` must parse as a URL. Otherwise `malformed-url`.
2. Its origin must appear in `allowedOrigins`. Otherwise `origin-not-allowed`.
3. The transport must be secure, **unless** the host is a loopback address, in
   which case insecure is permitted (spec Assumptions — without this, nothing
   runs locally). Otherwise `insecure-transport`.

**State transition**: a registration that fails any rule is dropped before
`registerRemotes()` is called. It never becomes a `RemoteLoadState`, because the
host never attempts to load it — refusal happens before any code is fetched.

---

## RemoteLoadState

Where one region is in its lifecycle. What decides whether a region shows
content, a loading state, or an error (`FR-013`).

```text
                 ┌──────────────┐
   refused ◀─────│ registration │────▶ idle ──▶ loading ──▶ loaded
   (never         └──────────────┘                 │
    attempted)                                     ▼
                                                 failed ──retry──▶ loading
```

| State | Renders | Reachable from |
|---|---|---|
| `idle` | nothing yet | initial |
| `loading` | the in-progress state, never a blank region | `idle`, `failed` |
| `loaded` | the remote's component | `loading` |
| `failed` | the error state, with a retry affordance | `loading` |
| `refused` | the error state, stating the origin and why | never enters loading |

**Invariants**:

- A region in any state other than `loaded` MUST NOT prevent the rest of the
  application rendering or navigating (`FR-012`). This is the guard rail, and it
  is what US3 tests.
- `failed → loading` happens without a full application reload (`FR-014`).
- A remote that loads but exposes nothing usable is `failed`, not `loaded` with
  an empty region (spec edge case 3).

---

## Ownership

| Concept | Defined in | Consumed by |
|---|---|---|
| `RemoteRegistry`, `RemoteRegistration` | the shell's federation module | the shell only |
| `OriginDecision` | the shell's federation module | the shell only |
| `RemoteLoadState` | `@enterprise-mfe/federation-utils` | the shell, and every remote from sprint 4 |

The registry types stay in the shell because nothing else may read the registry —
a remote that could see the registry would know about its siblings, which is the
coupling the architecture exists to prevent. Only the load-state vocabulary is
shared, because remotes will compose remotes eventually.

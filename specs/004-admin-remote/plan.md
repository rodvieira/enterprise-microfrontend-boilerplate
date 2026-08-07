# Implementation Plan: Admin Remote

**Branch**: `004-admin-remote` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-admin-remote/spec.md`

## Summary

Build `apps/admin` — the second micro-frontend remote — mirroring
`apps/dashboard`'s scaffold exactly (Rspack remote config, the
exposed/internal split, the CSS-in-exposed-entry and default-export
conventions `003-dashboard-remote` established). Its domain, fixed by
ADR-0010: a paginated/sorted user table, and an invite/edit modal gated by
the `users:write` permission that can add a user or change one's role.

The sprint's actual headline is `packages/event-bus`: a typed pub/sub,
relayed across same-origin browser tabs via `BroadcastChannel`, that lets a
role change in admin update the dashboard's "active users" KPI live — no
reload, no direct import between the two remotes. This is the proof point
ADR-0010 exists for, and everything else in this sprint is a prerequisite
for it.

Two decisions carry real risk if skipped. First, `BroadcastChannel`: the
spec's own scenario describes two *separate browser tabs*, which an
in-memory-only bus cannot reach at all — caught by checking the spec
against the design before writing code, not after. Second, permission
gating is done locally in `apps/admin`, not by extending `packages/auth`'s
`ProtectedRoute` contract — the stub's single fixed identity means the
"denied" path is proven by a mocked-`useAuth()` component test, not an
interactive one.

## Technical Context

**Language/Version**: TypeScript 5.9, strict; React 19.2.8

**Primary Dependencies**: `@rspack/core` + `@rspack/cli` 2.1.7,
`@rspack/dev-server` 2.2.0, `@module-federation/enhanced` 2.8.1,
`@tailwindcss/postcss` + `tailwindcss` 4.3.3, `postcss` 8.5.25,
`postcss-loader` 8.2.1, `react-router` 8.3.0 — all already project
dependencies, applied to a second app, not new decisions. **Zero new
external dependencies this sprint** — `packages/event-bus` is `~20` lines
over `Map` and the native `BroadcastChannel` Web API, deliberately not a
`mitt`/`nanoevents` dependency (research D2).

**Storage**: N/A. The user list is an in-module fixture
(`apps/admin/src/internal/users/fixtures.ts`), matching
`apps/dashboard`'s pattern — this project has no backend.

**Testing**: Vitest (component/unit — pagination, sorting, invite/edit
validation, the permission-denied path via a mocked `useAuth()`, and
`packages/event-bus`'s publish/subscribe/unsubscribe/`BroadcastChannel`
relay in isolation) plus Playwright (`apps/shell/e2e/`, extended with the
cross-remote live-update scenario — the first multi-tab-shaped e2e
assertion in this project).

**Target Platform**: Evergreen browsers (matches `BroadcastChannel`'s
support baseline — no polyfill needed); Node 22.22.2+ for tooling,
unchanged.

**Project Type**: Monorepo — third application (`apps/admin`), one new
shared package (`packages/event-bus`), one changed file in an existing app
(`apps/dashboard`'s `App.tsx`, to subscribe).

**Performance Goals**: No numeric target — `SC-005`'s "immediate" is a
push-based guarantee (no polling), not a latency budget (research D3).

**Constraints**: `apps/admin/package.json` MUST declare `react`,
`react-dom`, `react-router`, `@enterprise-mfe/auth`, and
`@enterprise-mfe/event-bus` at versions identical to every other manifest
in `scripts/check-shared-deps.ts` (`FR-018`). Registering the remote
touches only the registry file (`FR-020`) — no further shell change is
expected, unlike `003-dashboard-remote`, which had to build the
route-patching mechanism this sprint reuses unchanged.

**Scale/Scope**: 1 app, 1 new package, 1 changed file in an existing app,
1 registry entry, 25+ fixture users (enough to force pagination).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | Yes | ✅ | `apps/admin/src` splits into `exposed/App.tsx` (imports its own `styles.css`, has a default export — both `003-dashboard-remote` findings applied from the start) and `internal/`. |
| II — No Cross-App Relative Imports | **Yes, third real app** | ✅ | `apps/admin` and `apps/dashboard` communicate only through `packages/event-bus` — never a relative import into each other. User Story 5 requires a **deliberate violation demonstrated failing**, the next real data point after `003-dashboard-remote` closed issue #6. |
| III — Singleton Shared Dependencies | **Yes, second singleton package** | ✅ | `react`, `react-dom`, `react-router`, `@enterprise-mfe/auth` pinned to every other manifest's exact versions. `@enterprise-mfe/event-bus` **joins `SINGLETONS`** in this sprint (`FR-018`) — the stale "sprint 6" comment is corrected, not left to drift further (research D7). Demonstrated failing on a deliberate mismatch, then passing after revert (`FR-019`). |
| IV — Conventions Documented, Never Assumed | Yes | ✅ | Pagination/sort staying `apps/admin`-local rather than extracted to `packages/ui` (D6) and the local-permission-check-over-`ProtectedRoute`-extension choice (D4) are both documented decisions with a stated "what would change this," not silent scope-narrowing. |
| V — Generator After Two Remotes | **No — this sprint is what enables it** | ✅ | No generator work here. `apps/admin` is the *second* of the two remotes ADR-0008 requires before sprint 7 can start; building the generator now would violate it directly. |
| VI — Auth Is a Contract, Not an Implementation | Yes | ✅ | `useAuth()` is read, not extended with new session capability — the permission check (D4) reads `user.permissions`, already part of the existing `User` contract from sprint 2. No login flow, no stub change. |
| VII — Decisions Superseded, Never Rewritten | Yes | ✅ | No ADR is edited. No new ADR expected specifically from this sprint — it fulfills ADR-0008 and ADR-0010, which are already on record. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scopes `admin` and `event-bus` are already in `commitlint.config.mjs`'s allow-list. |
| IX — Every Dependency Justified | **Yes — zero new dependencies** | ✅ | `packages/event-bus` is deliberately dependency-free (`Map` + native `BroadcastChannel`) — the one-line justification *is* "this needed no new dependency," recorded in research D2 as the alternative a `mitt`/`nanoevents` choice was weighed against and rejected. |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-remote/
├── plan.md                          # This file
├── spec.md                          # Feature specification
├── research.md                      # Phase 0 — decisions D1–D7
├── data-model.md                    # Phase 1 — User (reused), RoleChangedEvent, EventMap, pagination/sort state
├── quickstart.md                    # Phase 1 — how to validate
├── contracts/
│   ├── event-bus-contract.md        # packages/event-bus's public API
│   └── registry-entry.md            # the exact registry-contract.md entry this sprint adds
├── checklists/
│   └── requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/event-bus/
├── src/
│   ├── event-map.ts                 # EventMap, RoleChangedEvent
│   ├── bus.ts                       # publish/subscribe over Map + BroadcastChannel
│   ├── use-event-subscription.ts    # the React convenience hook
│   └── index.ts
├── tests/
├── package.json                     # @enterprise-mfe/event-bus, react as a peerDependency (for the hook only)
├── tsconfig.json
└── README.md

apps/admin/
├── src/
│   ├── exposed/
│   │   └── App.tsx                        # RemoteAppProps in; imports internal/styles.css directly
│   ├── internal/
│   │   ├── users/
│   │   │   ├── fixtures.ts                # 25+ seeded User rows (data-model.md)
│   │   │   ├── use-user-list.ts           # pagination + sort state, owns the mutable fixture
│   │   │   ├── user-table.tsx             # wraps @enterprise-mfe/ui's Table
│   │   │   ├── pagination-controls.tsx    # Button-based prev/next, admin-local (research D6)
│   │   │   └── user-form-modal.tsx        # invite/edit, wraps @enterprise-mfe/ui's Modal
│   │   ├── permissions/
│   │   │   └── use-can-write-users.ts     # the local users:write check (research D4)
│   │   └── styles.css
│   └── index.tsx / bootstrap.tsx          # same standalone-entry shape as apps/dashboard
├── tests/
├── rspack.config.ts                       # name: 'admin', exposes './App', port 3002
├── package.json
├── tsconfig.json
└── README.md

apps/dashboard/
└── src/exposed/App.tsx              # gains useEventSubscription('user:role-changed', …) — the only change to an existing app

apps/shell/
├── src/internal/federation/remotes.dev.json   # the one line this sprint adds — contracts/registry-entry.md
└── e2e/dashboard-composition.spec.ts          # extended with the cross-remote live-update scenario, or a sibling admin-composition.spec.ts — decided at task-breakdown time

scripts/check-shared-deps.ts          # @enterprise-mfe/event-bus uncommented into SINGLETONS; stale "sprint 6" comment removed
```

**Structure Decision**: `apps/admin` takes the exact `exposed/`/`internal/`
shape `apps/dashboard` proved, including both of its findings applied from
the outset rather than rediscovered (`exposed/App.tsx` imports its own
stylesheet; has a default export). `packages/event-bus` sits alongside
`packages/federation-utils` — no bundler dependency, testable in isolation,
consumed by two apps that never import each other directly.

Pagination/sort controls and the permission check stay inside
`apps/admin/src/internal/`, not extracted to shared packages this sprint
(research D4, D6) — both are one-consumer decisions today, and extraction
is deferred to whichever later sprint gives them a second real consumer to
design against, the same discipline ADR-0008 applies to the generator.

**Build order within the feature**:

1. `packages/event-bus` — no bundler dependency, testable before any app
   exists to consume it; unblocks both admin (publisher) and dashboard
   (subscriber) work in parallel.
2. `apps/admin` scaffolding — Rspack remote config exposing `./App`,
   standalone entry, styling pipeline (mirroring `003-dashboard-remote`'s
   Phase 1–2, now a known pattern rather than one being discovered).
3. The user table — fixtures, pagination, sort, wired to `Table`.
4. The invite/edit modal — form, validation, the local permission check,
   wired to `Modal` and `ProtectedRoute` (session-only) plus the local
   `users:write` check (permission-only).
5. Publish `user:role-changed` on a successful role-change submission.
6. Subscribe in `apps/dashboard`'s `App.tsx` — the only change to an
   existing app this sprint makes.
7. Register `admin` in `remotes.dev.json` (`contracts/registry-entry.md`);
   confirm three-way composition (shell + dashboard + admin) by hand.
8. **Guard rail retest** — deliberate cross-app import and
   `@enterprise-mfe/event-bus` singleton mismatch, demonstrated failing
   then reverted (`FR-017`, `FR-019`, `US5`). Correct
   `scripts/check-shared-deps.ts`'s stale comment (research D7).
9. e2e — the cross-remote live-update scenario, the first real proof of
   this sprint's headline claim.
10. Documentation (`apps/admin/README.md`, `packages/event-bus/README.md`,
    `docs/packages.md`, `docs/architecture.md`).

Step 1 before step 2 mirrors `003-dashboard-remote`'s own lesson (data
contract before any UI consumes it — a broken fixture or a broken pub/sub
primitive is caught by a unit test, not discovered mid-integration).

## Complexity Tracking

No constitutional violations. Nothing to justify.

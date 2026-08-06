# Implementation Plan: Dashboard Remote

**Branch**: `003-dashboard-remote` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-dashboard-remote/spec.md`

## Summary

Build `apps/dashboard` — the first micro-frontend remote — as a Module
Federation remote on Rspack, exposing one root component (`./App`) that the
shell already knows how to load. The domain is fixed by ADR-0010: KPI cards
(active users, usage trend), an activity-over-time chart, and a recent
activity feed, each proving a distinct technical claim rather than three
arbitrary widgets — async data fetching isolated inside a remote, a
third-party visualization library isolated inside federation, and a list
built from the shared design system's existing `Table`.

Two things carry the sprint beyond the domain UI itself. This is the first
time the boundary gate and the singleton drift check run against **two real
applications**, which doubles as the first real retest of issue #6. And it is
the first sprint where `pnpm e2e` does anything — 002's research explicitly
deferred Playwright until a real remote existed to compose (D6).

Live cross-remote KPI updates (ADR-0010's "Admin role change → Dashboard KPI"
demo) are **not** built here: `apps/admin` and `packages/event-bus` don't
exist yet, and `scripts/check-shared-deps.ts` already defers the event-bus
singleton to the sprint that introduces it. This sprint proves the domain in
isolation; the cross-remote wiring is sprint 5's dependency on this one, not
the reverse.

## Technical Context

**Language/Version**: TypeScript 5.9, strict; React 19.2.8

**Primary Dependencies**: `@rspack/core` + `@rspack/cli` 2.1.7,
`@rspack/dev-server` 2.2.0, `@module-federation/enhanced` 2.8.1 — pinned to
the shell's exact currently-installed versions, not the newer registry
latest (research D1) — `recharts` 3.10.1 (new, D3), `@tailwindcss/postcss` +
`tailwindcss` 4.3.3, `postcss` 8.5.25, `postcss-loader` 8.2.1, `react-router`
8.3.0, `@playwright/test` 1.62.1 (new, scoped to `apps/shell`, D6) — each
justified in the pull request per Principle IX

**Storage**: N/A. `DashboardOverview` is an in-module fixture (D5); nothing
is persisted.

**Testing**: Vitest (component/unit, all loading/error/empty states and the
data-fetch contract) plus, for the first time in this project, Playwright
(`apps/shell/e2e/`) exercising the shell composing this remote for real (D6).

**Target Platform**: Evergreen browsers; Node 22.22.2+ for tooling — same
floor as the shell, unchanged by this feature.

**Project Type**: Monorepo — second application (`apps/dashboard`), one new
component in an existing shared package (`packages/ui`'s `Card`), one new
project-wide dependency category (e2e).

**Performance Goals**: No numeric target. The spec's measurable bar is
behavioral — every loading state resolves to populated or failed, never
hangs (`SC-002`) — not a latency budget, since the data source is a fixture,
not a real backend.

**Constraints**: `apps/dashboard/package.json` MUST declare `react`,
`react-dom`, `@enterprise-mfe/auth`, and `react-router` at versions
identical to every other manifest in `scripts/check-shared-deps.ts`
(`FR-015`). Registering the remote in the shell's dev registry MUST touch
only registry files (`FR-017`). Under ADR-0011's hoisted layout, every
imported package must be declared in the importing package's own manifest.

**Scale/Scope**: 1 app, 1 new shared component, 2 new dependencies
(`recharts`, `@playwright/test`), 1 registry entry, ~3 new/changed
non-domain files (`vitest.config.mts`, `.dependency-cruiser.js` needs no
change — its rules are already pattern-based over `apps/*`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | **Yes, first real remote** | ✅ | `apps/dashboard/src` splits into `exposed/App.tsx` (the one thing federation exposes) and `internal/` (data fetch, KPI/chart/feed components, fixtures). Nothing outside the app imports `internal/` — enforced by the same dependency-cruiser rules the shell already proved. |
| II — No Cross-App Relative Imports | **Yes, first time with two real apps** | ✅ | `apps/dashboard` and `apps/shell` communicate only through the registry + federation loader. User Story 5 requires a **deliberate violation demonstrated failing**, the first real second-app data point for issue #6 (`FR-014`, `SC-005`). |
| III — Singleton Shared Dependencies | Yes | ✅ | `react`, `react-dom`, `react-router`, `@enterprise-mfe/auth` pinned to the shell's exact versions (`FR-015`). `pnpm check:shared-deps` gains its second manifest and is demonstrated failing on a deliberate mismatch, then passing after revert (`FR-016`, `SC-006`). `@enterprise-mfe/event-bus` is deliberately **not** added — it isn't a dependency of this app yet (see Summary, D5's rationale). |
| IV — Conventions Documented, Never Assumed | Yes | ✅ | The `Card` component's home (`packages/ui`, not dashboard-internal) is a documented design-system decision (D4), not assumed. Federation config living inline in `rspack.config.ts` follows the shell's own precedent rather than inventing a `federation.config.ts` nobody else has. |
| V — Generator After Two Remotes | No | ✅ | This is the *first* of the two remotes the generator (sprint 7) will be extracted from. No generator work here — building it now would violate ADR-0008 directly. |
| VI — Auth Is a Contract, Not an Implementation | Yes | ✅ | The dashboard reads the session through `useAuth()` (`FR-005`); no login flow, no new auth code. |
| VII — Decisions Superseded, Never Rewritten | Yes | ✅ | No ADR is edited. No new ADR is expected from this sprint specifically — the domain and build-order decisions it executes (ADR-0008, ADR-0010) are already on record; this sprint is their fulfillment, not a new decision. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scope `dashboard` is already in `commitlint.config.mjs`'s allow-list; `ui` covers the `Card` addition. |
| IX — Every Dependency Justified | Yes | ✅ | Two new dependencies this sprint — `recharts` (D3) and `@playwright/test` (D6) — each with a one-line justification recorded in research and repeated in the pull request. |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-dashboard-remote/
├── plan.md                          # This file
├── spec.md                          # Feature specification
├── research.md                      # Phase 0 — decisions D1–D7
├── data-model.md                    # Phase 1 — DashboardOverview, KpiMetric, ActivityDataPoint, ActivityFeedItem
├── quickstart.md                    # Phase 1 — how to validate
├── contracts/
│   ├── dashboard-data-contract.md   # fetch-overview.ts's internal contract
│   └── registry-entry.md            # the exact registry-contract.md entry this sprint adds
├── checklists/
│   └── requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/dashboard/
├── src/
│   ├── exposed/
│   │   └── App.tsx                        # what the shell mounts; RemoteAppProps in, session read via useAuth()
│   ├── internal/
│   │   ├── data/
│   │   │   ├── fetch-overview.ts          # the fixture async source (D5, contracts/dashboard-data-contract.md)
│   │   │   ├── fixtures.ts                # the in-module KPI/activity/feed fixture data
│   │   │   └── use-dashboard-overview.ts  # thin hook: fetch-overview.ts → FetchState
│   │   ├── kpi/
│   │   │   ├── kpi-cards.tsx              # renders DashboardOverview.kpis via packages/ui's new Card
│   │   │   └── kpi-card.tsx
│   │   ├── chart/
│   │   │   └── activity-chart.tsx         # recharts, wraps DashboardOverview.activity
│   │   ├── feed/
│   │   │   └── recent-activity.tsx        # Table + emptyState, wraps DashboardOverview.feed
│   │   └── styles.css                     # imports design-system tokens.css, declares @source — same pattern as shell
│   └── index.tsx                          # standalone dev entry (US1 edge case: runs with no shell)
├── tests/
│   ├── fetch-overview.test.ts
│   ├── kpi-cards.test.tsx
│   ├── activity-chart.test.tsx
│   ├── recent-activity.test.tsx
│   └── app.test.tsx
├── rspack.config.ts                       # remote config; name: 'dashboard', exposes './App', port 3001
├── index.html
├── package.json
├── tsconfig.json
└── README.md

packages/ui/src/components/
└── card.tsx                               # new: the KPI card's shared-design-system primitive (D4)

apps/shell/
├── e2e/                                   # new (D6): first real Playwright specs in this project
│   └── dashboard-composition.spec.ts
├── src/internal/federation/
│   └── remotes.dev.json                   # the one line this sprint adds — see contracts/registry-entry.md
└── package.json                           # gains "e2e": "playwright test", @playwright/test devDependency

vitest.config.mts                          # gains browserProject('dashboard', './apps/dashboard') (D7)
```

**Structure Decision**: `apps/dashboard` takes the exact `exposed/` +
`internal/` shape `apps/shell` established in sprint 3 — the first proof that
convention travels to a second app rather than being an artifact of the
shell being first. `src/internal/data/` is kept separate from the three
UI-surface directories (`kpi/`, `chart/`, `feed/`) so the fixture and its
fetch contract stay swappable for a real data source later without touching
any rendering code (research D5).

`Card` lands in `packages/ui`, not `apps/dashboard/src/internal`, because
nothing about it is dashboard-specific (D4) — the same reasoning that put
`Table`, `Modal`, and the rest in the shared package rather than duplicated
per app.

`apps/shell/e2e/` rather than a new top-level e2e-only workspace member,
because the thing under test is the shell's composition behavior, and the
shell already owns every other cross-app-facing concern (the registry, the
loader, the boundary) — see research D6 for the alternative considered and
rejected.

**Build order within the feature**:

1. `packages/ui`'s `Card` component — small, no federation dependency,
   unblocks the KPI surface (D4).
2. `apps/dashboard/src/internal/data/` — `fetch-overview.ts` and its fixture,
   testable in isolation before any UI exists (contracts/dashboard-data-contract.md).
3. `apps/dashboard` scaffolding — Rspack remote config exposing `./App`,
   standalone entry, an app that renders "hello" composed of nothing yet.
4. The three domain surfaces — KPI cards, chart, feed — each wired to
   `useDashboardOverview`'s `FetchState`, each with its loading/error/empty
   test.
5. Register in `remotes.dev.json` (`contracts/registry-entry.md`); confirm
   composition in the shell by hand.
6. `vitest.config.mts` project entry (D7) — needed before dashboard's own
   test suite can run via `pnpm test`.
7. **Guard rail retest (issue #6)** — deliberate cross-app import and
   singleton mismatch, demonstrated failing then reverted (`FR-014`, `FR-016`,
   `US5`).
8. `apps/shell/e2e/` — the first real Playwright run, composed shell +
   dashboard (D6).
9. Documentation (`apps/dashboard/README.md`, `docs/packages.md` update for
   `Card`).

Step 2 before step 3 is deliberate, mirroring 002's lesson about proving the
styling pipeline early: proving the data contract before any component
consumes it means a broken fixture is caught by a unit test, not discovered
while debugging a blank card.

## Complexity Tracking

No constitutional violations. Nothing to justify.

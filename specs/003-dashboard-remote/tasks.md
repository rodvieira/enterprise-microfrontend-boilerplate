---

description: "Task list for Dashboard Remote"
---

# Tasks: Dashboard Remote

**Input**: Design documents from `/specs/003-dashboard-remote/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, and `SC-008`
require proven behavior — every loading/error/empty state and both guard-rail
retests are named tests or named verification steps, not folded into "build the
component."

**Organization**: Grouped by the five prioritized user stories from spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task names an exact file path

## A note on how stories map to phases

US1 (the shell composes a real remote) and US2 (KPI cards) are both P1, but
US1 depends only on the remote existing and exposing something, while US2
depends on the data contract as well — so Setup carries the app scaffold and
Foundational carries the data contract (`fetch-overview.ts`,
`use-dashboard-overview.ts`) that US2, US3, and US4 all read from. US3 and
US4 are independent of each other and of US2 once Foundational is done; each
adds one domain surface to the same `App.tsx`. US5 depends only on
`apps/dashboard` existing (Phase 1) and is ordered last only because it is P2
and protects the architecture rather than delivering domain behavior — the
same shape 002's US5 (P3, boundary gate) took.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Create `packages/ui/src/components/card.tsx` — `Card` component: `label`, `value`, `trend: 'up' | 'down' | 'flat'`, `className`, following the existing components' `WithClassName` pattern (research D4)
- [X] T002 [P] Export `Card` and `CardProps` from `packages/ui/src/index.ts`, following the pattern already used for `Table`
- [X] T003 [P] `packages/ui/tests/card.test.tsx` — renders label, value, and each of the three trend states
- [X] T004 Create `apps/dashboard/package.json` as `@enterprise-mfe/dashboard`, declaring `react@^19.2.8`, `react-dom@^19.2.8`, `react-router@^8.3.0`, `@enterprise-mfe/auth` at the shell's exact singleton versions (`FR-015`), plus `@enterprise-mfe/ui`, `@enterprise-mfe/shared-types` as workspace dependencies, `recharts@^3.10.1`, and devDependencies `@rspack/core@^2.1.7`, `@rspack/cli@^2.1.7`, `@rspack/dev-server@^2.2.0`, `@module-federation/enhanced@^2.8.1`, `tailwindcss@^4.3.3`, `@tailwindcss/postcss@^4.3.3`, `postcss@^8.5.25`, `postcss-loader@^8.2.1` — every import declared per ADR-0011
- [X] T005 Create `apps/dashboard/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`
- [X] T006 Create `apps/dashboard/src/exposed/` and `apps/dashboard/src/internal/` — the same split `apps/shell` uses (Principle I)
- [X] T007 Create `apps/dashboard/index.html` and `apps/dashboard/src/index.tsx` as the standalone entry point (spec edge case: the dashboard must run with no shell present)
- [X] T008 [P] Create `apps/dashboard/src/bootstrap.tsx` mounting `apps/dashboard/src/exposed/App.tsx` into the DOM
- [X] T009 Create `apps/dashboard/rspack.config.ts` with `ModuleFederationPlugin` configured as a **remote**: `name: 'dashboard'`, `exposes: { './App': './src/exposed/App.tsx' }`, dev server port `3001` (research D1, D2), `shared` singletons matching `apps/shell/rspack.config.ts` exactly
- [X] T010 Add `dev`/`build` scripts to `apps/dashboard/package.json` invoking `rspack serve` / `rspack build`
- [X] T011 Verify `pnpm dev --filter @enterprise-mfe/dashboard` starts and serves a blank page with no errors — confirms the remote's Rspack + MF config is valid before anything is built on top of it
- [X] T012 Add `apps/dashboard` as a project entry in `vitest.config.mts` using the existing `browserProject` helper, following the pattern already used for `shell` (research D7)
- [X] T013 [P] Add `@playwright/test@^1.62.1` as a devDependency in `apps/shell/package.json`, create `apps/shell/playwright.config.ts`, and add an `"e2e": "playwright test"` script (research D6) — `turbo.json`'s `e2e` task already exists and picks this up unchanged

---

## Phase 2: Foundational (Blocking Prerequisites)

### Tailwind pipeline on a second app — proving the pattern travels, not re-proving issue #4

- [X] T014 Configure `postcss-loader` in `apps/dashboard/rspack.config.ts` for `.css` files, with `@tailwindcss/postcss` in the PostCSS plugin chain — identical to `apps/shell`'s
- [X] T015 Create `apps/dashboard/src/internal/styles.css` importing `@enterprise-mfe/ui/styles.css` and declaring `@source '../../../../packages/ui/src'` — the workspace-relative path, same gotcha `apps/shell` already paid for (research D2 in `002-shell-host`)
- [X] T016 Import `internal/styles.css` from `bootstrap.tsx`
- [X] T017 Render the new `Card` component as a smoke element in `exposed/App.tsx`; run `pnpm dev --filter @enterprise-mfe/dashboard` and confirm it is visibly styled — the first confirmation that the Tailwind pipeline holds on a *second* app, not just the shell

### Data contract — the async source all three domain surfaces read from

- [X] T018 [P] Create `apps/dashboard/src/internal/data/fixtures.ts` — the in-module fixture data: 2 `KpiMetric`s (`active-users`, `usage-trend`), a chronological `ActivityDataPoint[]`, and ≤12 `ActivityFeedItem`s, reverse-chronological, per [data-model.md](data-model.md)
- [X] T019 [P] `apps/dashboard/tests/fetch-overview.test.ts` — default options resolve a `DashboardOverview` with exactly 2 `kpis`, `feed` reverse-chronological and ≤12 items, `activity` chronological (contracts/dashboard-data-contract.md)
- [X] T020 [P] `apps/dashboard/tests/fetch-overview.test.ts` — `forceFailure: true` rejects with an `Error` carrying a specific, non-generic message
- [X] T021 Create `apps/dashboard/src/internal/data/fetch-overview.ts` implementing `fetchDashboardOverview(options?: FetchOverviewOptions)` per [contracts/dashboard-data-contract.md](contracts/dashboard-data-contract.md), backed by `fixtures.ts` and an artificial `delayMs` (default 400)
- [X] T022 Create `apps/dashboard/src/internal/data/use-dashboard-overview.ts` — thin hook wrapping `fetch-overview.ts` in a `FetchState` (`idle → loading → loaded | failed`), per [data-model.md](data-model.md)

---

## Phase 3: User Story 1 - The shell composes a real remote for the first time (Priority: P1) 🎯 MVP

**Goal**: Register `apps/dashboard` in the shell's dev registry and see it mount at its own route, reading the shared session — the first real (not simulated) composition in this project.

**Independent Test**: Add one entry to the shell's dev registry pointing at the running dashboard, start both processes, navigate to the dashboard's route, and confirm its UI renders inside the shell frame with no shell source file changed.

### Tests for User Story 1

- [X] T023 [P] [US1] `apps/dashboard/tests/app.test.tsx` — `App` renders standalone (no shell context assumed) given a `RemoteAppProps.basePath`
- [X] T024 [P] [US1] `apps/dashboard/tests/app.test.tsx` — the current session is readable inside `App` via `useAuth()`, not a dashboard-local implementation (`FR-005`)
- [X] T025 [US1] `apps/shell/e2e/dashboard-composition.spec.ts` — starts the shell composed with the dashboard, navigates to `/dashboard`, and asserts the dashboard's UI renders inside the shell frame (`SC-001`) — the first real Playwright run in this project (research D6)

### Implementation for User Story 1

- [X] T026 [US1] Create `apps/dashboard/src/exposed/App.tsx` accepting `RemoteAppProps` (from `@enterprise-mfe/shared-types`), reading the session via `useAuth()` from `@enterprise-mfe/auth`
- [X] T026a [US1] **Discovered during implementation, not in the original plan**: `apps/shell/src/exposed/App.tsx` never actually turns a registered remote into a route — `002-shell-host` built `RemoteRegion` but its own source comment defers wiring it in to "sprint 4." Implement it using react-router 8's imperative `router.patchRoutes(routeId, children)` (confirmed present on the installed `react-router@8.3.0` router instance): after `registerAllowedRemotes` resolves, patch one route per registered remote — `{ path: registration.routePath, element: <RemoteRegion remoteName={registration.name} basePath={registration.routePath} /> }` — into the router built in `apps/shell/src/exposed/App.tsx`. Chosen over the fog-of-war `patchRoutesOnNavigation` lazy-discovery API for being the simpler mechanism that still satisfies FR-001 (frame renders before this resolves)
- [X] T027 [US1] Register the dashboard in `apps/shell/src/internal/federation/remotes.dev.json` exactly as [contracts/registry-entry.md](contracts/registry-entry.md) specifies — `name`, `entry`, `routePath`, `label`; confirm `allowedOrigins` already covers `http://localhost:3001` (sprint 3, no change needed)
- [X] T028 [US1] Confirm `git status --porcelain apps/shell/src` shows exactly **one** changed file (`remotes.dev.json`) after T027, now that T026a's mechanism exists — registering the remote touches only the registry file (`FR-017`)
- [X] T029 [US1] Manually verify composition: `pnpm dev` (shell) + `pnpm dev --filter @enterprise-mfe/dashboard`, navigate to `/dashboard`, confirm the dashboard renders inside the shell's chrome

---

## Phase 4: User Story 2 - KPI cards prove a remote can fetch its own data (Priority: P1)

**Goal**: KPI cards move from loading to populated or error, driven entirely by the dashboard's own async fetch.

**Independent Test**: Run the dashboard standalone and confirm the KPI cards move from a loading state to a populated state without any host coordinating the fetch.

### Tests for User Story 2

- [X] T030 [P] [US2] `apps/dashboard/tests/kpi-cards.test.tsx` — before the fetch resolves, each card shows a distinct loading state, not a blank or zeroed value (`FR-008`)
- [X] T031 [P] [US2] `apps/dashboard/tests/kpi-cards.test.tsx` — once the fetch resolves, the `active-users` and `usage-trend` cards display their values and the loading state is gone (`FR-006`, `FR-007`)
- [X] T032 [P] [US2] `apps/dashboard/tests/kpi-cards.test.tsx` — when the fetch is forced to fail, each card shows a distinct error state rather than a stale or blank value (`FR-008`)
- [X] T033 [US2] `apps/shell/e2e/dashboard-composition.spec.ts` — the dashboard's own data-fetch failure is contained to its region; the rest of the shell keeps working (`FR-018`, exercised against a real remote instead of a simulated one for the first time)

### Implementation for User Story 2

- [X] T034 [US2] Create `apps/dashboard/src/internal/kpi/kpi-card.tsx` — one card built on `packages/ui`'s `Card`, rendering a `KpiMetric`'s label/value/trend plus its own loading and error visual states
- [X] T035 [US2] Create `apps/dashboard/src/internal/kpi/kpi-cards.tsx` — renders both `KpiMetric` cards, driven by `useDashboardOverview`'s `FetchState`
- [X] T036 [US2] Wire `kpi-cards.tsx` into `exposed/App.tsx`, replacing the T017 smoke `Card`

---

## Phase 5: User Story 3 - A third-party chart runs isolated inside federation (Priority: P2)

**Goal**: The activity chart renders real data with zero style or script effect on the shell or any other region.

**Independent Test**: Compose the shell with the dashboard mounted, inspect the shell's chrome and navigation before and after the chart renders, and confirm neither changed. Navigate away and back and confirm no resources from the previous mount persisted.

### Tests for User Story 3

- [X] T037 [P] [US3] `apps/dashboard/tests/activity-chart.test.tsx` — renders correctly against a real (fixture) time-series data set (spec scenario 3.2)
- [X] T038 [P] [US3] `apps/dashboard/tests/activity-chart.test.tsx` — a zero-point and a one-point `activity` array each render a defined empty/minimal state, not an error (spec Edge Cases)
- [X] T039 [US3] `apps/shell/e2e/dashboard-composition.spec.ts` — the shell's chrome and navigation DOM/computed styles are identical before and after the dashboard's chart mounts (`SC-003`)
- [X] T040 [US3] `apps/dashboard/tests/activity-chart.test.tsx` — unmounting and remounting the chart leaves no listeners or rendering resources from the previous mount (`FR-011`)

### Implementation for User Story 3

- [X] T041 [US3] Add `recharts@^3.10.1` to `apps/dashboard/package.json` dependencies (research D3)
- [X] T042 [US3] Create `apps/dashboard/src/internal/chart/activity-chart.tsx` rendering `DashboardOverview.activity` as a time-series chart, with a defined state for zero or one data points
- [X] T043 [US3] Wire `activity-chart.tsx` into `exposed/App.tsx`, driven by `useDashboardOverview`'s `FetchState`

---

## Phase 6: User Story 4 - A recent activity feed completes the domain (Priority: P3)

**Goal**: A reverse-chronological feed, with an explicit empty state.

**Independent Test**: Load the dashboard with fixture activity data and confirm the feed is ordered most-recent-first; load it with no activity and confirm an explicit empty state appears.

### Tests for User Story 4

- [X] T044 [P] [US4] `apps/dashboard/tests/recent-activity.test.tsx` — items render in reverse-chronological order (`FR-012`)
- [X] T045 [P] [US4] `apps/dashboard/tests/recent-activity.test.tsx` — an empty `feed` array renders `Table`'s `emptyState`, not a blank region (`FR-013`)

### Implementation for User Story 4

- [X] T046 [US4] Create `apps/dashboard/src/internal/feed/recent-activity.tsx` using `@enterprise-mfe/ui`'s `Table` with an `emptyState`, rendering `ActivityFeedItem` rows
- [X] T047 [US4] Wire `recent-activity.tsx` into `exposed/App.tsx`, driven by `useDashboardOverview`'s `FetchState`

---

## Phase 7: User Story 5 - The boundary and singleton gates hold against a real second app (Priority: P2) — issue #6 retest

**Goal**: Prove both guard rails against two real applications for the first time, and get the first real second-app data point for issue #6.

**Independent Test**: Introduce a deliberate cross-app relative import touching `apps/dashboard`, confirm `pnpm check:boundaries` fails and names it, then revert. Separately, introduce a deliberate singleton version mismatch in `apps/dashboard/package.json`, confirm `pnpm check:shared-deps` fails and names it, then revert.

- [X] T048 [US5] Confirm `pnpm check:boundaries` passes against real `apps/dashboard` source with **no change** to `.dependency-cruiser.js` — its rules are already `apps/*` pattern-based (`FR-014` first half)
- [X] T049 [US5] Deliberately add a relative import from an `apps/dashboard` file reaching into `apps/shell/src/internal/chrome`; run `pnpm check:boundaries` and record whether it fails and names the violated rule — the real second-app retest of [issue #6](https://github.com/rodvieira/enterprise-microfrontend-boilerplate/issues/6) (`FR-014` second half, `SC-005`)
- [X] T050 [US5] Revert T049's deliberate import; confirm `pnpm check:boundaries` passes again
- [X] T051 [US5] Update issue #6 with T049's result — whether the deliberate violation was caught correctly against this real second app (evidence the sprint-3 bug was fixture- or environment-specific) or reproduced the same unresolved-import failure (evidence it is broader). Either outcome is new information; record it either way
- [X] T052 [US5] Confirm `apps/dashboard/package.json`'s `react`/`react-dom`/`react-router`/`@enterprise-mfe/auth` versions already match `scripts/check-shared-deps.ts`'s `SINGLETONS` exactly (`FR-015`), and `pnpm check:shared-deps` passes
- [X] T053 [US5] Deliberately mismatch one singleton's version range in `apps/dashboard/package.json`; run `pnpm check:shared-deps` and confirm it fails, naming the package and the mismatched versions (`FR-016`, `SC-006`)
- [X] T054 [US5] Revert T053's mismatch; confirm `pnpm check:shared-deps` passes again

---

## Phase 8: Guard rails and cross-cutting verification

- [X] T055 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm e2e`, `pnpm check:boundaries`, `pnpm check:shared-deps` in sequence on a clean checkout and confirm all seven exit `0` (`SC-007`)
- [X] T056 Confirm `apps/dashboard/package.json` declares every package it imports, including test tooling, per ADR-0011's `no-undeclared-dependencies` rule

---

## Phase 9: Polish, documentation

- [X] T057 [P] `apps/dashboard/README.md` — what the dashboard does, how to run it standalone, and a pointer to [contracts/registry-entry.md](contracts/registry-entry.md)
- [X] T058 [P] Update `docs/packages.md` — add `packages/ui`'s new `Card` component to its existing entry
- [X] T059 Update `docs/packages.md` (or `docs/architecture.md`, whichever currently lists `apps/*`) — add `apps/dashboard` as a real entry, matching the pattern used for `apps/shell`
- [X] T060 Confirm `docs/architecture.md` doesn't describe "one application" or otherwise imply the shell is the only app; correct if it does
- [X] T061 Run every step of [quickstart.md](quickstart.md) §1–§8 end to end on a clean checkout
- [X] T062 Write the pull request description with a one-line justification for each new dependency — `recharts` (research D3) and `@playwright/test` (research D6) — per constitution Principle IX
- [X] T063 Review the diff against `.claude/agents/pr-reviewer.md`'s checks (exposed/internal boundary, singleton versions, no cross-app relative imports) before opening the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies. Everything downstream needs `apps/dashboard` to exist and build, and `Card` to exist before any KPI work
- **Phase 2 Foundational**: depends on Phase 1. The Tailwind pipeline (T014–T017) must complete before any styled component renders correctly. The data contract (T018–T022) is needed by US2, US3, and US4 — none of the three domain surfaces can be built against real `FetchState` without it
- **Phase 3 (US1)**: depends on Phase 1 only (it needs the remote to exist and expose `App`, not the data contract) — it could in principle run before Phase 2, but is sequenced after it since both are needed before Phase 4 regardless
- **Phase 4 (US2)**, **Phase 5 (US3)**, **Phase 6 (US4)**: all depend on Phase 2 (the data contract) and Phase 3 (`App.tsx` existing to wire into). They are independent of each other and touch disjoint files (`kpi/`, `chart/`, `feed/`) until each is wired into `App.tsx`
- **Phase 7 (US5)**: depends on `apps/dashboard` existing (Phase 1) but not on any domain surface — it could run immediately after Phase 1, ordered last only because it is priority P2 protecting the architecture rather than delivering domain behavior
- **Phase 8**: depends on every prior phase existing (it runs the full gate suite)
- **Phase 9**: last

### Within Each User Story

- Tests are written before the implementation they cover, and must fail first
- T034 (`kpi-card.tsx`) before T035 (`kpi-cards.tsx`) — the plural component composes the singular one
- T041 (add `recharts` dependency) before T042 (the component that imports it)
- T026 (`App.tsx` exists) before T036/T043/T047 (each domain surface wires into it) — a hard chain within Phases 4–6

### Parallel Opportunities

- T001–T003 (`Card` component, its export, its test) can start immediately, independent of everything else in Setup
- T018–T020 (fixtures and the two `fetch-overview` tests) are independent, written before `fetch-overview.ts` itself exists
- All of T023–T024 (US1 component tests) are independent
- All of T030–T032 (US2 KPI card tests) are independent
- All of T037–T038 (US3 chart tests) are independent
- All of T044–T045 (US4 feed tests) are independent
- **US2, US3, and US4 are the real parallel opportunity between stories**: all three depend only on Phase 2 and Phase 3, and touch disjoint files (`kpi/`, `chart/`, `feed/`) until each is wired into `App.tsx`

---

## Parallel Example: User Stories 2–4 together

```bash
# Once Phase 2 (data contract) and Phase 3 (App.tsx) are done, all three
# domain surfaces can be built in parallel — different files, same FetchState:
Task: "KPI cards: loading, populated, error"
Task: "Activity chart: real data, zero/one-point edge cases, unmount cleanup"
Task: "Recent activity feed: reverse-chronological, empty state"
```

## Parallel Example: User Story 5

```bash
# The two guard-rail retests are independent of each other:
Task: "Deliberate cross-app import into apps/dashboard → check:boundaries fails, then reverts"
Task: "Deliberate singleton mismatch in apps/dashboard/package.json → check:shared-deps fails, then reverts"
```

---

## Implementation Strategy

### MVP scope

Phases 1, 2, and 3 — the remote scaffold, the data contract, and User Story
1. At that checkpoint the dashboard is a real remote the shell composes at
`/dashboard`, reading the shared session, with an empty domain body —
independently demoable as "federation works end to end," even before any KPI
card exists.

### Incremental delivery

1. Phases 1–2 → `apps/dashboard` exists, styled, with a working data contract
2. Phase 3 → **MVP**: the shell composes a real remote for the first time
3. Phases 4–6 → the three domain surfaces, buildable in any order or in
   parallel (`SC-002`–`SC-004`)
4. Phase 7 → the boundary and singleton gates proven against two real apps;
   issue #6 gets its retest (`SC-005`, `SC-006`)
5. Phase 8 → every gate passes on a clean checkout (`SC-007`)
6. Phase 9 → docs and the pull request

### Commit discipline

Commit per task or per logical group, scoped `dashboard` per
`commitlint.config.mjs`; the `Card` component (T001–T003) takes scope `ui`;
cross-cutting changes to root config or scripts (Phases 7–8, plus T012–T013)
take scope `repo`; docs and the pull request (Phase 9) take scope `docs`.

---

## Notes

- [P] = different files, no dependencies on incomplete work
- T017 is this sprint's equivalent of `002-shell-host`'s T016/T017: the task
  that proves the Tailwind pipeline holds on a *second* app, not just that
  the build didn't crash
- T049–T051 and T053–T054 are the tasks that prove a gate rather than
  trusting it, and specifically the retest `002-shell-host`'s handoff
  flagged as the first real opportunity to learn something new about issue
  #6
- T028 mirrors `002-shell-host`'s T040 — the one-file-touched proof, now
  applied to actually adding a remote instead of a placeholder

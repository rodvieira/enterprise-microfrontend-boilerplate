---

description: "Task list for Admin Remote"
---

# Tasks: Admin Remote

**Input**: Design documents from `/specs/004-admin-remote/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. `SC-002`–`SC-005`, `SC-006`, `SC-007`, and `SC-009`
require proven behavior — pagination, sorting, permission gating,
validation, the event-bus mechanism, and both guard-rail retests are named
tests, not folded into "build the component."

**Organization**: Grouped by the five prioritized user stories from spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task names an exact file path

## A note on how stories map to phases

`packages/event-bus`'s core (publish/subscribe/`BroadcastChannel`) is
Foundational, not part of US4, because both US3 (which publishes) and US4
(which subscribes) need it to exist first, and it's testable in complete
isolation before either app-side integration exists. US1, US2, and US3 are
otherwise independent of each other once Foundational is done — US1 proves
the remote mounts, US2 the table, US3 the write path. US4, the headline
proof, depends on US3's publish call and Foundational's subscribe mechanism
both existing. US5 depends only on `apps/admin` and `packages/event-bus`
existing (Phase 1–2), ordered last only because it's P2, protecting the
architecture rather than delivering domain behavior — the same shape
`003-dashboard-remote`'s US5 took.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Create `packages/event-bus/package.json` as `@enterprise-mfe/event-bus`, `react` as a peerDependency (for the hook only — `publish`/`subscribe` themselves have no React dependency)
- [X] T002 [P] Create `packages/event-bus/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`
- [X] T003 [P] Add `@enterprise-mfe/event-bus` as a project entry in `vitest.config.mts`, following the `browserProject` pattern
- [X] T004 Create `apps/admin/package.json` as `@enterprise-mfe/admin`, declaring `react@^19.2.8`, `react-dom@^19.2.8`, `react-router@^8.3.0`, `@enterprise-mfe/auth` at the shell's exact singleton versions, `@enterprise-mfe/event-bus@workspace:*`, plus `@enterprise-mfe/ui`, `@enterprise-mfe/shared-types` as workspace dependencies, and the same devDependencies `apps/dashboard/package.json` declares (`@rspack/core@^2.1.7`, `@rspack/cli@^2.1.7`, `@rspack/dev-server@^2.2.0`, `@module-federation/enhanced@^2.8.1`, `tailwindcss@^4.3.3`, `@tailwindcss/postcss@^4.3.3`, `postcss@^8.5.25`, `postcss-loader@^8.2.1`) — every import declared per ADR-0011
- [X] T005 Create `apps/admin/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`
- [X] T006 Create `apps/admin/src/exposed/` and `apps/admin/src/internal/` — the same split every app in this repository uses (Principle I)
- [X] T007 Create `apps/admin/index.html` and `apps/admin/src/index.tsx` as the standalone entry point
- [X] T008 [P] Create `apps/admin/src/bootstrap.tsx` mounting `apps/admin/src/exposed/App.tsx` into the DOM, wrapped in its own `<AuthProvider>` (standalone-only — mirrors `apps/dashboard/src/bootstrap.tsx`)
- [X] T009 Create `apps/admin/rspack.config.ts` with `ModuleFederationPlugin` configured as a **remote**: `name: 'admin'`, `exposes: { './App': './src/exposed/App.tsx' }`, dev server port `3002` (already reserved in `remotes.dev.json`'s `allowedOrigins`, sprint 3), `postcss-loader` wired into the CSS rule from the start (`003-dashboard-remote`'s pipeline, not rediscovered), `shared` singletons matching every other manifest exactly, including `@enterprise-mfe/event-bus`
- [X] T010 Add `dev`/`build` scripts to `apps/admin/package.json` invoking `rspack serve` / `rspack build`
- [X] T011 Verify `pnpm dev --filter @enterprise-mfe/admin` starts and serves a blank page with no errors
- [X] T012 Add `apps/admin` as a project entry in `vitest.config.mts`

---

## Phase 2: Foundational (Blocking Prerequisites)

### Tailwind pipeline — applying `003-dashboard-remote`'s lesson from day one

- [X] T013 Create `apps/admin/postcss.config.mjs` — identical to `apps/dashboard`'s
- [X] T014 Create `apps/admin/src/internal/styles.css` importing `@enterprise-mfe/ui/styles.css` and declaring `@source '../../../../packages/ui/src'`
- [X] T015 Create `apps/admin/src/exposed/App.tsx` importing `../internal/styles.css` **directly** (not only from `bootstrap.tsx`) and giving it a **default export** from the start — both `003-dashboard-remote` findings applied up front, not rediscovered; render a smoke `Button` and confirm `pnpm dev --filter @enterprise-mfe/admin` shows it styled
- [X] T016 **Prove it on a third app**: run `pnpm build --filter @enterprise-mfe/admin`, inspect the generated CSS for the smoke component's utility classes — confirms the pipeline holds without per-app fragility

### `packages/event-bus` core — unblocks both US3 (publish) and US4 (subscribe)

- [X] T017 [P] Create `packages/event-bus/src/event-map.ts` — `EventMap`, `RoleChangedEvent` (`data-model.md`)
- [X] T018 [P] `packages/event-bus/tests/bus.test.ts` — `publish` calls every currently-subscribed handler for a topic, in subscription order
- [X] T019 [P] `packages/event-bus/tests/bus.test.ts` — a handler that throws does not prevent other handlers for the same event from running
- [X] T020 [P] `packages/event-bus/tests/bus.test.ts` — calling the function `subscribe()` returns removes exactly that handler, no others
- [X] T021 [P] `packages/event-bus/tests/bus.test.ts` — an event published with zero subscribers is not queued or replayed to a later subscriber (`FR-016`)
- [X] T022 [P] `packages/event-bus/tests/bus.test.ts` — a `publish()` call is received by a subscriber connected only through the `BroadcastChannel` relay (simulating a second browser tab), not only by same-module subscribers (research D2)
- [X] T023 Create `packages/event-bus/src/bus.ts` implementing `publish`/`subscribe` over a `Map<topic, Set<handler>>` plus a `BroadcastChannel` relay, per [contracts/event-bus-contract.md](contracts/event-bus-contract.md)
- [X] T024 [P] `packages/event-bus/tests/use-event-subscription.test.tsx` — subscribes on mount, unsubscribes on unmount
- [X] T025 Create `packages/event-bus/src/use-event-subscription.ts`
- [X] T026 Create `packages/event-bus/src/index.ts` exporting `publish`, `subscribe`, `useEventSubscription`, `EventMap`, `RoleChangedEvent`

### User fixture and list state — used by US2 and US3

- [X] T027 [P] Create `apps/admin/src/internal/users/fixtures.ts` — 25+ seeded `User` rows (enough to force pagination, `data-model.md`)
- [X] T028 [P] `apps/admin/tests/use-user-list.test.ts` — paginates a fixture set larger than one page, bounded (`FR-006`)
- [X] T029 [P] `apps/admin/tests/use-user-list.test.ts` — sorting by a chosen column reorders the visible rows (`FR-007`)
- [X] T030 [P] `apps/admin/tests/use-user-list.test.ts` — adding a user resets to the first page, so it's always reachable without hunting (`data-model.md`)
- [X] T031 Create `apps/admin/src/internal/users/use-user-list.ts` — pagination + sort state, owns the mutable fixture, exposes `addUser`/`changeRole`

---

## Phase 3: User Story 1 - The shell composes a second real remote (Priority: P1)

**Goal**: Register `apps/admin` and see it mount at its own route alongside the already-registered dashboard, with no further shell change needed.

**Independent Test**: Add one entry to the shell's dev registry pointing at the running admin remote, start all three processes, navigate to the admin route, and confirm its UI renders with no shell source file changed beyond the registry entry.

### Tests for User Story 1

- [X] T032 [P] [US1] `apps/admin/tests/app.test.tsx` — `App` renders standalone given a `RemoteAppProps.basePath`
- [X] T033 [P] [US1] `apps/admin/tests/app.test.tsx` — the current session is readable inside `App` via `useAuth()` (`FR-005`)
- [X] T034 [US1] `apps/shell/e2e/admin-composition.spec.ts` — starts the shell composed with both remotes, navigates to `/admin`, asserts the admin remote's UI renders inside the shell frame; navigates to `/dashboard` and back, confirms no leftover state from the other remote (`SC-001`, User Story 1 scenario 2)

### Implementation for User Story 1

- [X] T035 [US1] Create `apps/admin/src/exposed/App.tsx` accepting `RemoteAppProps`, reading the session via `useAuth()`
- [X] T036 [US1] Register the admin remote in `apps/shell/src/internal/federation/remotes.dev.json` exactly as [contracts/registry-entry.md](contracts/registry-entry.md) specifies
- [X] T037 [US1] Confirm `git status --porcelain apps/shell/src` shows exactly **one** changed file (`remotes.dev.json`) — the route-patching mechanism `003-dashboard-remote` built needs no further change to support a second remote (`FR-020`)
- [X] T038 [US1] Manually verify three-way composition: `pnpm dev` (starts shell, dashboard, and admin together), navigate to `/dashboard` and `/admin` in turn, confirm each renders correctly inside the shell's chrome

---

## Phase 4: User Story 2 - A person reviews the list of users (Priority: P1)

**Goal**: A paginated, sortable user table, using the shared design system's `Table`.

**Independent Test**: Run the admin remote standalone and confirm the table paginates and sorts a fixture set larger than one page.

### Tests for User Story 2

- [X] T039 [P] [US2] `apps/admin/tests/user-table.test.tsx` — renders a bounded page when more users exist than fit on one page (`FR-006`)
- [X] T040 [P] [US2] `apps/admin/tests/user-table.test.tsx` — choosing a sortable column reorders the visible rows (`FR-007`)
- [X] T041 [P] [US2] `apps/admin/tests/user-table.test.tsx` — uses `@enterprise-mfe/ui`'s `Table`, not a bespoke element (`FR-002`)

### Implementation for User Story 2

- [X] T042 [US2] Create `apps/admin/src/internal/users/pagination-controls.tsx` — `Button`-based prev/next, admin-local (research D6)
- [X] T043 [US2] Create `apps/admin/src/internal/users/user-table.tsx` wrapping `Table`, driven by `use-user-list.ts`
- [X] T044 [US2] Wire `user-table.tsx` and `pagination-controls.tsx` into `exposed/App.tsx`

---

## Phase 5: User Story 3 - An authorized person invites a user or changes a role (Priority: P1)

**Goal**: An invite/edit modal reachable only with the `users:write` permission, that adds a user or changes a role, with visible validation.

**Independent Test**: With a session that grants `users:write`, submit an invite and a role change through the modal and confirm both land in the table. Separately, confirm a session without that permission never sees the action offered.

### Tests for User Story 3

- [X] T045 [P] [US3] `apps/admin/tests/use-can-write-users.test.ts` — `true` for a mocked user whose `permissions` include `users:write`, `false` otherwise (research D5)
- [X] T046 [P] [US3] `apps/admin/tests/user-form-modal.test.tsx` — a session with `users:write` can submit a new user, and it appears in the table (`FR-009`)
- [X] T047 [P] [US3] `apps/admin/tests/user-form-modal.test.tsx` — a session with `users:write` can submit a role change, and it's reflected in the table (`FR-010`)
- [X] T048 [P] [US3] `apps/admin/tests/user-form-modal.test.tsx` — a mocked session **without** `users:write` never sees the action offered at all (`FR-008`, `SC-004`)
- [X] T049 [P] [US3] `apps/admin/tests/user-form-modal.test.tsx` — an invalid submission (missing required field, duplicate email) is rejected with a visible, specific reason, and no user is added or changed (`FR-011`)

### Implementation for User Story 3

- [X] T050 [US3] Create `apps/admin/src/internal/permissions/use-can-write-users.ts` (research D4) — reads `useAuth()`'s `user.permissions`, no `packages/auth` change
- [X] T051 [US3] Create `apps/admin/src/internal/users/user-form-modal.tsx` wrapping `Modal`, using `Input` for name/email and a native `<select>` for role, with validation
- [X] T052 [US3] Wire `user-form-modal.tsx` into `exposed/App.tsx`, its trigger gated by `use-can-write-users`

---

## Phase 6: User Story 4 - A role change updates the dashboard live (Priority: P1) 🎯 headline proof

**Goal**: A role change in admin updates the dashboard's "active users" KPI live, with no reload, via `packages/event-bus`, provable across two separate same-origin browser tabs.

**Independent Test**: With the shell composing both remotes, change a user's role in admin and confirm the dashboard's KPI updates without a page reload, and that neither remote's source imports the other.

### Tests for User Story 4

- [X] T053 [US4] `apps/dashboard/tests/app.test.tsx` — the active-users KPI increments by 1 when a `user:role-changed` event is received (published directly by the test, not through admin) (`FR-014`)
- [X] T054 [US4] `apps/shell/e2e/admin-composition.spec.ts` — **two browser contexts/pages in the same test**, one on `/dashboard`, one on `/admin`: a role change submitted on the admin page updates the dashboard page's KPI with no reload (`SC-005`, the scenario `BroadcastChannel` exists for — research D2)
- [X] T055 [US4] `apps/shell/e2e/admin-composition.spec.ts` — the dashboard page mounted *after* the role change shows its own freshly-fetched state, not a replayed increment (`FR-016`, spec Edge Cases)

### Implementation for User Story 4

- [X] T056 [US4] Publish `'user:role-changed'` from `use-user-list.ts`'s `changeRole`, only after the fixture mutation succeeds — never on a rejected/invalid submission (`FR-013`)
- [X] T057 [US4] Subscribe in `apps/dashboard/src/exposed/App.tsx` via `useEventSubscription('user:role-changed', …)`, incrementing the locally-held KPI adjustment (`FR-014`, research D3)
- [X] T058 [US4] Add `@enterprise-mfe/event-bus` as a dependency of `apps/dashboard/package.json`, at the same version range every other manifest declares

---

## Phase 7: User Story 5 - The boundary and singleton gates hold against a third real app (Priority: P2)

**Goal**: Prove both guard rails against `apps/admin` and the new `@enterprise-mfe/event-bus` singleton, continuing the retest discipline `003-dashboard-remote` established.

**Independent Test**: Introduce a deliberate cross-app import touching `apps/admin`, confirm `pnpm check:boundaries` fails and names it, then revert. Separately, introduce a deliberate `@enterprise-mfe/event-bus` version mismatch, confirm `pnpm check:shared-deps` fails and names it, then revert.

- [X] T059 [US5] Confirm `pnpm check:boundaries` passes against real `apps/admin` source with **no change** to `.dependency-cruiser.js`
- [X] T060 [US5] Deliberately add a relative import from an `apps/admin` file reaching into `apps/dashboard/src/internal` or `apps/shell/src/internal`; run `pnpm check:boundaries` and confirm it fails, naming the violated rule (`FR-017`, `SC-006`)
- [X] T061 [US5] Revert T060's deliberate import; confirm `pnpm check:boundaries` passes again
- [X] T062 [US5] Uncomment `@enterprise-mfe/event-bus` in `scripts/check-shared-deps.ts`'s `SINGLETONS`, removing the stale "arrives ... in sprint 6" comment (research D7); confirm `apps/admin`'s and `apps/dashboard`'s declared `@enterprise-mfe/event-bus` ranges already match and `pnpm check:shared-deps` passes
- [X] T063 [US5] Deliberately mismatch `@enterprise-mfe/event-bus`'s version range in `apps/admin/package.json`; run `pnpm check:shared-deps` and confirm it fails, naming the package and both manifests (`FR-019`, `SC-007`)
- [X] T064 [US5] Revert T063's mismatch; confirm `pnpm check:shared-deps` passes again

---

## Phase 8: Guard rails and cross-cutting verification

- [ ] T065 Confirm no relative import crosses between `apps/admin` and `apps/dashboard` as a standing state, not only the reverted deliberate violation from Phase 7 (`FR-015`)
- [ ] T066 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm e2e`, `pnpm check:boundaries`, `pnpm check:shared-deps` in sequence on a clean checkout and confirm all seven exit `0` (`SC-008`)
- [ ] T067 Confirm `apps/admin/package.json` and `packages/event-bus/package.json` each declare every package they import, including test tooling, per ADR-0011

---

## Phase 9: Polish, documentation

- [ ] T068 [P] `apps/admin/README.md` — what the admin remote does, how to run it standalone, and a pointer to [contracts/registry-entry.md](contracts/registry-entry.md)
- [ ] T069 [P] `packages/event-bus/README.md` — one paragraph on what it solves, noting the `BroadcastChannel` relay and why (research D2)
- [ ] T070 Update `docs/packages.md` — move `@enterprise-mfe/event-bus` from "planned" to its real entry
- [ ] T071 Update `docs/architecture.md`'s "Remotes" section — `apps/admin` joins `apps/dashboard`; document the cross-remote live-update mechanism as a pattern, not just this sprint's specific feature
- [ ] T072 Run every step of [quickstart.md](quickstart.md) §1–§7 end to end on a clean checkout
- [ ] T073 Write the pull request description — **zero new dependencies** is itself worth stating explicitly (Principle IX: the justification for not adding one), plus the two real corrections found during research (`BroadcastChannel` needed for the spec's own cross-tab scenario; the stale "sprint 6" comment)
- [ ] T074 Review the diff against `.claude/agents/pr-reviewer.md`'s checks (exposed/internal boundary, singleton versions, no cross-app relative imports, and this time also: does the new remote's `remote.manifest.json` question from that checklist apply — see `003-dashboard-remote`'s T063 note that this checklist item is stale relative to the actual registry-contract.md design) before opening the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies. `packages/event-bus`'s package scaffold (T001–T003) and `apps/admin`'s scaffold (T004–T012) are independent of each other and can proceed in parallel
- **Phase 2 Foundational**: depends on Phase 1. The Tailwind pipeline (T013–T016) needs `apps/admin` scaffolded; `packages/event-bus`'s core (T017–T026) needs only its own Phase 1 package scaffold and is otherwise independent of `apps/admin` entirely; the user fixture/list (T027–T031) needs only `apps/admin` scaffolded
- **Phase 3 (US1)**, **Phase 4 (US2)**: both depend on Phase 2. Largely independent of each other — US1 is composition, US2 is the table
- **Phase 5 (US3)**: depends on Phase 2 (user list state) and on `exposed/App.tsx` existing (Phase 3, T035) to wire into, but not on US2's table being finished
- **Phase 6 (US4)**: depends on Phase 2's `packages/event-bus` core, **and** on US3's `changeRole`/publish call existing (T056 depends on T050–T052 being done) — this is the one hard cross-story dependency in this feature
- **Phase 7 (US5)**: depends only on `apps/admin` and `packages/event-bus` existing (Phase 1–2), ordered last only because it is P2
- **Phase 8**: depends on every prior phase
- **Phase 9**: last

### Within Each User Story

- Tests are written before the implementation they cover, and must fail first
- T050 (`use-can-write-users.ts`) before T051 (`user-form-modal.tsx`) — the modal's trigger needs the check to gate on
- T056 (publish on successful `changeRole`) cannot be written meaningfully before T031 (`use-user-list.ts`'s `changeRole` exists) and T023 (`bus.ts`'s `publish` exists)
- T057 (dashboard subscribes) before T054 (the two-page e2e scenario that proves it)

### Parallel Opportunities

- T001–T003 (`event-bus` package scaffold) and T004–T012 (`apps/admin` scaffold) — different packages, fully independent
- T017–T022 (event-bus tests, written before `bus.ts` exists) are independent of each other
- T027–T030 (`use-user-list` tests) are independent of each other
- All of T039–T041 (US2 table tests), T045–T049 (US3 tests) are independent within their groups
- **US2 and US3 are the real parallel opportunity between stories**: once Phase 2 is done and `exposed/App.tsx` exists (T035), the table and the modal touch disjoint files until both are wired into `App.tsx`

---

## Parallel Example: `packages/event-bus` core

```bash
# Written together before bus.ts exists:
Task: "publish calls every subscriber, in order"
Task: "a throwing handler doesn't break other handlers"
Task: "unsubscribe removes exactly one handler"
Task: "no replay to a subscriber that arrives late"
Task: "a BroadcastChannel-only subscriber still receives publish()"
```

## Parallel Example: User Stories 2 and 3

```bash
# Once Phase 2 and T035 (App.tsx) are done, both stories touch disjoint files:
Task: "User table: pagination, sorting, uses Table"
Task: "Invite/edit modal: permission gating, validation, submission"
```

---

## Implementation Strategy

### MVP scope

Phases 1–3 — the event-bus package scaffolded (even if not yet consumed),
`apps/admin` scaffolded, and User Story 1. At that checkpoint the shell
composes a second real remote, independently demoable as "the mechanism
generalizes," even before the user table or the live-update headline exist.

### Incremental delivery

1. Phases 1–2 → `apps/admin` exists and is styled; `packages/event-bus`'s
   core is proven in isolation; the user fixture/list state is ready
2. Phase 3 → **MVP**: a second real remote, composed
3. Phase 4 → the user table (`SC-002`)
4. Phase 5 → invite/edit, permission-gated (`SC-003`, `SC-004`)
5. Phase 6 → **the headline proof**: live cross-remote update (`SC-005`)
6. Phase 7 → the guard rails proven against a third real app and a second
   singleton package (`SC-006`, `SC-007`)
7. Phase 8 → every gate passes on a clean checkout (`SC-008`)
8. Phase 9 → docs and the pull request

### Commit discipline

Commit per task or per logical group, scoped `event-bus` for
`packages/event-bus` work, `admin` for `apps/admin` work, `dashboard` for
the one change to `apps/dashboard/src/exposed/App.tsx`, `repo` for
cross-cutting changes to root scripts (Phase 7's `check-shared-deps.ts`
correction, Phase 8), and `docs` for Phase 9.

---

## Notes

- [P] = different files, no dependencies on incomplete work
- T016 is this sprint's equivalent of `003-dashboard-remote`'s T017 — proof
  the Tailwind pipeline holds on a *third* app
- T022 is the task that proves the spec's own scenario (two separate
  browser tabs) is actually achievable, not merely asserted — the gap
  research D2 found and closed before any implementation code existed
- T060–T061 and T063–T064 are the tasks that prove a gate rather than
  trusting it, continuing the discipline `003-dashboard-remote` established
  for issue #6
- T037 mirrors `003-dashboard-remote`'s T028 — the one-file-touched proof,
  and this time it should hold on the *first* attempt, since the mechanism
  it depends on already exists

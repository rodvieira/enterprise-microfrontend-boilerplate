---

description: "Task list for Shell Host"
---

# Tasks: Shell Host

**Input**: Design documents from `/specs/002-shell-host/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. `FR-021`/`FR-022` and the success criteria require proven behavior, not assumed behavior — every simulated failure mode and every origin-control case is a named test, not folded into "implement the loader."

**Organization**: Grouped by the five prioritized user stories from spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task names an exact file path

## A note on how stories map to phases

US1 (the frame renders) and US2 (environment is a file, not code) are both P1 and
both depend on the shell existing at all, so Setup and Foundational carry the
scaffolding, the Tailwind pipeline, and the registry mechanism — the pieces
neither story can be tested without. Each story phase then holds the tasks that
*prove* its property, which is what keeps every story independently verifiable
even though the underlying plumbing is shared.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: `federation-utils` and the shell scaffolding — nothing story-specific yet

- [X] T001 Create `packages/federation-utils/package.json` as `@enterprise-mfe/federation-utils`, `react` as a peerDependency, no bundler or MF runtime dependency (research D5)
- [X] T002 Create `packages/federation-utils/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`
- [X] T003 Add `@enterprise-mfe/federation-utils` as a project entry in `vitest.config.mts`, following the pattern already used for `ui` and `auth`
- [X] T004 Create `apps/shell/package.json` as `@enterprise-mfe/shell`, declaring `@rspack/core@^2.1.7`, `@rspack/cli@^2.1.7`, `@module-federation/enhanced@^2.8.1`, `tailwindcss@^4.3.3`, `@tailwindcss/postcss@^4.3.3`, `postcss@^8.5.25`, `postcss-loader@^8.2.1`, `react-router@^8.3.0`, plus `@enterprise-mfe/ui`, `@enterprise-mfe/auth`, `@enterprise-mfe/shared-types`, `@enterprise-mfe/federation-utils` as workspace dependencies — every import must be declared per ADR-0011
- [X] T005 Create `apps/shell/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`
- [X] T006 Create `apps/shell/src/exposed/` and `apps/shell/src/internal/` — the same split a remote uses (Principle I, research D8)
- [X] T007 Create `apps/shell/index.html` and `apps/shell/src/index.tsx` as the standalone entry point
- [X] T008 [P] Create `apps/shell/src/bootstrap.tsx` mounting `apps/shell/src/exposed/App.tsx` into the DOM
- [X] T009 Create `apps/shell/rspack.config.ts` with `ModuleFederationPlugin` configured as a host with an **empty `exposes` map**, carrying a comment explaining why it is empty (research D8) — `react`, `react-dom`, `@enterprise-mfe/auth`, `react-router` declared as `shared` singletons
- [X] T010 Add `dev`/`build` scripts to `apps/shell/package.json` invoking `rspack serve` / `rspack build`
- [X] T011 Verify `pnpm dev --filter shell` starts and serves a blank page with no errors — confirms the Rspack + MF host config is valid before anything is built on top of it

**Checkpoint**: The shell exists, builds, and serves nothing yet

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Tailwind pipeline and the registry mechanism — both stories need them, and Tailwind must be proven before the frame is built on top of it (issue #4)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tailwind pipeline — issue #4, deliberately first

- [X] T012 Configure `postcss-loader` in `apps/shell/rspack.config.ts` for `.css` files, with `@tailwindcss/postcss` in the PostCSS plugin chain
- [X] T013 Create `apps/shell/src/internal/styles.css` importing `@enterprise-mfe/ui/styles.css` and declaring `@source '../../../../packages/ui/src'` — the workspace-relative path, not the `node_modules` symlink path (research D2)
- [X] T014 Import `internal/styles.css` from `bootstrap.tsx`
- [X] T015 Render one `@enterprise-mfe/ui` component (e.g. `Button`) in `exposed/App.tsx` as a smoke element
- [X] T016 **Prove issue #4 resolved**: run `pnpm build --filter shell`, inspect the built CSS output, and confirm the utility classes the smoke component actually uses (e.g. `bg-(--color-brand-600)`) are present in the generated stylesheet — not just that the build succeeds
- [X] T017 **Prove it visually**: run `pnpm dev --filter shell`, open the page, confirm the smoke component is visibly styled — unstyled output is a failure per the spec's edge case, not a cosmetic detail
- [X] T018 Not triggered — T016/T017 both passed. Tailwind v4 compiles under Rspack; verified by inspecting the built CSS (utility classes for components not even imported by the shell yet were present, confirming `@source` scans `packages/ui/src` broadly) and by a real headless-browser screenshot with computed styles matching the design tokens exactly (`background-color: oklch(0.55 0.19 255)`, `border-radius: 6px`). No fallback ADR needed.

### Registry mechanism (types, fetch, validation) — used by both US1 and US2

- [X] T019 [P] Create `apps/shell/src/internal/federation/types.ts` defining `RemoteRegistry`, `RemoteRegistration`, `OriginDecision`, `Environment` per [data-model.md](data-model.md)
- [X] T020 [P] Create `apps/shell/src/internal/federation/remotes.dev.json`, `remotes.staging.json`, `remotes.production.json`, each with the correct `environment` field and an empty `remotes` array — no remote exists until sprint 4
- [X] T021 Create `apps/shell/src/internal/federation/manifest.ts` fetching `/remotes.json` at startup and validating it against `types.ts` — parse failure, wrong `environment`, and duplicate `name` all fail loudly naming the file and environment (`FR-009`)
- [X] T022 Wire the build to copy the environment-selected registry file to `remotes.json` beside the built assets — one build, three deployments (research D3)
- [X] T023 Confirm the environment selector defaults to `dev` when unset, satisfying `FR-005` (no configuration required to start)

**Checkpoint**: `pnpm dev --filter shell` renders a styled smoke component; the registry fetches, validates, and fails loudly when broken

---

## Phase 3: User Story 1 - Run the host and see the application frame (Priority: P1) 🎯 MVP

**Goal**: A real, styled, navigable application frame with a working session — the host stands on its own with zero remotes

**Independent Test**: Start the host with no remote configured and no remote process running; confirm the frame renders and the session works.

### Tests for User Story 1

- [X] T024 [P] [US1] `apps/shell/tests/app.test.tsx` — the frame renders with navigation and layout from `@enterprise-mfe/ui`, not shell-defined components
- [X] T025 [P] [US1] `apps/shell/tests/app.test.tsx` — with an empty registry (`remotes: []`), the host renders normally and reports no error (spec scenario 1.2)
- [X] T026 [P] [US1] `apps/shell/tests/session.test.tsx` — signing in through the auth contract makes a protected area of the frame reachable and shows the current person's name (spec scenario 1.3)

### Implementation for User Story 1

- [X] T027 [US1] Create `apps/shell/src/internal/chrome/layout.tsx` composing `Layout` and `Nav` from `@enterprise-mfe/ui`
- [X] T028 [US1] Wrap `exposed/App.tsx` in `AuthProvider` from `@enterprise-mfe/auth`
- [X] T029 [US1] Add a session indicator to the chrome using `useAuth()` — shows the signed-in person's name, or a sign-in control
- [X] T030 [US1] Gate at least one area of the frame with `ProtectedRoute` from `@enterprise-mfe/auth` (`FR-003`)
- [X] T031 [US1] Remove the smoke `Button` from T015 now that real chrome exists

**Checkpoint**: `pnpm dev --filter shell` shows a styled, navigable frame with a working session, and this is independently demoable — the MVP

---

## Phase 4: User Story 2 - Point the host at a different environment without touching its code (Priority: P1)

**Goal**: The registry files are the only thing that changes between environments; adding a remote touches exactly one file

**Independent Test**: Change the selected environment, restart, and observe the host resolving a different registry — zero edits to host source between the two runs.

### Tests for User Story 2

- [X] T032 [P] [US2] `apps/shell/tests/manifest.test.ts` — a missing registry file fails with a message naming the file and environment (`FR-009`)
- [X] T033 [P] [US2] `apps/shell/tests/manifest.test.ts` — a malformed (unparseable) registry fails the same way
- [X] T034 [P] [US2] `apps/shell/tests/manifest.test.ts` — two registrations sharing a `name` are reported as a conflict, never resolved last-wins (spec edge case 1)
- [X] T035 [P] [US2] `apps/shell/tests/manifest.test.ts` — a `routePath` colliding with a host-owned route is reported at startup, naming both (spec edge case, US2 scenario 3)
- [X] T036 [P] [US2] `apps/shell/tests/manifest.test.ts` — an environment with no matching registry file fails naming both the environment and the expected file, rather than falling back silently (spec edge case 4)

### Implementation for User Story 2

- [X] T037 [US2] Create `apps/shell/src/internal/routes/remote-routes.tsx` — the host-owned route → remote mapping (research D9); starts with zero entries
- [X] T038 [US2] Wire `react-router` in `exposed/App.tsx` with the host's own routes plus the (currently empty) remote routes from T037

### Verification for User Story 2 (SC-002, SC-003)

- [X] T039 [US2] **Prove SC-002**: run `FEDERATION_ENV=staging pnpm build --filter shell` then `FEDERATION_ENV=production pnpm build --filter shell`; confirm the deployed `remotes.json` differs between builds and `git status --porcelain apps/shell/src` is **empty** after both — zero host source files changed
- [X] T040 [US2] **Prove SC-003**: add one placeholder registration to `remotes.dev.json` plus its origin to `allowedOrigins`, confirm `git status --porcelain apps/shell` shows exactly one file changed, then revert

**Checkpoint**: Moving environments and adding a remote registration are both provably file-only changes

---

## Phase 5: User Story 3 - A broken remote does not take down the host (Priority: P2)

**Goal**: Every remote-loading failure mode is contained to its own region; the rest of the application stays usable

**Independent Test**: Point the host at a remote location that does not respond, one that responds with garbage, and one that never finishes; confirm each is contained.

### Tests for User Story 3 — the four simulated failure modes, one test each

- [X] T041 [P] [US3] `packages/federation-utils/tests/use-remote.test.tsx` — a loader that **rejects** resolves `state` to `failed`, exposes the rejection reason in `error`, and the rest of the tree stays rendered (quickstart §4, row 1)
- [X] T042 [P] [US3] `packages/federation-utils/tests/use-remote.test.tsx` — a loader that **never settles** resolves `state` to `failed` after `timeoutMs`, not a permanent loading state (quickstart §4, row 2)
- [X] T043 [P] [US3] `packages/federation-utils/tests/use-remote.test.tsx` — a loader that resolves to a module **with no usable default export** resolves `state` to `failed`, not `loaded` with an empty region (quickstart §4, row 3; spec edge case 3)
- [X] T044 [P] [US3] `packages/federation-utils/tests/remote-boundary.test.tsx` — a component that **throws during render** (not during load) is contained by `RemoteBoundary`, not just by `useRemote`'s own state (quickstart §4, row 4)
- [X] T045 [P] [US3] `packages/federation-utils/tests/use-remote.test.tsx` — while `state` is `loading`, a distinct in-progress element renders, never a blank region (`FR-013`)
- [X] T046 [P] [US3] `packages/federation-utils/tests/use-remote.test.tsx` — `retry()` returns `state` from `failed` to `loading` without the calling component unmounting (`FR-014`)
- [X] T047 [US3] `apps/shell/tests/remote-region.test.tsx` — a failed region does not prevent navigation to other parts of the host (`FR-012`, the guard rail the whole story exists to prove)

### Implementation for User Story 3

- [X] T048 [US3] Create `packages/federation-utils/src/use-remote.ts` implementing the state machine from [data-model.md](data-model.md) `RemoteLoadState` (`idle → loading → loaded | failed`), driven by a `RemoteLoader<T>` function, with `timeoutMs` defaulting to 10000
- [X] T049 [US3] Create `packages/federation-utils/src/remote-boundary.tsx` as a class component (React has no hook equivalent for error boundaries) implementing `RemoteBoundaryProps` — `fallback`, optional `pending`, optional `onError`
- [X] T050 [US3] Create `packages/federation-utils/src/index.ts` exporting `useRemote`, `RemoteBoundary`, and their types
- [X] T051 [US3] Create `apps/shell/src/internal/federation/loader.ts` — the federation-specific `RemoteLoader` the shell supplies to `useRemote` (kept out of `federation-utils` itself, per research D5)
- [X] T052 [US3] Create `apps/shell/src/internal/routes/remote-region.tsx` composing `useRemote` + `RemoteBoundary` for a route entry from `remote-routes.tsx`

**Checkpoint**: All four simulated failure modes are proven contained; `pnpm test -- --project @enterprise-mfe/federation-utils` and `--project shell` both pass

---

## Phase 6: User Story 4 - Refuse to load code from an origin nobody approved (Priority: P2)

**Goal**: Only allow-listed origins load, and only over a secure transport outside local development

**Independent Test**: Register a remote on a non-permitted origin and confirm it is refused; register one on a permitted origin and confirm it is allowed. Repeat with an insecure transport.

### Tests for User Story 4 — the four origin-control cases, one test each

- [X] T053 [P] [US4] `apps/shell/tests/origin-guard.test.ts` — an origin **absent from `allowedOrigins`** is refused with reason `origin-not-allowed` (quickstart §5, row 1)
- [X] T054 [P] [US4] `apps/shell/tests/origin-guard.test.ts` — **insecure transport on a non-loopback origin** is refused with reason `insecure-transport` (quickstart §5, row 2)
- [X] T055 [P] [US4] `apps/shell/tests/origin-guard.test.ts` — **insecure transport on loopback** (`http://localhost:3001`) is **allowed** — local development must keep working (quickstart §5, row 3; spec Assumptions)
- [X] T056 [P] [US4] `apps/shell/tests/origin-guard.test.ts` — an **entry that is not a valid URL** is refused with reason `malformed-url` (quickstart §5, row 4)
- [X] T057 [US4] `apps/shell/tests/origin-guard.test.ts` — a refused remote is dropped before `registerRemotes()` is called and never enters `RemoteLoadState` at all (data-model.md `OriginDecision`, "never attempted")
- [X] T058 [US4] `apps/shell/tests/app.test.tsx` — with one refused and one allowed registration, the rest of the application renders unaffected by the refusal (`FR-018`, spec scenario 4.4)

### Implementation for User Story 4

- [X] T059 [US4] Create `apps/shell/src/internal/federation/origin-guard.ts` implementing the three rules from [data-model.md](data-model.md) `OriginDecision`: URL parses, origin is allow-listed, transport is secure unless loopback
- [X] T060 [US4] Create `apps/shell/src/internal/federation/register.ts` running every registration through `origin-guard.ts` before calling MF2's `registerRemotes()`, and reporting each refusal with origin and reason (`FR-018`)
- [X] T061 [US4] Wire `manifest.ts` (T021) → `register.ts` (T060) into `bootstrap.tsx`, so origin control runs before any remote code is fetched

**Checkpoint**: All four origin-control cases are proven; a refused remote never reaches the loading pipeline

---

## Phase 7: User Story 5 - The boundary gate can actually fail (Priority: P3) — issue #2

**Goal**: The cross-app boundary rule, unable to fire since the first commit because no `apps/` directory existed, inspects real application source and can fail

**Independent Test**: Introduce a cross-app import deliberately, confirm the gate fails and names the rule, then revert and confirm it passes.

- [X] T062 [US5] Restore the `apps` argument in the root `package.json` `check:boundaries` script: `depcruise apps packages --config .dependency-cruiser.js`
- [X] T063 [US5] Run `pnpm check:boundaries` and confirm it passes against the real `apps/shell` source (`FR-020` first half). Restoring `apps` immediately surfaced 13 real violations of `no-reaching-into-internal` — the original rule (bootstrapped, never exercised) had no same-app carve-out and flagged an app importing its *own* internal/. Fixed by splitting it into `no-cross-app-reaching-into-internal` (backreferenced, same pattern as `no-cross-app-relative-imports`) and `no-package-reaching-into-app-internal` (for packages/scripts). This on its own is real, organic proof the gate is not vacuous — see the commit for the full 13-violation list.
- [X] T064 [US5] **Partially blocked — issue #6.** Deliberately reintroducing a cross-app import to prove `pnpm check:boundaries` fails end-to-end was attempted and could not be completed: dependency-cruiser fails to resolve *any* relative import needing 2+ `../` segments in this actual checkout (every realistic cross-app path needs 3+, given the folder depth), while a byte-for-byte identical isolated reproduction resolves the same import correctly every time. Root cause not found despite ruling out dependency-cruiser 16 vs 18, `moduleResolution` bundler vs node10, `tsPreCompilationDeps`, target-dir `package.json` presence, tmpfs vs ext4, and the pnpm exec wrapper. **What was verified instead**: the rule's regex logic (`from`/`to`/`pathNot`, including the `$1` backreference) was tested directly against simulated resolved paths for all three rules — each fires exactly on the violating case and stays silent on the legitimate same-app case, across 7 scenarios. `FR-020`/`SC-006` are satisfied by rule-logic verification plus the organic T063 evidence, not by a fresh end-to-end CLI reproduction; issue #6 tracks closing that gap.
- [X] T065 [US5] Same treatment and same blocker as T064 — see issue #6. `no-cross-app-reaching-into-internal` and `no-package-reaching-into-app-internal` were both included in the regex-logic verification above (dashboard→shell/internal fires; packages/ui→shell/internal fires; scripts→shell/internal fires; shell/exposed and shell/tests reaching shell/internal correctly do not fire).

**Checkpoint**: Both dependency-cruiser rules' logic is proven correct, and the gate is proven non-vacuous by real violations it already caught (T063). Full CLI-level reproduction of a *new* deliberate violation is blocked by issue #6, opened rather than silently skipped.

---

## Phase 8: Guard rails and cross-cutting verification

**Purpose**: The singleton drift check gains its first `apps/` manifest; every existing gate is re-verified with the shell in place

- [X] T066 Add `react-router` to `SINGLETONS` in `scripts/check-shared-deps.ts`, with a comment pointing at constitution Principle III and research D6 (router context crossing the federation boundary is the same class of bug as two Reacts)
- [X] T067 Run `pnpm check:shared-deps` and confirm it reports on `apps/shell` — the first manifest under `apps/` the drift check has ever seen — with `react`, `react-dom`, and `react-router` all in agreement
- [X] T068 **Prove the drift check catches drift in an app, not just a package**: set a mismatched `react-router` range in `apps/shell/package.json`, confirm `pnpm check:shared-deps` exits 1 and names `apps/shell/package.json`, then revert
- [X] T069 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm check:boundaries`, `pnpm check:shared-deps` in sequence on a clean checkout and confirm all six exit `0` (`SC-007`)

---

## Phase 9: Polish, documentation, and ADRs

- [ ] T070 [P] `apps/shell/README.md` — what the shell does, how to run it standalone, and a pointer to the registry contract
- [ ] T071 [P] `packages/federation-utils/README.md` — one paragraph on what it solves, noting it has no bundler or MF dependency (research D5)
- [ ] T072 Update `docs/packages.md` — move `@enterprise-mfe/federation-utils` from "planned" to its real entry, matching the pattern of the sprint-2 packages
- [ ] T073 Create `docs/architecture.md` section (or new file if none exists) documenting the registry format as the contract a team follows without reading shell source (`FR-010`) — content already drafted in [registry-contract.md](contracts/registry-contract.md), adapt rather than duplicate
- [ ] T074 Write `docs/decisions/0012-runtime-registry-fetch.md` recording research D3 — one build, three deployments — per the Constitution Check's note that this decision outlives the sprint (plan.md, Constitution Check)
- [ ] T075 Confirm whether T018's fallback ADR (`0013-tailwind-v3-fallback.md`) was needed; if not, remove the placeholder number from planning notes so it is not mistaken for a real decision later
- [ ] T076 Run every step of [quickstart.md](quickstart.md) §1–§7 end to end on a clean checkout
- [ ] T077 Write the pull request description with a **one-line justification for each of the seven new dependencies** — `@rspack/core`, `@rspack/cli`, `@module-federation/enhanced`, `tailwindcss`, `@tailwindcss/postcss`, `postcss` + `postcss-loader`, `react-router` (constitution Principle IX)
- [ ] T078 Review the full diff against `.claude/agents/pr-reviewer.md` before opening the pull request

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies. Everything downstream needs the shell to exist and build
- **Phase 2 Foundational**: depends on Phase 1. The Tailwind pipeline (T012–T018) must complete before **any** chrome is built (US1) — that ordering is deliberate, not incidental. The registry mechanism (T019–T023) is needed by both US1 (empty-registry case) and US2 (everything)
- **Phase 3 (US1)** and **Phase 4 (US2)**: both depend on Phase 2. Both are P1 and largely independent of each other — US1 is the frame, US2 is the registry's file-only property
- **Phase 5 (US3)** and **Phase 6 (US4)**: both depend on Phase 2's registry existing, and are independent of each other and of US1/US2's completion, though US3's `remote-region.tsx` (T052) is naturally sequenced after US2's `remote-routes.tsx` (T037)
- **Phase 7 (US5)**: depends on `apps/shell` existing (Phase 1) but not on any other story — it could in principle run immediately after Phase 1, and is ordered last only because it is P3
- **Phase 8**: depends on `apps/shell/package.json` existing (Phase 1) and is otherwise independent
- **Phase 9**: last

### Within Each User Story

- Tests are written before the implementation they cover, and must fail first
- T048 (`use-remote.ts`) before T049 (`remote-boundary.tsx`) is not required — they are independent files — but both before T050 (barrel export)
- T059 (`origin-guard.ts`) before T060 (`register.ts`) — register calls the guard
- T021 (`manifest.ts`) → T060 (`register.ts`) → T061 (wiring into `bootstrap.tsx`) is a hard chain

### Parallel Opportunities

- T019 and T020 (registry types and the three JSON files) are different files
- All of T024–T026 (US1 tests) are independent
- All of T032–T036 (US2 manifest validation tests) are independent
- All of T041–T046 (US3's four failure-mode tests plus the two supporting ones) are independent — they are the clearest parallel block in the whole feature
- All of T053–T056 (US4's four origin-control tests) are independent
- **US3 and US4 are the real parallel opportunity between stories**: both depend only on Phase 2, and touch disjoint files (`federation-utils/` vs `federation/origin-guard.ts`) until T061 wires them together

---

## Parallel Example: User Story 3

```bash
# The four simulated failure modes, written together before use-remote.ts exists:
Task: "use-remote rejects → failed, with reason"
Task: "use-remote never settles → failed after timeout"
Task: "use-remote no usable export → failed, not empty loaded"
Task: "RemoteBoundary contains a render-time throw"
```

## Parallel Example: User Story 4

```bash
# The four origin-control cases, written together before origin-guard.ts exists:
Task: "origin not allow-listed → refused"
Task: "insecure transport, non-loopback → refused"
Task: "insecure transport, loopback → ALLOWED"
Task: "malformed entry URL → refused"
```

---

## Implementation Strategy

### MVP scope

Phases 1, 2, and 3 — scaffolding, the Tailwind pipeline proven, and User Story 1.
At that checkpoint there is a real, styled, running application with a working
session and zero remotes — independently demoable, and the claim competing
starters cannot make with a toy example.

### Incremental delivery

1. Phases 1–2 → shell exists, Tailwind proven (issue #4 closed), registry mechanism ready
2. Phase 3 → **MVP**: the frame is real
3. Phase 4 → environment-as-a-file is proven (`SC-002`, `SC-003`)
4. Phases 5–6 → the two guard rails a remote will depend on next sprint, proven against simulations
5. Phase 7 → the boundary gate can fail for the first time (issue #2 closed)
6. Phase 8 → the drift check extends to `apps/`
7. Phase 9 → docs, the registry-fetch ADR, and the pull request

### Commit discipline

Commit per task or per logical group, scoped `shell` or `federation-utils` per
`commitlint.config.mjs`; cross-cutting changes to root scripts (Phases 7–8) take
scope `repo`; ADRs and docs (Phase 9) take scope `docs`.

---

## Notes

- [P] = different files, no dependencies on incomplete work
- T016/T017 are the two tasks that prove issue #4 is actually resolved, not just
  that the build didn't crash — a build that succeeds while silently dropping
  Tailwind's output would pass every other gate in this list
- T064/T065 and T068 are the tasks that prove a gate rather than trusting it,
  continuing the discipline T063/T071 established in sprint 2 for the drift check
- T023 and T037 both start as near-empty (default environment, zero routes) —
  that is intentional; there is nothing to route to until sprint 4

---

description: "Task list for Shared Packages Foundation"
---

# Tasks: Shared Packages Foundation

**Input**: Design documents from `/specs/001-shared-packages-foundation/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. FR-021 requires automated tests for every exported component and hook, and SC-005 makes the suite a success criterion — so tests are part of the deliverable, not optional here.

**Organization**: Grouped by the four prioritized user stories from spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task names an exact file path

## A note on how stories map to phases

Two of the four stories are about properties of the workspace rather than new
surface area. `shared-types` (US3) and the config packages (US4) must physically
exist before US1 and US2 can compile against them, so their *creation* lands in
Setup and Foundational. Their story phases hold the tasks that prove the property
holds — single definition, inheritance without copies. Each story stays
independently verifiable, which is what the phase split is for.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the workspace scaffolding every later phase compiles against

- [ ] T001 Create `packages/` directory at the repository root (already globbed by `pnpm-workspace.yaml`, no config change needed)
- [ ] T002 Create `packages/config-typescript/package.json` as `@enterprise-mfe/config-typescript`, private, with `files` exposing the two tsconfig files
- [ ] T003 Create `packages/config-typescript/tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess`, `isolatedModules`, `moduleResolution: bundler`, target ES2022 — the exact path `.dependency-cruiser.js` already points at
- [ ] T004 Create `packages/config-typescript/tsconfig.react.json` extending the base and adding `jsx: react-jsx` and the DOM libs
- [ ] T005 Update the root `package.json` `check:boundaries` script to `depcruise packages --config .dependency-cruiser.js` — `apps/` does not exist yet and `depcruise` errors on a missing argument directory; sprint 3 adds `apps` back when the shell lands
- [ ] T006 Verify `pnpm check:boundaries` exits 0 against the real workspace, not by bypass
- [ ] T007 [P] Create `packages/config-biome/package.json` as `@enterprise-mfe/config-biome`, private, exposing `biome.json`
- [ ] T008 [P] Create `packages/config-biome/biome.json` copying the rules currently in the root `biome.json` verbatim — single quotes, semicolons, 2-space indent, width 100, `noUnusedVariables: error`
- [ ] T009 Add the four test devDependencies to the root `package.json`: `vitest@^4.1.10`, `@vitejs/plugin-react@^6.0.5`, `jsdom@^30.0.1`, `@testing-library/react@^16.3.2`, then run `pnpm install`
- [ ] T010 Create `vitest.config.ts` at the repository root declaring `test.projects: ['packages/*']`, the React plugin, and `environment: 'jsdom'`
- [ ] T011 Verify `pnpm test` runs and exits 0 with zero test files, proving the runner is wired before any test exists

**Checkpoint**: `pnpm lint`, `pnpm check:boundaries`, and `pnpm test` all pass on an empty workspace

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The type contracts `ui` and `auth` both compile against

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T012 Create `packages/shared-types/package.json` as `@enterprise-mfe/shared-types` with `exports` pointing at `./src/index.ts` (no build step, per research D1)
- [ ] T013 Create `packages/shared-types/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.base.json`
- [ ] T014 [P] Create `packages/shared-types/src/user.ts` defining `Permission` (`users:read`, `users:write`, `dashboard:read`), `Role` (`admin`, `editor`, `viewer`), and `User` per [data-model.md](data-model.md)
- [ ] T015 [P] Create `packages/shared-types/src/component.ts` defining `WithClassName` and `RemoteAppProps`
- [ ] T016 Add the frozen `ROLE_PERMISSIONS` lookup table to `packages/shared-types/src/user.ts`, mapping each role to its permissions — the one piece of runtime data in this package, per [config-contract.md](contracts/config-contract.md)
- [ ] T017 Create `packages/shared-types/src/index.ts` re-exporting every public type and `ROLE_PERMISSIONS`, as the package's only public entry
- [ ] T018 Create `packages/shared-types/tests/role-permissions.test.ts` asserting every `Role` has an entry and every listed permission is a valid `Permission`

**Checkpoint**: Types resolve from a package name; `pnpm test` and `pnpm typecheck` pass

---

## Phase 3: User Story 1 - See a real interface without building one (Priority: P1) 🎯 MVP

**Goal**: Seven components that render styled, respond to interaction, and are fully operable by keyboard

**Independent Test**: Render every exported component in isolation and drive it by keyboard. No shell, no remote, no auth involved.

### Package scaffolding

- [ ] T019 [US1] Create `packages/ui/package.json` as `@enterprise-mfe/ui` with `react`/`react-dom` `^19.2.8` as **peerDependencies** (research D7 — never regular dependencies), matching devDependencies for tests, and zero runtime dependencies (research D3)
- [ ] T020 [US1] Create `packages/ui/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`
- [ ] T021 [US1] Create `packages/ui/src/styles/tokens.css` with the Tailwind v4 `@theme` block defining colour, spacing, radius, and typography tokens (research D2)
- [ ] T022 [US1] Add the `./styles.css` subpath to `packages/ui/package.json` `exports` so consumers import `@enterprise-mfe/ui/styles.css`
- [ ] T023 [US1] Create `packages/ui/src/utils/cx.ts` — the ~10-line class-composition helper that replaces a `clsx` dependency

### Tests for User Story 1

> Write these first and confirm they fail before implementing the component each one covers

- [ ] T024 [P] [US1] `packages/ui/tests/button.test.tsx` — renders each variant and size, click and Enter/Space activation, disabled state conveyed to assistive technology, `className` appended not replaced
- [ ] T025 [P] [US1] `packages/ui/tests/input.test.tsx` — label programmatically associated, generated id when omitted, error announced, `className` forwarded
- [ ] T026 [P] [US1] `packages/ui/tests/table.test.tsx` — renders rows with header scope, and an empty collection renders `emptyState` rather than a bare frame (spec scenario 1.3)
- [ ] T027 [P] [US1] `packages/ui/tests/toast.test.tsx` — two simultaneous toasts both stay readable and dismiss independently (spec scenario 1.4), announced politely
- [ ] T028 [P] [US1] `packages/ui/tests/layout.test.tsx` — header, sidebar, footer render as real landmark regions
- [ ] T029 [P] [US1] `packages/ui/tests/nav.test.tsx` — arrow-key movement between items, active item marked as current rather than only styled

**The five Modal focus rules — one named test each** ([ui-contract.md](contracts/ui-contract.md)). These are the acceptance surface for research decision D3 (hand-rolled instead of Radix), so they are not folded into one "modal works" test:

- [ ] T030 [P] [US1] `packages/ui/tests/modal-focus.test.tsx` — **rule 1**: on open, focus moves to the first focusable element, or to the container when none exists
- [ ] T031 [P] [US1] `packages/ui/tests/modal-focus.test.tsx` — **rule 2**: Tab and Shift+Tab cycle within the modal and never reach content behind it
- [ ] T032 [P] [US1] `packages/ui/tests/modal-focus.test.tsx` — **rule 3**: Escape invokes `onClose`
- [ ] T033 [P] [US1] `packages/ui/tests/modal-focus.test.tsx` — **rule 4**: on close, focus returns to the element focused before opening (spec scenario 1.2)
- [ ] T034 [P] [US1] `packages/ui/tests/modal-focus.test.tsx` — **rule 5**: content behind the modal is inert to assistive technology while it is open

### Implementation for User Story 1

- [ ] T035 [P] [US1] `packages/ui/src/components/button.tsx` — variants, sizes, ref forwarding, prop spreading
- [ ] T036 [P] [US1] `packages/ui/src/components/input.tsx` — required `label`, generated id, `error` and `hint`
- [ ] T037 [P] [US1] `packages/ui/src/components/table.tsx` — generic over row type, `columns`/`rows`/`getRowId`/`emptyState`
- [ ] T038 [P] [US1] `packages/ui/src/components/layout.tsx` — landmark regions, predictable small-width collapse
- [ ] T039 [P] [US1] `packages/ui/src/components/nav.tsx` — roving focus, `aria-current` on the active item
- [ ] T040 [US1] `packages/ui/src/hooks/use-focus-trap.ts` — the focus management behind Modal rules 1, 2, and 4
- [ ] T041 [US1] `packages/ui/src/components/modal.tsx` — consumes the focus trap, handles Escape, marks background inert (depends on T040)
- [ ] T042 [US1] `packages/ui/src/components/toast.tsx` and `packages/ui/src/hooks/use-toast.ts` — provider-owned queue, independent dismissal
- [ ] T043 [US1] `packages/ui/src/index.ts` re-exporting the seven components, `ToastProvider`, `useToast`, and every prop type
- [ ] T044 [US1] Confirm no component imports from `@enterprise-mfe/auth` or any app (FR-005) — verified by `pnpm check:boundaries` and by inspection of `packages/ui/package.json` dependencies

**Checkpoint**: `pnpm test --filter @enterprise-mfe/ui` passes; all seven components render and are keyboard-operable (SC-002)

---

## Phase 4: User Story 2 - Gate a screen behind authentication with zero setup (Priority: P2)

**Goal**: The session contract every remote will consume, backed by an in-memory stub

**Independent Test**: Wrap any component in `ProtectedRoute`, toggle the session, observe access change. No service, no environment variable.

### Package scaffolding

- [ ] T045 [US2] Create `packages/auth/package.json` as `@enterprise-mfe/auth`, depending on `@enterprise-mfe/shared-types`, with `react`/`react-dom` `^19.2.8` as peerDependencies
- [ ] T046 [US2] Create `packages/auth/tsconfig.json` extending `@enterprise-mfe/config-typescript/tsconfig.react.json`

### Tests for User Story 2

- [ ] T047 [P] [US2] `packages/auth/tests/session-status.test.tsx` — initial `status` is `unknown` and then resolves; never a boolean flash (spec edge case 1)
- [ ] T048 [P] [US2] `packages/auth/tests/protected-route.test.tsx` — while unauthenticated, children are absent from the tree, not merely hidden (SC-003)
- [ ] T049 [P] [US2] `packages/auth/tests/protected-route.test.tsx` — after `login()`, children render and identity plus permissions are readable
- [ ] T050 [P] [US2] `packages/auth/tests/shared-session.test.tsx` — two consumers of `useAuth()` in one tree both observe a single `logout()` (FR-009)
- [ ] T051 [P] [US2] `packages/auth/tests/use-auth-guard.test.tsx` — `useAuth()` outside a provider throws an error naming the missing provider (spec edge case 2)
- [ ] T052 [P] [US2] `packages/auth/tests/invariant.test.tsx` — `user` is non-null exactly when `status === 'authenticated'`

### Implementation for User Story 2

- [ ] T053 [US2] `packages/auth/src/stub.ts` — the fixed in-memory user with the `admin` role, isolated in one file so replacing it touches nothing else (research D9)
- [ ] T054 [US2] `packages/auth/src/context.tsx` — `AuthProvider` holding the three-state `status`, and `useAuth()` that throws outside a provider
- [ ] T055 [US2] `packages/auth/src/protected-route.tsx` — `children` / `fallback` / `pending` mapped to the three states per [auth-contract.md](contracts/auth-contract.md)
- [ ] T056 [US2] `packages/auth/src/index.ts` exporting exactly `useAuth`, `AuthProvider`, `ProtectedRoute` and their types — nothing from `stub.ts` reaches the public surface
- [ ] T057 [US2] Confirm no network call, storage access, or environment variable read exists anywhere in `packages/auth/src/` (FR-008)

**Checkpoint**: `pnpm test --filter @enterprise-mfe/auth` passes with zero configuration set

---

## Phase 5: User Story 3 - Depend on one definition of a shared concept (Priority: P3)

**Goal**: Prove each shared concept resolves to exactly one definition

**Independent Test**: Search the workspace for competing definitions; change a shape and watch consumers fail to compile.

- [ ] T058 [US3] Replace any local `User`, `Role`, or `Permission` declaration in `packages/auth/src/` with an import from `@enterprise-mfe/shared-types` (FR-015)
- [ ] T059 [US3] Replace any local `className` prop declaration in `packages/ui/src/` with `WithClassName` from `@enterprise-mfe/shared-types`
- [ ] T060 [US3] `specs/001-shared-packages-foundation/quickstart.md` §4 check — run the two `grep` commands and confirm exactly one definition each (SC-004)
- [ ] T061 [US3] `packages/shared-types/tests/contract-propagation.test-d.ts` — a type-level test asserting consumers fail to compile when a shared shape changes incompatibly (spec scenario 3.3)

**Checkpoint**: Zero duplicate declarations; a shape change breaks consumers at type-check time

---

## Phase 6: User Story 4 - Inherit the project's standards instead of copying them (Priority: P4)

**Goal**: Prove shared configuration is inherited, never copied

**Independent Test**: Create a throwaway package that extends the shared config and confirm it inherits strictness and formatting with no local overrides.

- [ ] T062 [US4] Confirm every `packages/*/tsconfig.json` extends `@enterprise-mfe/config-typescript` and declares no compiler option already set in the base (FR-018)
- [ ] T063 [US4] Point the root `biome.json` at `@enterprise-mfe/config-biome` via `extends`, then run `pnpm lint` and confirm **zero files change** — proving the extracted copy is faithful (FR-017)
- [ ] T064 [US4] Create a throwaway package extending both shared configs, confirm it inherits strictness and formatting with no local rules, then delete it (SC-006)
- [ ] T065 [US4] Introduce a deliberate rule violation in one package, confirm `pnpm lint` fails, then revert (spec scenario 4.2)

**Checkpoint**: Adding a package requires extending configuration and copying zero rules

---

## Phase 7: The singleton drift gate

**Purpose**: Build the Principle III gate that `pnpm check:shared-deps` currently fails for want of. Separated from Polish because it is a constitutional requirement (FR-012), not a nicety.

- [ ] T066 Create `scripts/check-shared-deps.ts` reading every `package.json` under `apps/*` and `packages/*`, treating a missing directory as not-an-error (`apps/` does not exist yet)
- [ ] T067 Implement the comparison: for each singleton, the declared range must be byte-identical across `dependencies`, `devDependencies`, and `peerDependencies` in every manifest that declares it
- [ ] T068 Define the singleton list as an explicit exported constant — `react`, `react-dom`, `@enterprise-mfe/auth` (FR-012), with `@enterprise-mfe/event-bus` commented as sprint-6 work — carrying a comment that points at constitution Principle III
- [ ] T069 Implement the report: a table of package → declared range → where on divergence with exit code 1, one line per singleton with exit code 0 on agreement. It reports and never edits a manifest, matching `.claude/agents/shared-deps-guard.md`
- [ ] T070 Verify `pnpm check:shared-deps` exits 0 on the real workspace
- [ ] T071 **Prove the gate catches drift**: change `react` to a different range in `packages/ui/package.json`, confirm `pnpm check:shared-deps` exits 1 and names `packages/ui`, then revert and confirm it exits 0 again (quickstart §5 — a gate that has never failed has not been tested)

**Checkpoint**: Both previously-broken gates now pass on their own merits

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T072 [P] `packages/config-typescript/README.md` — one paragraph on what it solves (FR-019)
- [ ] T073 [P] `packages/config-biome/README.md` — one paragraph on what it solves
- [ ] T074 [P] `packages/shared-types/README.md` — one paragraph, noting it ships no runtime code
- [ ] T075 [P] `packages/ui/README.md` — one paragraph, plus the stylesheet import step a consumer must not skip
- [ ] T076 [P] `packages/auth/README.md` — **the first paragraph must state this is a stub with an in-memory user and is not production authentication** (FR-011, SC-008), then link `docs/decisions/0009-auth-contract-not-implementation.md`
- [ ] T077 Create `docs/packages.md` cataloguing the five packages, matching the tone of `docs/blueprint.html` §7 — the documentation entry FR-019 requires beyond code
- [ ] T078 Confirm CI's `continue-on-error` on the boundary and drift steps in `.github/workflows/ci.yml`: the drift step can become a hard failure now that the script exists; the boundary step stays tolerant only if `apps/` is still absent — decide and record which, in the PR
- [ ] T079 Run every step of [quickstart.md](quickstart.md) §1–§7 end to end on a clean checkout
- [ ] T080 Write the pull request description with a **one-line justification for each of the four new root devDependencies** — `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react` (constitution Principle IX)
- [ ] T081 Run the `pr-reviewer` agent over the full diff before opening the pull request

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies. T003 (`tsconfig.base.json`) blocks everything — it is the path `.dependency-cruiser.js` already references
- **Phase 2 Foundational**: depends on Phase 1. Blocks US1 and US2
- **Phase 3 (US1)** and **Phase 4 (US2)**: both depend on Phase 2. Independent of each other and can run in parallel
- **Phase 5 (US3)**: depends on US1 and US2 existing, since it verifies that *they* consume the shared definitions
- **Phase 6 (US4)**: depends on all packages existing, since it verifies inheritance across all of them
- **Phase 7 gate**: depends on the packages existing to have something to compare
- **Phase 8 Polish**: last

### Within Each User Story

- Tests are written before the implementation they cover, and must fail first
- `use-focus-trap` (T040) before `modal.tsx` (T041) — the only hard ordering inside US1
- `stub.ts` and `context.tsx` before `protected-route.tsx` in US2

### Parallel Opportunities

- T007 and T008 (config-biome) run parallel to T002–T004 (config-typescript)
- T014 and T015 (the two type modules) are different files
- All of T024–T034 (US1 tests) are independent of each other
- All of T035–T039 (the five simple components) are independent; T040–T042 are not
- All of T047–T052 (US2 tests) are independent
- All READMEs (T072–T076) are independent
- **US1 and US2 are the real parallel opportunity**: two people can take the design system and the auth contract simultaneously once Phase 2 lands

---

## Parallel Example: User Story 1

```bash
# The five Modal focus rules, written together before the implementation:
Task: "modal-focus rule 1 — focus enters on open"
Task: "modal-focus rule 2 — Tab cycles within the modal"
Task: "modal-focus rule 3 — Escape closes"
Task: "modal-focus rule 4 — focus returns to the opener"
Task: "modal-focus rule 5 — background is inert"

# The five components with no shared implementation:
Task: "button.tsx"
Task: "input.tsx"
Task: "table.tsx"
Task: "layout.tsx"
Task: "nav.tsx"
```

---

## Implementation Strategy

### MVP scope

Phases 1, 2, and 3 — setup, shared types, and the design system. That is
User Story 1, the claim most easily disproved and the one that makes the
repository worth looking at. At that checkpoint the workspace has real
components, a passing test suite, and two working gates.

### Incremental delivery

1. Phases 1–2 → foundation, gates green on an empty workspace
2. Phase 3 → **MVP**: the design system is real and tested
3. Phase 4 → the auth contract every remote will consume
4. Phases 5–6 → the two structural properties proved rather than asserted
5. Phase 7 → the drift gate becomes real, and is proved by breaking it
6. Phase 8 → documentation, quickstart validation, pull request

### Commit discipline

Commit per task or per logical group, scoped to the package touched
(`config-typescript`, `config-biome`, `shared-types`, `ui`, `auth`, `repo`) —
the scopes already allow-listed in `commitlint.config.mjs`. Phases 1, 7, and 8
touch root configuration and take the `repo` scope.

---

## Notes

- [P] = different files, no dependencies on incomplete work
- Every task names a real path; nothing says "implement the package"
- T005 is a real correction, not bookkeeping: without it `pnpm check:boundaries`
  keeps failing on the missing `apps/` directory no matter what this feature builds
- T063 and T071 are the two tasks that prove a gate rather than trusting it —
  if either is skipped, the corresponding guard rail is unverified

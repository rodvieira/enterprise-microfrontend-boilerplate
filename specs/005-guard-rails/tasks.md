---

description: "Task list for Guard Rails"
---

# Tasks: Guard Rails

**Input**: Design documents from `/specs/005-guard-rails/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: Included — this feature *is* a test (the real-failure e2e
scenario) plus the CI wiring that enforces the whole existing suite.

**Organization**: Grouped by the three prioritized user stories from
spec.md. This is a small, honestly-scoped sprint (research.md, final
section) — no data-model.md/contracts/, no new package or app.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Every task names an exact file path

## A note on how stories map to phases

US1 (real remote failure) and US2 (CI enforcement) are independent of each
other — one is an e2e spec, the other is a workflow file — but US2's
"prove CI catches a real failure" step is more convincing once US1's
scenario exists for CI to run, so US1 is sequenced first. US3 (the closing
ADR) depends on both being done, since it points at what they proved.

---

## Phase 1: Setup

- [X] T001 Verify Playwright's Chromium browser is installed locally (`npx playwright install chromium`) — needed before T002 can run

---

## Phase 2: User Story 1 - A real remote going down doesn't take anything else with it (Priority: P1)

**Goal**: Prove the existing failure-containment mechanism (`packages/federation-utils`, `apps/shell`'s `RemoteRegion`) against a genuine network-layer failure, not a simulated loader.

**Independent Test**: With the shell composing both real remotes, abort one remote's manifest/entry requests at the network layer, navigate to its route, and confirm the region shows a contained, retryable failure while the shell's chrome, navigation, and the other composed remote are unaffected.

### Tests for User Story 1

- [X] T002 [P] [US1] `apps/shell/e2e/remote-failure.spec.ts` — aborting the dashboard remote's `mf-manifest.json`/`remoteEntry.js` requests (`page.route(...).abort()`, research D1) shows a contained failure state for `/dashboard` only; the shell's navigation and the `/admin` route remain fully usable (`FR-001`–`FR-003`)
- [X] T003 [P] [US1] `apps/shell/e2e/remote-failure.spec.ts` — clearing the aborted route and using the failed region's retry control recovers it without a full page reload (`FR-004`)
- [X] T004 [P] [US1] `apps/shell/e2e/remote-failure.spec.ts` — a remote that loaded successfully, then has its requests aborted before a later revisit, shows the same contained failure state on that next load — not stale content (`FR-005`, spec Edge Cases)
- [X] T005 [P] [US1] `apps/shell/e2e/remote-failure.spec.ts` — with *both* remotes' requests aborted simultaneously, the shell's own chrome, navigation, and session remain rendered (spec Edge Cases)

### Implementation for User Story 1

- [X] T006 [US1] Run `pnpm e2e` locally; confirm all four new scenarios pass alongside the existing 8 (`003-dashboard-remote`, `004-admin-remote`) with zero regressions. **No new application code is expected** (research.md, plan.md Summary) — if a scenario fails for a reason other than test-authoring error, that is a real bug in the existing containment logic; fix it here and record what was wrong in the task's own commit, not silently.

---

## Phase 3: User Story 2 - A pull request cannot merge on a broken cross-remote composition (Priority: P1)

**Goal**: `pnpm e2e` becomes a required CI step, closing the one gap between `CLAUDE.md`'s documented gate set and what CI actually enforces.

**Independent Test**: Open a pull request that would fail an existing `pnpm e2e` scenario and confirm the CI run fails on the end-to-end step, the same way it already fails on lint or boundary violations.

### Implementation for User Story 2

- [X] T007 [US2] Add an "Install Playwright browsers" step to `.github/workflows/ci.yml`, running `npx playwright install --with-deps chromium` (research D2 — Chromium only, matching the suite's current default project)
- [X] T008 [US2] Add an "End-to-end" step running `pnpm e2e`, positioned after "Shared deps drift check" and before "Security audit" in the existing `quality` job (research D3 — one job, not a second workflow)

### Verification for User Story 2 (SC-003, SC-004)

- [X] T009 [US2] Push this branch and confirm the `quality` job's new steps both pass in a real CI run — not just locally
- [X] T010 [US2] **Prove CI actually catches a failure**: on a throwaway scratch branch (not `005-guard-rails`), comment out the `patchRoutesOnNavigation` call in `apps/shell/src/exposed/App.tsx`, push, confirm the `quality` job goes red specifically on the "End-to-end" step, then delete the scratch branch without merging it (`quickstart.md` §2)

---

## Phase 4: User Story 3 - The guard-rails phase closes with a record, not silence (Priority: P2)

**Goal**: A new ADR states plainly which guard rails were already done, what this sprint added, and why standalone-repo parity is deferred rather than dropped.

**Independent Test**: Read `docs/decisions/0013-guard-rails-closed.md` cold, with no other context, and confirm it answers all three without further investigation.

### Implementation for User Story 3

- [ ] T011 [US3] Write `docs/decisions/0013-guard-rails-closed.md` (research D4): status Accepted; names all three constitution guard rails with a pointer to where/when each was built (`002-shell-host` for the error boundary's simulated-failure proof and `check:shared-deps`'s first real manifest, `003-dashboard-remote` for the boundary gate's first real second-app retest closing issue #6, `004-admin-remote` for the singleton check covering a second singleton package); records this sprint's addition (the real-failure e2e proof, CI enforcement); states explicitly that "boundary enforcement matches monorepo and standalone-repo behavior" depends on the sprint 7 generator's standalone-mode output per ADR-0007, not an oversight here (`FR-009`, `FR-010`)
- [ ] T012 [US3] Cross-check the ADR's claims against this feature's own commits and the sprints it cites — every "built in sprint N" pointer must be verifiable by a real commit or file, not asserted from memory

---

## Phase 5: Polish, cross-cutting verification

- [ ] T013 Run every step of [quickstart.md](quickstart.md) §1–§4 end to end on a clean checkout
- [ ] T014 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm e2e`, `pnpm check:boundaries`, `pnpm check:shared-deps` in sequence and confirm all seven exit `0` (`SC-004`)
- [ ] T015 Write the pull request description — note explicitly that this sprint adds zero new dependencies and zero new application code beyond one e2e spec (Principle IX; plan.md Summary)
- [ ] T016 Review the diff against `.claude/agents/pr-reviewer.md`'s checks before opening the PR — expect a short review, since neither `apps/*/src/internal/` nor any shared singleton package is touched

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies
- **Phase 2 (US1)**: depends on Phase 1 (Chromium installed)
- **Phase 3 (US2)**: depends on Phase 2 being green locally (T006) — CI should run a suite already known to pass, not be the first place a new scenario is ever executed
- **Phase 4 (US3)**: depends on Phase 2 and Phase 3 both being done, since the ADR points at what they proved
- **Phase 5**: last

### Within User Story 1

- T002–T005 are independent test scenarios in the same file, written together
- T006 (run and fix if needed) follows all four

### Parallel Opportunities

- T002–T005 (all four `remote-failure.spec.ts` scenarios) are independent of each other, differing only in which route/timing they exercise
- T007 and T008 touch the same file (`ci.yml`) sequentially, not in parallel, since T008 is inserted relative to T007's new step

---

## Parallel Example: User Story 1

```bash
# Written together in the same new spec file:
Task: "Real remote failure: one region contained, rest of shell unaffected"
Task: "Retry recovers without full reload once reachable again"
Task: "Mid-session failure on revisit shows the same contained state"
Task: "Both remotes unreachable at once: shell chrome still renders"
```

---

## Implementation Strategy

### MVP scope

Phase 2 (US1) alone already delivers the sprint's most substantive proof —
a real, not simulated, failure containment test. Phases 3–4 are enforcement
and record-keeping on top of it.

### Incremental delivery

1. Phase 1 → Chromium ready
2. Phase 2 → the real-failure scenario exists and passes locally
3. Phase 3 → CI enforces the whole `e2e` suite, proven to actually catch a break
4. Phase 4 → the phase closes with a record
5. Phase 5 → docs and the pull request

### Commit discipline

Commit per phase, scoped `shell` for the new e2e spec (Phase 2), `repo` for
the CI workflow change (Phase 3), and `docs` for the ADR (Phase 4) — matching
`commitlint.config.mjs`'s allow-list.

---

## Notes

- [P] = different files, no dependencies on incomplete work
- T006 is the one task in this sprint carrying real risk: if the "always
  passes, this is just a formality" assumption in `spec.md` Assumptions
  turns out wrong, that's real information, not a task to route around
- T010 is deliberately done on a scratch branch — the point is proving CI
  *can* fail, not leaving a broken commit in this feature's history

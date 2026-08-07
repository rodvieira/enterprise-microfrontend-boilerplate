# Feature Specification: Guard Rails

**Feature Branch**: `005-guard-rails`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Sprint 6: guard rails. The constitution's three named guard rails — dependency-cruiser, the singleton drift check, and the remote-load error boundary — were already built and are already enforced, across sprints 2, 3, and 5. What genuinely remains: (1) the remote-load error boundary has only ever been proven against simulated failures, never a real unreachable remote, now that real remotes exist; (2) `pnpm e2e` is not wired into CI, so the Playwright suite built in sprints 4–5 is never enforced on a pull request; (3) the phase should close with a recorded decision, not silence — documenting that the three guard rails are done and that blueprint's 'standalone-repo parity' bullet is a dependency of sprint 7's generator, not a gap here. No generator work in this sprint."

## User Scenarios & Testing *(mandatory)*

The people served here are the platform team who need confidence the
architecture's safety nets actually hold under real conditions, and every
future contributor whose pull request depends on CI catching what local
checks might not.

### User Story 1 - A real remote going down doesn't take anything else with it (Priority: P1)

An operator or developer encounters a remote that is genuinely unreachable —
its process crashed, its origin is misconfigured, or its dev server was never
started — not a simulated failure in a test file. The rest of the composed
application, including every other remote, keeps working.

**Why this priority**: This is the one guard rail whose existence was proven
only in theory. `002-shell-host` proved the failure-containment logic against
fake loaders because no real remote existed yet to fail for real. Two real
remotes have existed since sprints 4 and 5, and neither has ever actually been
made to fail. A safety net nobody has fallen into is not yet a proven safety
net.

**Independent Test**: With the shell composing both the dashboard and admin
remotes, make one of them genuinely unreachable (its process stopped, or the
registry pointed at a port nothing is listening on), navigate to its route,
and confirm the region shows a contained, retryable failure while the shell's
chrome, navigation, and the other composed remote are all unaffected.

**Acceptance Scenarios**:

1. **Given** the shell is composing both real remotes, **When** one remote's
   process is stopped and its route is visited, **Then** that region shows a
   distinct, contained failure state — not a blank region, not a crashed
   shell.
2. **Given** one remote has failed to load for real, **When** the person
   navigates to a route owned by the shell or by the *other*, still-healthy
   remote, **Then** navigation succeeds and that content renders normally.
3. **Given** the failed region's retry control, **When** the unreachable
   remote becomes reachable again and retry is used, **Then** the region
   recovers without a full application reload.
4. **Given** this same scenario was previously only provable against
   simulated loaders, **When** this story's test runs, **Then** it exercises
   a real, unreachable dev server — closing the gap between "the mechanism
   exists" and "the mechanism has been proven."

---

### User Story 2 - A pull request cannot merge on a broken cross-remote composition (Priority: P1)

A contributor opens a pull request that breaks composition between the shell
and a remote — something no unit test catches, because unit tests don't
compose real federated modules across a real network boundary. CI catches it
before merge, the same way it already catches a lint, type, or boundary
violation.

**Why this priority**: `pnpm e2e` is the only quality gate in this project's
own documented set (`CLAUDE.md`) that CI does not run. Every other gate this
project treats as non-negotiable already blocks a pull request; this one
currently only runs if a contributor remembers to run it locally.

**Independent Test**: Open a pull request that would fail an existing `pnpm
e2e` scenario (for example, breaking the route-patching mechanism) and
confirm the CI run fails on the end-to-end step, the same way it already
fails on lint or boundary violations.

**Acceptance Scenarios**:

1. **Given** a pull request, **When** CI runs, **Then** it executes the full
   end-to-end suite as one of its steps, not only lint/typecheck/build/test.
2. **Given** an end-to-end scenario is broken by a change, **When** CI runs,
   **Then** the pipeline fails and names the failing scenario, the same
   visibility every other gate already provides.
3. **Given** a pull request that breaks nothing, **When** CI runs, **Then**
   the end-to-end step passes without manual intervention or a contributor
   needing local Playwright browsers installed.

---

### User Story 3 - The guard-rails phase closes with a record, not silence (Priority: P2)

Anyone reading this project's history later — including whoever starts the
next phase — can find a single, explicit statement of what "guard rails" was
supposed to deliver, what of that already existed before this sprint, what
this sprint added, and why the one remaining blueprint item is deliberately
deferred rather than forgotten.

**Why this priority**: Without this, a future reader has to reconstruct,
from commit archaeology, whether "guard rails" was ever actually finished, or
independently rediscover that standalone-repo parity depends on the
generator. `002-shell-host`'s and `003-dashboard-remote`'s ADRs exist for
exactly this reason. P2 because it records a decision rather than delivering
new user-facing behavior.

**Independent Test**: Read the resulting decision record cold, with no other
context, and confirm it states plainly which guard rails were already done
entering this sprint, what this sprint proved or added, and why
standalone-repo parity is not this sprint's gap.

**Acceptance Scenarios**:

1. **Given** the decision record, **When** it is read on its own, **Then**
   it names all three constitution guard rails and states, for each, where
   and in which sprint it was built and verified.
2. **Given** the blueprint's "standalone-repo parity" item, **When** the
   record addresses it, **Then** it states explicitly that this depends on
   the sprint 7 generator producing real standalone-mode output, per
   ADR-0007 — not that it was overlooked.
3. **Given** a future contributor asks whether guard rails are done, **When**
   they are pointed at this record, **Then** no further investigation is
   needed to answer the question.

---

### Edge Cases

- What happens when *both* composed remotes are simultaneously unreachable?
  The shell itself (chrome, navigation, session) MUST still render — a
  double failure is still two contained failures, not a shell-wide crash.
- What happens when a remote fails after previously loading successfully
  (e.g., its process is killed mid-session, then the person navigates away
  and back)? The region MUST show the contained failure state on the next
  load attempt, not silently keep stale content or crash.
- What happens when CI's end-to-end step itself cannot start (for example,
  a dev server fails to boot within the timeout)? This MUST fail the CI run
  visibly, the same as a genuine test failure — a silently-skipped e2e step
  would be worse than not having one, since it would look green while
  proving nothing.

## Requirements *(mandatory)*

### Functional Requirements

**Real remote-load failure containment**

- **FR-001**: The failure-containment behavior already built
  (`packages/federation-utils`) MUST be demonstrated against a genuinely
  unreachable remote process, not only a simulated loader.
- **FR-002**: While one composed remote is unreachable, the shell's own
  chrome, navigation, and session MUST remain fully functional.
- **FR-003**: While one composed remote is unreachable, any *other* composed
  remote MUST remain reachable and functional.
- **FR-004**: The failed region MUST offer a retry that recovers without a
  full page reload once the remote becomes reachable again.
- **FR-005**: A remote that fails after a prior successful load (mid-session
  failure, revisited later) MUST show the same contained failure state, not
  stale content.

**CI enforcement**

- **FR-006**: The continuous integration pipeline MUST run the full
  end-to-end suite as a required step on every pull request.
- **FR-007**: An end-to-end scenario failure MUST fail the CI run and name
  the failing scenario.
- **FR-008**: The end-to-end step MUST require no manual setup beyond what
  CI already performs for the other gates — a contributor's pull request is
  checked the same way regardless of whether they ran `pnpm e2e` locally.

**Closing the phase**

- **FR-009**: A decision record MUST state which of the three
  constitution-named guard rails (boundary enforcement, singleton drift
  check, remote-load error boundary) were already complete entering this
  sprint, with a pointer to where and when each was built and verified.
- **FR-010**: The same record MUST state explicitly that "boundary
  enforcement matches monorepo and standalone-repo behavior" is deferred to
  the sprint 7 generator's standalone-mode output (ADR-0007), and is not a
  gap this sprint failed to close.
- **FR-011**: This sprint MUST NOT begin building the scaffolding generator's
  dual-mode output — that remains sprint 7's work, gated by ADR-0008 and
  constitution Principle V.

### Key Entities

- **Real remote failure**: A composed remote made genuinely unreachable
  (process stopped, or registered at an address nothing serves) — distinct
  from every prior failure test in this project, which used a simulated
  loader function instead of a real network boundary.
- **CI gate**: One required step in the pull-request pipeline. This sprint
  adds the end-to-end suite as one, alongside the six already enforced
  (`lint`, `typecheck`, `build`, `test`, `check:boundaries`,
  `check:shared-deps`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With one real remote made unreachable, the rest of the
  composed application — shell chrome, navigation, and any other composed
  remote — remains fully usable, in every test run.
- **SC-002**: A failed region recovers via retry, with no full page reload,
  once the remote is reachable again.
- **SC-003**: CI runs the full end-to-end suite on every pull request and
  fails visibly when a scenario breaks — demonstrated by one pull request
  that deliberately breaks a scenario and is shown red, then a revert shown
  green.
- **SC-004**: The full quality gate set CI now enforces — lint, typecheck,
  build, test, e2e, boundary check, shared-deps check — matches exactly what
  `CLAUDE.md` documents as this project's gates, with zero gaps between
  "documented" and "enforced."
- **SC-005**: A cold read of the closing decision record answers, without
  further investigation, whether each of the three constitution guard rails
  is done and why standalone-repo parity is not this sprint's responsibility.

## Assumptions

- **No new failure-handling code is expected.** `packages/federation-utils`'s
  `useRemote`/`RemoteBoundary` and `apps/shell`'s `RemoteRegion` already
  implement the states this sprint proves against reality (`003-dashboard-remote`,
  `002-shell-host`). This sprint is verification and CI enforcement, not new
  mechanism — if a real failure exposes a bug the simulated tests missed,
  that bug fix is in scope, but building new containment machinery is not.
- **"Genuinely unreachable" is achieved via browser-level network
  interception (Playwright's `page.route(...).abort()`), not by stopping a
  dev server process** — corrected during planning (research.md D1): the
  e2e suite runs `fullyParallel` against shared dev servers for the whole
  run, so stopping a real process would break every other concurrently
  running test. Aborting the specific request for the specific page under
  test is still a real network-layer failure — the same `fetch()` rejection
  a truly-down server produces — and it's the one that doesn't take other
  tests down with it.
- **CI's end-to-end step uses the same `apps/shell/playwright.config.ts`
  already committed** — no separate CI-specific Playwright configuration is
  introduced; the goal is CI running what already runs locally, not a
  parallel setup that could drift from it.
- **The decision record is a new ADR**, per constitution Principle VII (an
  existing ADR is never edited to read as though it always said something
  different) — ADR-0007 and ADR-0008 are referenced, not modified.

### Dependencies

- `packages/federation-utils` (`002-shell-host`) — the failure-state machine
  this sprint proves against reality, unchanged.
- `apps/dashboard` and `apps/admin` (`003-dashboard-remote`,
  `004-admin-remote`) — the two real remotes this sprint's failure scenario
  needs to exist, which it now has.
- `apps/shell/e2e/` (`003-dashboard-remote`, `004-admin-remote`) — the
  existing Playwright suite CI starts running; this sprint adds one more
  scenario to it and wires the whole suite into CI.
- ADR-0007 and ADR-0008 — referenced by the closing record for why
  standalone-repo parity is out of this sprint's scope.

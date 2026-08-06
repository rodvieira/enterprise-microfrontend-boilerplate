# Feature Specification: Dashboard Remote

**Feature Branch**: `003-dashboard-remote`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Sprint 4: apps/dashboard remote — the first micro-frontend remote, per the build order in ADR-0008 (shared packages → shell → dashboard remote → admin remote → guard rails → generator) and the analytics/overview domain assigned to it in ADR-0010 (KPI cards, activity chart, recent activity feed). Follow the same pattern as specs/002-shell-host/spec.md. Cite ADR-0010 and the blueprint's dashboard section (docs/blueprint.html) as authoritative sources for the domain — don't re-derive it from scratch. The remote must satisfy the registry contract at specs/002-shell-host/contracts/registry-contract.md (allowedOrigins, name, entry, routePath, label) and follow the exposed/internal convention already proven in apps/shell. It must match the singleton set already anticipated in scripts/check-shared-deps.ts: react, react-dom, @enterprise-mfe/auth, react-router."

## User Scenarios & Testing *(mandatory)*

The people served here are the team that owns the dashboard domain, the platform
team that registers it into the shell, and the next team (sprint 5, admin) who
will build the second remote against whatever pattern this one establishes.

### User Story 1 - The shell composes a real remote for the first time (Priority: P1)

A developer registers `apps/dashboard` in the shell's development registry,
starts both processes, and sees the dashboard's UI render inside the shell's
frame at its own route — the first time anything built in sprint 3 runs against
a real remote instead of a simulated one.

**Why this priority**: This is the reason sprint 4 exists. Every other user
story in this spec depends on the remote existing and being mountable at all;
until this works, nothing else in the domain can be observed running for real.

**Independent Test**: Add one entry to the shell's dev registry pointing at the
running dashboard, start both processes, navigate to the dashboard's route, and
confirm its UI renders inside the shell frame with no shell source file
changed.

**Acceptance Scenarios**:

1. **Given** the dashboard is running and registered with a name, entry,
   routePath, and label, **When** the shell starts, **Then** it resolves and
   mounts the dashboard at the registered route.
2. **Given** the dashboard is composed inside the shell, **When** it renders,
   **Then** it uses the shared design system for any element an equivalent
   component already exists for, rather than a bespoke one.
3. **Given** the dashboard is composed inside the shell, **When** a signed-in
   session exists, **Then** the dashboard can read the current session through
   the shared auth contract rather than establishing its own.
4. **Given** the dashboard must be registered, **When** a team does so,
   **Then** it requires editing only registry files, exactly as the contract
   from sprint 3 promises.

---

### User Story 2 - KPI cards prove a remote can fetch its own data (Priority: P1)

A person viewing the dashboard sees KPI cards — active users, usage trend —
populated from an asynchronous data source that the dashboard fetches on its
own, with no involvement from the shell or any other remote.

**Why this priority**: This is the specific technical claim ADR-0010 and the
blueprint assign to this domain: proving async data fetching works correctly
inside an isolated remote. Equal priority to US1 because a remote that only
renders static markup would not prove anything sprint 3 didn't already cover.

**Independent Test**: Run the dashboard standalone, with no shell present, and
confirm the KPI cards move from a loading state to a populated state without
any host coordinating the fetch.

**Acceptance Scenarios**:

1. **Given** the dashboard has just mounted, **When** KPI data has not yet
   arrived, **Then** each card shows a distinct loading state rather than a
   blank or zeroed value.
2. **Given** the asynchronous fetch succeeds, **When** data arrives, **Then**
   each card displays its value and the loading state is gone.
3. **Given** the asynchronous fetch fails, **When** the failure occurs,
   **Then** the affected card shows a distinct error state rather than a stale
   or blank value.
4. **Given** the dashboard is composed inside the shell, **When** its own data
   fetch fails, **Then** the failure is contained to the dashboard's region and
   the rest of the shell keeps working — the same containment behavior sprint
   3 built for a broken remote, now exercised against a real one.

---

### User Story 3 - A third-party chart runs isolated inside federation (Priority: P2)

A person viewing the dashboard sees a chart of activity over time, and its
presence changes nothing about how the shell or any other region of the
application looks or behaves.

**Why this priority**: The blueprint calls this out as a distinct proof point
from the KPI cards: that a richer, third-party visualization can be embedded
inside a remote without its styles or scripts leaking across the federation
boundary. P2 because it is a specific technical risk to retire, not the
sprint's headline claim.

**Independent Test**: Compose the shell with the dashboard mounted, inspect the
shell's chrome and navigation before and after the chart renders, and confirm
neither changed. Navigate away from and back to the dashboard and confirm no
resources from the previous mount persisted.

**Acceptance Scenarios**:

1. **Given** the dashboard is composed inside the shell, **When** the chart
   renders, **Then** the shell's chrome, navigation, and any other region are
   visually and behaviorally unaffected.
2. **Given** the chart has rendered with a real (fixture) time-series data set,
   **When** it is inspected, **Then** it correctly reflects that data rather
   than placeholder markup.
3. **Given** the person navigates away from the dashboard and back, **When**
   the chart mounts again, **Then** no listeners or rendering resources from
   the previous mount remain active.

---

### User Story 4 - A recent activity feed completes the domain (Priority: P3)

A person viewing the dashboard sees a list of recent activity, most recent
first.

**Why this priority**: Lowest priority of the three domain surfaces named in
ADR-0010 because it proves the least new ground — it is a list rendered with
the shared design system's existing `Table` component, not a new technical
risk like async fetching or third-party chart isolation.

**Independent Test**: Load the dashboard with fixture activity data and confirm
the feed is ordered most-recent-first; load it with no activity and confirm an
explicit empty state appears.

**Acceptance Scenarios**:

1. **Given** activity data exists, **When** the feed renders, **Then** items
   appear in reverse-chronological order.
2. **Given** no activity data exists, **When** the feed renders, **Then** an
   explicit empty state appears rather than a blank region.

---

### User Story 5 - The boundary and singleton gates hold against a real second app (Priority: P2)

A contributor introduces a cross-app relative import touching `apps/dashboard`,
or a singleton version mismatch in its `package.json`. Both guard rails catch
it before merge.

**Why this priority**: Principles I, II, and III of the constitution are
non-negotiable, and this is the first time either gate runs against two real
applications instead of one. It is also the first re-test opportunity for
issue #6, which found `dependency-cruiser` unable to resolve deep relative
imports in a throwaway single-app checkout — unexplained after exhaustive
investigation in sprint 3. P2 because it protects the architecture rather than
delivering domain-visible behavior.

**Independent Test**: Introduce a deliberate relative import from
`apps/dashboard` reaching into `apps/shell` (or vice versa), confirm
`pnpm check:boundaries` fails and names the violation, then revert and confirm
it passes. Separately, introduce a deliberate version mismatch for one
singleton in `apps/dashboard/package.json`, confirm `pnpm check:shared-deps`
fails and names the drift, then revert.

**Acceptance Scenarios**:

1. **Given** `apps/dashboard` exists with `src/exposed/` and `src/internal/`,
   **When** the boundary gate runs, **Then** it inspects the dashboard's
   source rather than skipping it.
2. **Given** a deliberate cross-app relative import touching
   `apps/dashboard`, **When** the gate runs, **Then** it fails and names the
   violated rule.
3. **Given** a deliberate singleton version mismatch in
   `apps/dashboard/package.json`, **When** the drift check runs, **Then** it
   fails and names the package and the mismatched versions.
4. **Given** both deliberate violations are reverted, **When** the gates run
   again, **Then** both pass.

---

### Edge Cases

- What happens when the dashboard is run standalone, with no shell present?
  It MUST still build and render fully — a remote is a portable application in
  its own right, not something that only works composed.
- What happens when the shell composes the dashboard but the dashboard's own
  data fetch is slow or never resolves? The loading state MUST persist rather
  than the region appearing broken, and this MUST NOT block the rest of the
  shell from rendering or navigating.
- What happens when the activity chart's data set is empty or has only one
  point? It MUST render a defined empty or minimal state, not an error.
- What happens when the recent activity feed has more items than fit in its
  region? A bounded, most-recent subset MUST be shown rather than an
  unbounded, unscrollable list.
- What happens when a cross-app import or singleton mismatch is introduced?
  Covered by User Story 5 — both MUST be caught before merge, not discovered
  at runtime.

## Requirements *(mandatory)*

### Functional Requirements

**The dashboard remote**

- **FR-001**: The repository MUST contain `apps/dashboard`, building and
  running as a standalone application with no shell present.
- **FR-002**: The dashboard MUST render using the shared design system for any
  element an equivalent component already exists for.
- **FR-003**: The dashboard MUST split its own source into `src/exposed/` and
  `src/internal/`, exposing only its root component — exactly as
  `apps/shell` does.
- **FR-004**: The dashboard MUST satisfy the registry contract from sprint 3
  (`name`, `entry`, `routePath`, `label`) so a team can register it by editing
  only registry files.
- **FR-005**: The dashboard MUST read the current session through the shared
  auth contract rather than implementing its own.

**KPI cards**

- **FR-006**: The dashboard MUST display at least two KPI cards: active users
  and usage trend.
- **FR-007**: KPI data MUST be fetched asynchronously by the dashboard itself,
  independent of the shell or any other remote.
- **FR-008**: Each KPI card MUST show a distinct loading state before data
  arrives and a distinct error state if the fetch fails.

**Activity chart**

- **FR-009**: The dashboard MUST render a chart visualizing activity over
  time.
- **FR-010**: The chart MUST render correctly when composed inside the shell,
  with no style or script effect on the shell's chrome, navigation, or any
  other region.
- **FR-011**: Resources the chart allocates MUST be released when the
  dashboard unmounts, so repeated navigation does not accumulate listeners or
  rendering artifacts.

**Recent activity feed**

- **FR-012**: The dashboard MUST render a feed of recent activity in
  reverse-chronological order.
- **FR-013**: The feed MUST show a distinct empty state when there is no
  activity, and MUST bound the number of items shown rather than rendering an
  unbounded list.

**Boundary and singleton compliance**

- **FR-014**: `pnpm check:boundaries` MUST inspect `apps/dashboard` and MUST
  be demonstrated failing on a deliberate cross-app relative import touching
  it, then passing after revert.
- **FR-015**: `apps/dashboard/package.json` MUST declare version ranges for
  `react`, `react-dom`, `@enterprise-mfe/auth`, and `react-router` identical to
  every other manifest listed in `scripts/check-shared-deps.ts`.
- **FR-016**: `pnpm check:shared-deps` MUST be demonstrated failing on a
  deliberate singleton version mismatch in `apps/dashboard/package.json`, then
  passing after revert.

**Shell composition**

- **FR-017**: Registering the dashboard in the shell's development registry
  MUST require editing only registry files — no file under `apps/shell/src`
  changes.
- **FR-018**: When the shell composes the dashboard and the dashboard's data
  fetch fails, the failure MUST be contained to the dashboard's region using
  the error boundary built in sprint 3, and the rest of the shell MUST keep
  working.

### Key Entities

- **KPI metric**: A labeled numeric value with a trend indicator (active
  users, usage trend), sourced asynchronously by the dashboard.
- **Activity data point**: A timestamped value plotted on the activity chart.
- **Activity feed item**: A single recent event with a timestamp and
  description, ordered reverse-chronologically in the feed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team can register `apps/dashboard` in the shell's development
  registry and see it composed and navigable with both processes running,
  touching only registry files.
- **SC-002**: KPI cards reach either a populated or an error state after their
  data fetch resolves, in 100% of runs — neither card is left in a permanent
  loading state when the underlying fetch has settled.
- **SC-003**: The shell's chrome, navigation, and other regions are visually
  and behaviorally unaffected by the dashboard's chart, verified by
  before/after inspection, 1 of 1 documented result.
- **SC-004**: The recent activity feed shows either items or an explicit empty
  state in 100% of runs — never a blank region.
- **SC-005**: `pnpm check:boundaries` is demonstrated failing on a deliberate
  cross-app import touching `apps/dashboard` and passing after revert — the
  first real second-app data point for issue #6.
- **SC-006**: `pnpm check:shared-deps` is demonstrated failing on a deliberate
  singleton mismatch in `apps/dashboard` and passing after revert.
- **SC-007**: The full quality gate set (`lint`, `typecheck`, `build`, `test`,
  `check:boundaries`, `check:shared-deps`) passes on a clean checkout, with
  zero bypasses recorded in the pull request.
- **SC-008**: Every loading, error, and empty state named in this spec has an
  automated test; none is verified only by hand.

## Assumptions

- **Live cross-remote KPI updates are out of scope for this sprint.** ADR-0010
  describes Admin's role change updating Dashboard's "active users" KPI live
  through `packages/event-bus`. Neither `apps/admin` nor `packages/event-bus`
  exist yet — the singleton check explicitly defers `@enterprise-mfe/event-bus`
  to the sprint that introduces it, and the blueprint's own sprint plan places
  that wiring in sprint 5, alongside admin. This sprint proves the dashboard's
  domain in isolation; the live cross-remote proof point is a dependency of
  sprint 5, not this one.
- **KPI, chart, and feed data are self-contained fixtures**, fetched
  asynchronously from within the dashboard itself rather than a real backend.
  The project has no backend by design (constitution: Backend-For-Frontend is
  explicitly out of scope), so "asynchronous fetching" is proved against a
  fixture data source the dashboard owns, not an external service.
- **The dashboard sits behind the same session gate as the rest of the
  frame.** Analytics/overview data is treated as requiring a signed-in session,
  consistent with the shell's existing protected-area pattern from sprint 3.
- **Chart library selection is an implementation decision**, made during
  planning, not specified here — this spec requires only that time-series data
  be visualized and that isolation (FR-010, FR-011) hold, regardless of which
  library is chosen.
- **Only the development registry is touched this sprint.** Staging and
  production registry entries follow the same contract but registering the
  dashboard there is not this sprint's focus, mirroring how sprint 3 shipped
  all three environments with an empty `remotes` array.
- **Route ownership stays with the shell**, per the decision already recorded
  in `specs/002-shell-host/spec.md` — the dashboard does not register its own
  route.

### Dependencies

- `specs/002-shell-host` — the registry contract, `federation-utils`' remote
  loading and error boundary, and the origin allow-list are exercised against
  a real remote for the first time in this sprint.
- The design system (`packages/ui`) and auth contract (`packages/auth`) from
  sprint 2.
- Issue #6 (dependency-cruiser's unexplained behavior against deep relative
  imports in a throwaway checkout) gets its first real second-app retest here;
  User Story 5 and SC-005 are that retest.
- `apps/admin` and `packages/event-bus` are not dependencies of this work and
  MUST NOT become one — the live KPI update they enable is explicitly deferred
  (see Assumptions).

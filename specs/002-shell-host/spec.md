# Feature Specification: Shell Host

**Feature Branch**: `002-shell-host`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Sprint 3 — the shell: the React host that composes remotes. `apps/shell` with Module Federation configured as host, a manifest-driven per-environment remote registry, `packages/federation-utils` with a `useRemote()` hook and error boundary, and a runtime origin allow-list. Also closes the two open guard-rail issues (#2, #4)."

## User Scenarios & Testing *(mandatory)*

The people served here are the developer evaluating the boilerplate, the platform
team that will operate the shell across environments, and the team that will
build the first remote in the next sprint against whatever contract this
establishes.

### User Story 1 - Run the host and see the application frame (Priority: P1)

A developer clones the repository, starts the project, and gets a running
application in the browser: navigation, layout, and a signed-in session, built
from the packages delivered last sprint. No remote exists yet, and that is not an
error — the host stands on its own.

**Why this priority**: Until this exists there is nothing to look at. It is also
the first time the design system and the auth contract are compiled by a real
bundler rather than exercised in a test environment, which is what turns "the
packages pass their tests" into "the packages work".

**Independent Test**: Start the host with no remote configured and no remote
process running; confirm the frame renders and the session works.

**Acceptance Scenarios**:

1. **Given** a fresh clone with dependencies installed, **When** the developer
   starts the host, **Then** a styled application frame renders in the browser
   with navigation and layout from the shared design system.
2. **Given** no remote is registered and none is running, **When** the host
   loads, **Then** it renders normally and reports no error — an empty registry
   is a valid state.
3. **Given** the host is running, **When** the developer signs in through the
   session contract, **Then** protected areas of the frame become reachable and
   the current person's name is visible.
4. **Given** the design system's styling layer, **When** the host builds,
   **Then** components render with their intended appearance — the styling
   pipeline is proved by a real build, not assumed.

---

### User Story 2 - Point the host at a different environment without touching its code (Priority: P1)

An operator moves the same host build between development, staging, and
production. Each environment loads its remotes from different origins. Doing that
must mean selecting a different registry file — never editing host source, never
a code change, never a rebuild triggered by the host itself.

**Why this priority**: Equal to US1 because it is the architectural claim this
sprint exists to prove. A host that hardcodes remote locations forces a code
change per environment and per new remote, which is precisely the coupling the
whole approach is meant to remove.

**Independent Test**: Change the selected environment, restart, and observe the
host resolving a different set of remote locations — with zero edits to host
source between the two runs.

**Acceptance Scenarios**:

1. **Given** three environment registries exist, **When** the environment
   selector changes, **Then** the host resolves remote locations from the
   matching registry with no source edit.
2. **Given** a new remote must be added, **When** it is registered, **Then** only
   a registry file changes — no file under the host's own source is touched.
3. **Given** a registry names a remote the host has no route for, **When** the
   host starts, **Then** the mismatch is reported clearly rather than failing
   silently at navigation time.
4. **Given** a registry file is malformed or missing for the selected
   environment, **When** the host starts, **Then** it fails with a message naming
   the file and the environment, not a generic parse error.

---

### User Story 3 - A broken remote does not take down the host (Priority: P2)

A remote is unreachable, slow, or serving something invalid. The person using the
application sees a contained failure in that one region — the rest of the
application, including navigation and session, keeps working.

**Why this priority**: This is the failure mode that makes or breaks
micro-frontends in production, and the reason a shared loading utility exists at
all rather than each app hand-rolling it. It is P2 only because no remote exists
until the next sprint, so it must be proved against simulated failures.

**Independent Test**: Point the host at a remote location that does not respond,
one that responds with garbage, and one that never finishes; confirm each is
contained and the rest of the application stays usable.

**Acceptance Scenarios**:

1. **Given** a registered remote whose origin does not respond, **When** the
   region loads, **Then** an error state appears in that region only and
   navigation elsewhere still works.
2. **Given** a remote that responds with something unusable, **When** the region
   loads, **Then** the failure is contained the same way and the reason is
   surfaced to the developer.
3. **Given** a remote that has not finished loading, **When** the region is
   displayed, **Then** a loading state is shown rather than a blank area.
4. **Given** a remote failed to load, **When** the person retries, **Then** the
   attempt is made again without reloading the whole application.

---

### User Story 4 - Refuse to load code from an origin nobody approved (Priority: P2)

The host loads and executes code from other origins at runtime. Only origins that
were explicitly permitted may be loaded, and outside local development, only over
a secure transport.

**Why this priority**: A host that executes remote code from an arbitrary origin
is the security risk unique to this architecture — a compromised or mistyped
registry entry becomes code execution inside the host's origin. It is P2 because
it cannot be exercised end to end until a remote exists, not because it is
optional.

**Independent Test**: Register a remote on an origin that is not permitted and
confirm it is refused; register one on a permitted origin and confirm it is
allowed. Repeat with an insecure transport.

**Acceptance Scenarios**:

1. **Given** a registry entry pointing at an origin that is not on the
   allow-list, **When** the host attempts to load it, **Then** the load is
   refused and the refusal names the origin and the allow-list.
2. **Given** a registry entry using an insecure transport outside local
   development, **When** the host attempts to load it, **Then** the load is
   refused.
3. **Given** local development, **When** a remote is served from the local
   machine over an insecure transport, **Then** it is permitted — the rule must
   not make local work impossible.
4. **Given** a refused remote, **When** the rest of the application renders,
   **Then** it is unaffected — a refusal is contained exactly like a failure.

---

### User Story 5 - The boundary gate can actually fail (Priority: P3)

A contributor introduces an import that crosses from one app into another. The
guard rail catches it before merge.

**Why this priority**: The rule has existed since the first commit and has never
been able to fire, because it only matches paths under `apps/` and no app
existed. This sprint creates the first one. Lower priority only because it
protects future work rather than delivering visible behavior.

**Independent Test**: Introduce a cross-app import deliberately, confirm the gate
fails and names the rule, then revert and confirm it passes.

**Acceptance Scenarios**:

1. **Given** the host exists under `apps/`, **When** the boundary gate runs,
   **Then** it inspects the host's source rather than skipping it.
2. **Given** a deliberate cross-app relative import, **When** the gate runs,
   **Then** it fails and names the violated rule.
3. **Given** an import reaching into another app's private area, **When** the
   gate runs, **Then** it fails for that reason specifically.

---

### Edge Cases

- What happens when two registry entries claim the same remote name? The
  conflict MUST be reported at startup, not resolved silently by last-wins.
- What happens when the same remote is registered at different origins in
  different environments? That is the normal case and MUST work — it is the
  reason the registry is per-environment.
- What happens when a remote loads successfully but exposes nothing the host
  expects? It MUST be treated as a failed load and contained, not rendered as an
  empty region.
- What happens when the environment selector names an environment that has no
  registry? The host MUST refuse to start with a message naming both, rather
  than falling back to a default environment silently.
- What happens when a remote's origin is permitted but the specific path is
  wrong? The load fails; the containment behavior is the same as any other
  failure.
- What happens if the styling layer of the design system cannot be processed by
  the bundler? That is a build failure, and it MUST surface at build time rather
  than as an unstyled application in a browser.

## Requirements *(mandatory)*

### Functional Requirements

**The host application**

- **FR-001**: The repository MUST contain a host application that builds and runs
  as a standalone application with no remote registered.
- **FR-002**: The host MUST render its frame — layout and navigation — using the
  shared design system, not components of its own.
- **FR-003**: The host MUST establish the session using the shared auth contract,
  and gate at least one area of the frame behind it.
- **FR-004**: The host MUST split its own source into the public and private
  areas the project's boundary convention requires, exactly as a remote does.
- **FR-005**: Starting the host MUST require no configuration file to be edited
  and no environment variable to be set.

**The remote registry**

- **FR-006**: Remote locations MUST be declared in per-environment registry
  files, one per environment, and never in host source.
- **FR-007**: The host MUST select the registry by environment at runtime or
  build time, without any host source file changing between environments.
- **FR-008**: Registering a new remote MUST require changing only a registry
  file.
- **FR-009**: A missing, malformed, or duplicate-bearing registry MUST fail
  loudly with a message naming the file and the environment.
- **FR-010**: The registry format MUST be documented so that a team adding a
  remote can do so without reading host source.

**Remote loading**

- **FR-011**: A shared utility MUST provide remote loading, so neither the host
  nor any future remote hand-rolls the mechanics.
- **FR-012**: A remote that fails to load MUST NOT prevent the rest of the
  application from rendering or navigating.
- **FR-013**: Loading MUST show a distinct in-progress state, and failure MUST
  show a distinct error state — neither may be a blank region.
- **FR-014**: A failed load MUST be retryable without a full application reload.
- **FR-015**: The failure reason MUST be surfaced to a developer, not swallowed.

**Origin control**

- **FR-016**: The host MUST refuse to load a remote from an origin that is not
  explicitly permitted.
- **FR-017**: The host MUST refuse an insecure transport outside local
  development, and MUST permit it for local development.
- **FR-018**: A refusal MUST be contained exactly like a load failure, and MUST
  state which origin was refused and why.
- **FR-019**: The permitted-origin list MUST live alongside the registry, so
  reviewing what the host may execute is one place, not a search.

**Guard rails (closing open issues)**

- **FR-020**: The boundary gate MUST inspect application source, and MUST be
  demonstrated failing on a deliberate cross-app import before this work is
  considered done.
- **FR-021**: The design system's styling layer MUST be processed by the real
  build, proving the styling approach rather than assuming it.
- **FR-022**: All existing quality gates MUST continue to pass, with the drift
  check now covering the host as well.

### Key Entities

- **Remote registration**: A named remote as the host knows it — its name, where
  its entry point lives for the current environment, and what the host mounts it
  under. The unit a team adds when shipping a new remote.
- **Environment**: The selector that decides which set of registrations applies.
  Development, staging, and production, with the same host build for each.
- **Permitted origin**: An origin the host is allowed to execute code from. The
  security boundary of the whole composition.
- **Remote load state**: Where a region is in its lifecycle — in progress,
  loaded, failed, or refused. What determines whether a region shows content, a
  loading state, or an error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who has never seen the repository can clone it, install
  dependencies, run one command, and see a styled, navigable application in the
  browser in under 5 minutes, with no file edited and no service configured.
- **SC-002**: Moving the host between all three environments requires editing
  zero host source files — verified by inspecting the change set for each move.
- **SC-003**: Adding a remote registration touches exactly one file.
- **SC-004**: For each of the four simulated remote failure modes — unreachable,
  invalid, never-finishing, and refused origin — the rest of the application
  remains navigable, 4 of 4.
- **SC-005**: Every disallowed origin and insecure-transport case is refused, and
  every permitted case is allowed, with no case decided silently.
- **SC-006**: The boundary gate is demonstrated failing on a deliberate cross-app
  import and passing after revert — the first time in the project's history it
  has been able to fail at all.
- **SC-007**: The full quality gate set passes on a clean checkout, with zero
  bypasses recorded in the pull request.
- **SC-008**: Every failure and refusal path has an automated test; none is
  verified only by hand.

## Assumptions

- **Environment selection**: the environment is chosen by a single named input at
  build or start time, defaulting to development when unset, so `FR-005` (no
  configuration required to start) and `FR-007` (no source change per
  environment) are both satisfiable.
- **Local development origins**: the local machine is treated as a permitted
  origin over an insecure transport by default. Without this, nothing runs
  locally; with it, the rule stays meaningful everywhere else.
- **No remote to test against**: every remote-loading and origin-control
  requirement is verified against simulated remotes in this sprint. The first
  real end-to-end composition happens in the next one, and this spec does not
  claim to prove it.
- **Route ownership**: the host owns the mapping from a route to a remote.
  A remote does not register its own routes into the host, because that would
  require the host to execute remote code before deciding whether it is allowed
  to — inverting the security boundary FR-016 establishes.
- **The frame is deliberately plain**: navigation, layout, and a session
  indicator. It is a host, not a product; anything richer belongs in a remote.
- **Styling**: the design system's current approach is carried forward. If the
  real build disproves it, the fallback is recorded as a new decision record
  rather than an edit to an existing one, per the project's amendment rule.

### Dependencies

- The five packages delivered in the previous sprint, in particular the design
  system, the auth contract, and the shared type contracts.
- The existing quality gates. This work extends the drift check to cover the host
  and restores the boundary gate's ability to inspect application source.
- Open issues #2 (boundary gate cannot currently fail) and #4 (styling approach
  unproven by a real build) are closed by FR-020 and FR-021 respectively.
- No remote, no identity provider, and no backend are required, and none may
  become a dependency of this work.

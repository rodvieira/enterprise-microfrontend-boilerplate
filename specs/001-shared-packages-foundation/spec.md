# Feature Specification: Shared Packages Foundation

**Feature Branch**: `001-shared-packages-foundation`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Sprint 2 — shared packages, no federation yet. Build the five foundational packages under `packages/`: config-typescript, config-biome, shared-types, ui, and auth (contract + in-memory stub). Pure React/TypeScript, no bundler or federation dependency at this stage."

## User Scenarios & Testing *(mandatory)*

The people served by this feature are developers: the person evaluating this
boilerplate minutes after cloning it, and the team that will later build the
shell and the two remotes on top of these packages.

### User Story 1 - See a real interface without building one (Priority: P1)

A developer clones the repository and wants to know whether the design system is
real or a directory of empty placeholders. They render the component set and see
working, styled elements — buttons that respond, a modal that opens and closes, a
table with rows in it, a toast that appears and dismisses.

**Why this priority**: This is the claim the project makes that is easiest to
disprove and most often false in competing starters ("ships a design system" that
turns out to be three unstyled divs). Nothing else in the sprint matters if this
one is hollow. It also delivers standalone value: the component set is useful
even if no other package existed.

**Independent Test**: Render every exported component in isolation and interact
with it. Fully testable with no shell, no remote, and no federation present.

**Acceptance Scenarios**:

1. **Given** a fresh clone with dependencies installed, **When** the developer
   renders each exported component, **Then** each one appears styled and
   responds to interaction without any additional configuration.
2. **Given** the Modal component is open, **When** the developer presses Escape
   or activates the close control, **Then** the modal closes and focus returns
   to the element that opened it.
3. **Given** the Table component receives an empty collection, **When** it
   renders, **Then** it shows a deliberate empty state rather than an empty frame
   or an error.
4. **Given** a Toast is triggered while another is visible, **When** both are
   active, **Then** both remain readable and each dismisses independently.

---

### User Story 2 - Gate a screen behind authentication with zero setup (Priority: P2)

A developer wraps a screen so that only signed-in people reach it, and confirms
the signed-out and signed-in paths both behave — without registering an
application with an identity provider, running a backend, or setting an
environment variable.

**Why this priority**: Auth is the dependency every remote will take, and the
decision that it ships as a contract with a stub (never a real login flow) is
already settled. Getting the contract shape right now is what lets the shell and
both remotes be built against it later without rework. It is P2 rather than P1
because it demonstrates less on its own than the component set does.

**Independent Test**: Wrap any component in the protection primitive, toggle
between the signed-out and signed-in states through the contract, and observe
access change. Requires no external service.

**Acceptance Scenarios**:

1. **Given** no configuration of any kind, **When** the developer starts the
   package, **Then** the session contract reports a signed-out state and exposes
   a way to sign in as a stub person.
2. **Given** a signed-out state, **When** protected content is requested,
   **Then** the protected content is not rendered and a fallback is shown in its
   place.
3. **Given** a signed-in state, **When** protected content is requested,
   **Then** the protected content renders and the current person's identity and
   permissions are readable through the contract.
4. **Given** two separate parts of an application both read the session,
   **When** one of them signs out, **Then** the other observes the change
   immediately — both read one shared session, never two copies.

---

### User Story 3 - Depend on one definition of a shared concept (Priority: P3)

A developer building against these packages refers to a person, a permission, or
the props of a component that will later cross an app boundary, and finds exactly
one authoritative definition to import rather than redeclaring it locally.

**Why this priority**: Duplicated contract definitions are how the shell and a
remote drift apart silently. The cost of skipping this shows up later, when two
teams are already building against different shapes — but the packages that
depend on these definitions are being written in this same sprint.

**Independent Test**: Search the workspace for competing definitions of the same
concept; verify each shared concept resolves to a single source and that the
other packages consume it rather than restating it.

**Acceptance Scenarios**:

1. **Given** the contracts package, **When** a developer looks for the person and
   permission definitions, **Then** each exists exactly once and is exported.
2. **Given** another package needs one of those concepts, **When** it is
   written, **Then** it imports the definition instead of declaring its own.
3. **Given** a definition changes shape, **When** the workspace is type-checked,
   **Then** every consumer that no longer matches fails the check.

---

### User Story 4 - Inherit the project's standards instead of copying them (Priority: P4)

A developer adding a new package gets the project's type-checking strictness and
lint/format rules by extending shared configuration, not by pasting settings that
will quietly diverge over time.

**Why this priority**: Lowest immediate visibility, highest compounding cost. Two
packages exist today and roughly a dozen units will exist by the end of the
roadmap; the drift starts the moment the second copy is made. It is a
prerequisite for the other three stories being consistent with each other.

**Independent Test**: Create a throwaway package that extends the shared
configuration and confirm it inherits strictness and formatting with no local
overrides.

**Acceptance Scenarios**:

1. **Given** the shared configuration packages, **When** a new package extends
   them, **Then** it type-checks under the project's strict settings and formats
   identically to every other package with no local rule copies.
2. **Given** a package that violates a shared rule, **When** the quality gates
   run, **Then** the violation is reported and the gate fails.
3. **Given** the shared lint rules change, **When** the gates run again,
   **Then** every package reflects the change without individual edits.

---

### Edge Cases

- What happens when a consumer renders protected content before the session has
  finished initializing? The contract MUST expose a distinguishable "not yet
  known" state so consumers never treat "still loading" as "signed out".
- What happens when two copies of the session provider are mounted by mistake?
  This MUST be detectable — it is the exact failure mode the singleton drift
  guard exists to prevent, and it MUST NOT fail silently.
- What happens when a component receives no children, an empty collection, or an
  unexpectedly long text value? Each MUST degrade visibly and predictably rather
  than collapsing the layout or throwing.
- What happens when a consumer imports a component but never applies the design
  system's styling layer? The failure MUST be obvious immediately, not a subtly
  unstyled screen shipped to production.
- What happens when someone adds a sixth package that holds shared state and
  forgets the drift check? The gate MUST be the thing that catches it, not code
  review.

## Requirements *(mandatory)*

### Functional Requirements

**Design system**

- **FR-001**: The design system MUST provide Button, Input, Modal, Table, Toast,
  Layout, and Nav, each rendering visibly styled output on first use.
- **FR-002**: Every interactive component MUST be operable by keyboard alone,
  including opening and dismissing overlays and moving through table rows and
  navigation.
- **FR-003**: Overlay components (Modal, Toast) MUST manage focus so that focus
  is trapped while open and restored to its origin when dismissed.
- **FR-004**: Every component MUST accept and forward a caller-supplied style
  hook so consumers can adapt appearance without forking the component.
- **FR-005**: Components MUST NOT reach into any application, remote, or the
  session contract — the design system stays free of domain knowledge.

**Session contract**

- **FR-006**: The auth package MUST expose a session hook reporting the current
  person, whether they are authenticated, and operations to sign in and sign out.
- **FR-007**: The auth package MUST expose a provider that establishes the
  session and a protection primitive that withholds its children until the
  session is authenticated.
- **FR-008**: The default implementation MUST be an in-memory stub that works
  with zero configuration and MUST NOT contact any external service.
- **FR-009**: The session state MUST be shared, not copied — all consumers within
  one application MUST observe the same state and the same updates.
- **FR-010**: The contract MUST be swappable for a real implementation without
  changing any consumer's code.
- **FR-011**: The package MUST make its stub status unmistakable to anyone
  reading it, so no adopter can mistake it for production-ready authentication.
- **FR-012**: The auth package MUST be registered in the singleton drift check in
  this same change, so a future version mismatch fails a gate.

**Shared contracts**

- **FR-013**: The contracts package MUST define the person and permission
  concepts and the prop shapes of anything intended to cross an app boundary.
- **FR-014**: The contracts package MUST contain no runtime behavior — it
  disappears entirely from what ships to a browser.
- **FR-015**: Other packages MUST consume these definitions rather than
  redeclaring them.

**Shared configuration**

- **FR-016**: A shared type-checking configuration MUST exist in strict mode and
  MUST be extended by every package and, later, every app.
- **FR-017**: A shared lint and format configuration MUST exist and MUST match
  the rules already enforced at the repository root, so adopting it changes no
  existing file.
- **FR-018**: Extending the shared configurations MUST require no local rule
  copies.

**Cross-cutting**

- **FR-019**: Every package MUST carry a README stating in one paragraph what it
  solves, and MUST be recorded in the project's documentation, not only in code.
- **FR-020**: Every package MUST declare its dependencies explicitly; none may
  rely on a dependency it does not declare.
- **FR-021**: Exported components and hooks MUST have automated tests, runnable
  through a single repository-wide command.
- **FR-022**: All packages MUST pass the project's existing quality gates —
  boundary check, singleton drift check, lint, type-check, and commit-message
  linting.
- **FR-023**: No package in this sprint may depend on a bundler, on federation
  configuration, or on any app.

### Key Entities

- **Person (User)**: Someone with an identity in the system — a stable
  identifier, a display name, an email, and the permissions they hold. Referenced
  by the session contract and, later, by the admin remote.
- **Permission**: A named capability that can be granted to a person and checked
  before an action is allowed. The unit the admin remote will change and the
  dashboard will react to.
- **Session**: The current authentication state — who is signed in, whether the
  state is known yet, and the operations that change it. Exactly one exists per
  running application.
- **Component contract**: The prop shape of anything meant to be consumed across
  an app boundary, defined once so both sides of that boundary agree.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who has never seen the repository can clone it, install
  dependencies, and see the full component set rendered and interactive in under
  5 minutes, with no configuration file edited and no account created.
- **SC-002**: All seven named components render, respond to interaction, and are
  fully operable by keyboard — 7 of 7, verified by automated test.
- **SC-003**: Gating content behind authentication requires wrapping it in a
  single primitive and zero lines of configuration; unauthenticated access
  reveals no protected content in any tested path.
- **SC-004**: Each shared concept has exactly one definition in the workspace —
  zero duplicate declarations of the person or permission concepts.
- **SC-005**: Every exported component and hook has at least one automated test,
  and the entire suite runs from one command in under 60 seconds.
- **SC-006**: Adding a new package requires extending shared configuration and
  copying zero rules; verified by creating one and checking it inherits
  strictness and formatting.
- **SC-007**: All five packages pass every quality gate on a clean checkout, with
  zero gate bypasses recorded in the pull request.
- **SC-008**: A reader of the auth package identifies it as a stub within the
  first paragraph of its README — no adopter reaches integration believing it is
  production-ready.

## Assumptions

Choices made where the description did not specify. Each is cheap to reverse now
and expensive later, so they are recorded rather than left implicit.

- **Package naming**: packages use a single consistent scope,
  `@enterprise-mfe/<name>`, matching the examples already committed in
  `.claude/agents/shared-deps-guard.md` and `.claude/commands/add-shared-package.md`.
  No package existed to check against, so this establishes the convention.
- **Distribution**: packages are consumed as workspace source during the monorepo
  phase. The published-artifact path required by standalone mode (ADR-0007) is a
  later sprint's work and is not built here.
- **Styling model**: the design system ships its styling as source that the
  consuming application processes, plus shared design tokens — rather than a
  prebuilt stylesheet — so consumers can extend the visual language. This is why
  FR-004 requires a style hook, and why the edge case about a consumer skipping
  the styling layer must fail loudly.
- **Scope of "person"**: the identity model covers what the admin and dashboard
  remotes will need (identity, display name, email, permissions) and nothing
  more; profile management, groups, and organizations are not modeled.
- **Test scope**: automated tests cover behavior and keyboard operability. Visual
  regression testing is not part of this sprint.
- **Stack**: React, TypeScript in strict mode, and Tailwind CSS are fixed by the
  constitution's Technology Constraints and are not re-decided here. The unit
  test runner is not yet installed at the repository root, so wiring it is inside
  this scope.

### Dependencies

- The repository's existing quality gates and their configuration
  (`pnpm check:boundaries`, `pnpm check:shared-deps`, lint, type-check,
  commitlint) — this feature must satisfy them and extends the drift check.
- `scripts/check-shared-deps.ts` does not yet exist; FR-012 requires it to exist
  and to cover the auth package by the end of this feature.
- No app, remote, shell, or federation configuration is required, and none may
  become a dependency of this work.

# Feature Specification: Admin Remote

**Feature Branch**: `004-admin-remote`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Sprint 5: apps/admin — the second micro-frontend remote, per the build order in ADR-0008 (dashboard remote → admin remote → guard rails → generator) and the domain assigned to it in ADR-0010 and docs/blueprint.html §6/§15: users & permissions (a user table with pagination/sorting, an invite/edit modal, a role-change action). This sprint also ships packages/event-bus — typed pub/sub for cross-remote communication without direct coupling — because blueprint.html's sprint plan (§15) and ADR-0010's own 'proof point' pair admin and event-bus together: when Admin changes a user's role, Dashboard's 'active users' KPI must update live, with no reload and no direct coupling between the two remotes, travelling only through packages/event-bus. That live update is this sprint's headline proof, not a follow-on. Ground the domain in packages/shared-types/src/user.ts, which already defines Role, Permission, and the role-to-permission table — built in sprint 2 anticipating exactly this. Follow the same spec pattern as specs/003-dashboard-remote/spec.md: apps/admin gets the same exposed/internal split and registry-contract.md registration apps/dashboard already proved, and must match the singleton set in scripts/check-shared-deps.ts plus the new packages/event-bus singleton this sprint adds. The user table should reuse packages/ui's Table component; the invite/edit modal should reuse packages/ui's Modal and be reachable only with the 'users:write' permission."

## User Scenarios & Testing *(mandatory)*

The people served here are the team that owns the admin domain, the platform
team registering a second remote into the shell, and the dashboard team
(sprint 4) whose KPI card this sprint finally wires to something real.

### User Story 1 - The shell composes a second real remote (Priority: P1)

A developer registers `apps/admin` in the shell's development registry,
starts all three processes (shell, dashboard, admin), and sees the admin
remote render at its own route — proof that the composition mechanism built
for the *first* remote generalizes to a second one rather than being a
one-off.

**Why this priority**: Everything else in this spec depends on the remote
existing and being mountable. It is also the first real test of whether
sprint 4's shell changes (the route-patching mechanism, the registry
contract) hold up against more than one remote at a time.

**Independent Test**: Add one entry to the shell's dev registry pointing at
the running admin remote, start all three processes, navigate to the admin
route, and confirm its UI renders inside the shell frame with no shell
source file changed beyond the registry entry.

**Acceptance Scenarios**:

1. **Given** the admin remote is running and registered with a name, entry,
   routePath, and label, **When** the shell starts, **Then** it resolves and
   mounts the admin remote at its registered route, independently of whether
   the dashboard remote is also registered.
2. **Given** both the dashboard and admin remotes are registered, **When**
   the shell composes each in turn, **Then** navigating between their routes
   mounts and unmounts the correct remote each time, with no leftover state
   from the other.
3. **Given** the admin remote must be registered, **When** a team does so,
   **Then** it requires editing only the registry file — the route-patching
   mechanism sprint 4 built is not remote-specific and needs no further
   changes.

---

### User Story 2 - A person reviews the list of users (Priority: P1)

A person viewing the admin remote sees a table of users, able to page and
sort through a realistic volume of them — not just the handful that fit on
one screen.

**Why this priority**: This is the domain's foundational surface (every
other story acts on a user found here) and the specific technical claim
ADR-0010 assigns to admin: proving the shared design system's heaviest
existing component works across a second remote, not just the one it was
first proven in.

**Independent Test**: Run the admin remote standalone, with no shell
present, and confirm the table paginates and sorts a fixture set larger than
one page.

**Acceptance Scenarios**:

1. **Given** more users exist than fit on one page, **When** the table
   renders, **Then** it shows a bounded page of them with a way to reach the
   rest.
2. **Given** a sortable column, **When** a person chooses to sort by it,
   **Then** the visible rows reorder accordingly.
3. **Given** the admin remote is composed inside the shell, **When** the
   table renders, **Then** it uses the shared design system's table
   component, not a bespoke one.

---

### User Story 3 - An authorized person invites a user or changes a role (Priority: P1)

A person whose session grants the `users:write` permission opens a modal to
invite a new user or edit an existing one's role. A person whose session
does not grant that permission cannot reach the action at all.

**Why this priority**: The specific technical claim ADR-0010 assigns to this
surface — proving a form pattern *and* a permission-gated action, not just
"signed in or not." Equal priority to US2 because the role-change path this
story delivers is the direct dependency of US4, this sprint's headline proof.

**Independent Test**: With a session that grants `users:write`, open the
modal, submit an invite and a role change, and confirm both are reflected in
the user table. Separately, confirm a session without that permission never
sees the action offered at all.

**Acceptance Scenarios**:

1. **Given** a session with `users:write`, **When** the person opens the
   invite/edit modal and submits a new user, **Then** that user appears in
   the table.
2. **Given** a session with `users:write`, **When** the person changes an
   existing user's role and submits, **Then** the table reflects the new
   role.
3. **Given** a session without `users:write`, **When** the admin remote
   renders, **Then** the action to open the modal is not offered — not
   present and disabled, simply not present.
4. **Given** the modal is submitted with invalid input, **When** validation
   runs, **Then** the person sees what to fix, and no partial or malformed
   user is added to the table.

---

### User Story 4 - A role change updates the dashboard live (Priority: P1) 🎯 headline proof

Someone using the dashboard, in a different browser tab or window from
someone using admin, sees the dashboard's "active users" KPI update the
moment the admin user changes a role — no page reload, and neither remote
importing the other.

**Why this priority**: This is the reason ADR-0010 paired these two domains
in the first place, and the proof point the project's own README demo is
built around: cross-remote communication working in practice, not just as an
architecture diagram. Every other story in this sprint is a prerequisite for
this one.

**Independent Test**: With the shell composing both remotes, open the
dashboard's KPI card, then in admin change a user's role. Confirm the KPI
value changes without reloading the dashboard, and confirm neither remote's
source imports the other directly.

**Acceptance Scenarios**:

1. **Given** both remotes are composed and mounted, **When** a role change
   is submitted in admin, **Then** the dashboard's "active users" KPI value
   changes without a page reload.
2. **Given** the dashboard is not currently mounted when the role change
   happens, **When** the dashboard is mounted afterward, **Then** it shows
   its own freshly-fetched state — a missed live update is not an error, and
   is never replayed as if it just happened.
3. **Given** the update path, **When** the two remotes' source is inspected,
   **Then** neither imports the other directly or through a relative path —
   the update travels only through the shared event-bus package.
4. **Given** the event-bus package fails to resolve as a singleton (spec
   Edge Cases), **When** this is checked, **Then** it is caught by the
   existing singleton drift gate, not discovered by the live-update demo
   silently not working.

---

### User Story 5 - The boundary and singleton gates hold against a third real app (Priority: P2)

A contributor introduces a cross-app relative import touching `apps/admin`,
or a singleton version mismatch in its `package.json` or in the new
`packages/event-bus`. Both guard rails catch it before merge.

**Why this priority**: Principles I, II, and III are non-negotiable, and
this is the first time either gate runs against three real applications and
a second singleton *package* (not just singleton npm dependencies) at once.
P2 because it protects the architecture rather than delivering domain
behavior, the same priority `003-dashboard-remote`'s equivalent story took.

**Independent Test**: Introduce a deliberate relative import from
`apps/admin` reaching into `apps/dashboard` or `apps/shell`, confirm
`pnpm check:boundaries` fails and names it, then revert. Separately,
introduce a version mismatch for `packages/event-bus` between the two
remotes, confirm `pnpm check:shared-deps` fails and names it, then revert.

**Acceptance Scenarios**:

1. **Given** `apps/admin` exists with `src/exposed/` and `src/internal/`,
   **When** the boundary gate runs, **Then** it inspects the admin remote's
   source rather than skipping it.
2. **Given** a deliberate cross-app relative import touching `apps/admin`,
   **When** the gate runs, **Then** it fails and names the violated rule.
3. **Given** `packages/event-bus` is declared in both remotes' manifests,
   **When** their version ranges diverge, **Then** `pnpm check:shared-deps`
   fails and names both manifests.
4. **Given** both deliberate violations are reverted, **When** the gates run
   again, **Then** both pass.

---

### Edge Cases

- What happens when the admin remote is run standalone, with no shell
  present? It MUST still build and render fully, table included — the same
  guarantee `003-dashboard-remote` established for a remote in general.
- What happens when two role changes for the same user happen in quick
  succession? The dashboard MUST reflect the most recent one, not an
  interleaving of both.
- What happens when the event-bus package itself fails to load or resolves
  to two different instances instead of one shared singleton? This MUST be
  caught by the singleton drift gate (`FR-023`), not surface only as a
  silently-not-updating KPI.
- What happens when a role change is submitted while the dashboard remote
  isn't loaded at all? Covered by User Story 4, scenario 2 — no replay, no
  error; the dashboard simply reflects current state whenever it next loads.
- What happens when the invite/edit modal is submitted with a duplicate
  email or an empty required field? Rejected with a specific reason, no user
  added or changed.

## Requirements *(mandatory)*

### Functional Requirements

**The admin remote**

- **FR-001**: The repository MUST contain `apps/admin`, building and running
  as a standalone application with no shell present.
- **FR-002**: The admin remote MUST render using the shared design system for
  any element an equivalent component already exists for.
- **FR-003**: The admin remote MUST split its own source into `src/exposed/`
  and `src/internal/`, exposing only its root component — the same
  convention `apps/shell` and `apps/dashboard` use.
- **FR-004**: The admin remote MUST satisfy the registry contract (`name`,
  `entry`, `routePath`, `label`) so a team can register it by editing only
  registry files.
- **FR-005**: The admin remote MUST read the current session through the
  shared auth contract rather than implementing its own.

**User table**

- **FR-006**: The admin remote MUST display users in a table, paged so that
  a realistic user count never renders as one unbounded list.
- **FR-007**: At least one column MUST be sortable, and sorting MUST reorder
  the visible rows accordingly.

**Invite and role change**

- **FR-008**: The action to invite a user or edit an existing user's role
  MUST be reachable only by a session whose permissions include
  `users:write`; a session without it MUST NOT be offered the action at all.
- **FR-009**: Submitting a new user through the invite/edit modal MUST add
  that user to the table.
- **FR-010**: Submitting a role change for an existing user MUST update that
  user's role in the table.
- **FR-011**: Invalid submissions (missing required fields, a duplicate
  identifying value) MUST be rejected with a specific, visible reason, and
  MUST NOT add or change a user.

**Cross-remote live update (packages/event-bus)**

- **FR-012**: The repository MUST contain `packages/event-bus`, a typed
  publish/subscribe mechanism for cross-remote communication, consumable by
  more than one app without any app importing another app directly.
- **FR-013**: A role change submitted in the admin remote MUST publish an
  event carrying enough information for a subscriber to update a
  user-count-derived value, without the subscriber querying admin directly.
- **FR-014**: The dashboard remote MUST subscribe to that event and update
  its "active users" KPI when one arrives, with no page reload.
- **FR-015**: Neither the admin remote's nor the dashboard remote's source
  MUST import the other, directly or via a relative path — the update MUST
  travel only through `packages/event-bus`.
- **FR-016**: A role-change event published while no subscriber is mounted
  MUST NOT be queued and replayed later as if it just happened — a
  subscriber that mounts afterward reflects current state from its own
  fetch, not a stale replayed event.

**Boundary and singleton compliance**

- **FR-017**: `pnpm check:boundaries` MUST inspect `apps/admin` and MUST be
  demonstrated failing on a deliberate cross-app relative import touching
  it, then passing after revert.
- **FR-018**: `apps/admin/package.json` MUST declare version ranges for
  `react`, `react-dom`, `react-router`, `@enterprise-mfe/auth`, and
  `@enterprise-mfe/event-bus` identical to every other manifest in
  `scripts/check-shared-deps.ts`.
- **FR-019**: `pnpm check:shared-deps` MUST be demonstrated failing on a
  deliberate `packages/event-bus` version mismatch between `apps/admin` and
  `apps/dashboard`, then passing after revert.

**Shell composition**

- **FR-020**: Registering the admin remote in the shell's development
  registry MUST require editing only the registry file — the route-patching
  mechanism `003-dashboard-remote` built needs no further change to support
  a second remote.
- **FR-021**: When the shell composes the admin remote and it fails to load,
  the failure MUST be contained to its region using the error boundary built
  in sprint 3, and the rest of the shell — including the dashboard region,
  if also composed — MUST keep working.

### Key Entities

- **User**, **Role**, **Permission**: already defined in
  `packages/shared-types` (sprint 2) — this sprint is their first real
  consumer, not a redefinition.
- **Role-change event**: the payload `packages/event-bus` carries from admin
  to dashboard — identifies which user changed role and enough information
  for the dashboard to update its active-users figure, without exposing
  anything about admin's internal state beyond that.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team can register `apps/admin` in the shell's development
  registry and see it composed and navigable alongside the already-composed
  dashboard remote, touching only the registry file.
- **SC-002**: The user table pages and sorts a fixture set larger than one
  page, 100% of the time, with no unbounded render.
- **SC-003**: Every invite and role-change submission is reflected in the
  table within the same session, and every invalid submission is rejected
  with a visible, specific reason — 0 malformed users ever added.
- **SC-004**: A session without `users:write` never sees the invite/edit
  action offered, in 100% of checked cases.
- **SC-005**: A role change in admin is reflected in the dashboard's KPI
  within the time a person would perceive as immediate, with zero manual
  reloads, in every composed-shell run tested.
- **SC-006**: `pnpm check:boundaries` is demonstrated failing on a deliberate
  cross-app import touching `apps/admin` and passing after revert.
- **SC-007**: `pnpm check:shared-deps` is demonstrated failing on a
  deliberate `packages/event-bus` mismatch and passing after revert.
- **SC-008**: The full quality gate set (`lint`, `typecheck`, `build`,
  `test`, `e2e`, `check:boundaries`, `check:shared-deps`) passes on a clean
  checkout, with zero bypasses recorded in the pull request.
- **SC-009**: Every loading, error, empty, and permission-denied state named
  in this spec has an automated test; none is verified only by hand.

## Assumptions

- **User data is a self-contained fixture**, exactly like the dashboard's
  KPI/chart/feed data (`003-dashboard-remote` research D5) — this project
  has no backend by design, so the user table, invite, and role-change
  actions operate on an in-memory fixture the admin remote owns, not a real
  API.
- **The stub session cannot simulate a lower-privilege user interactively.**
  `packages/auth`'s stub always signs in the same admin-role identity
  (`STUB_USER`, all three permissions). `FR-008`'s denied path (`SC-004`) is
  proven by direct component/unit testing against a simulated
  lower-privilege user, not by an interactive test through the stub's fixed
  identity — the stub's contract (`ADR-0009`) is not changed to add
  multi-identity support, since that is out of this sprint's scope and would
  itself start to resemble a real auth implementation.
- **"Immediate" (SC-005) means no polling delay and no manual refresh** — the
  update is push-based via `packages/event-bus`, not a periodic re-fetch
  that happens to be fast.
- **Only the development registry is touched this sprint**, mirroring how
  sprint 3 and sprint 4 both scoped registry changes to `remotes.dev.json`
  only.
- **The generator (ADR-0008, Principle V) is still out of scope.** This
  sprint is what makes it viable next (sprint 7), not an invitation to start
  it early.

### Dependencies

- `specs/003-dashboard-remote` — the registry contract, the route-patching
  mechanism, and the "exposed entry must import its own stylesheet" pattern
  are all reused here, not rebuilt.
- `packages/shared-types`'s `User`, `Role`, `Permission`, and
  `permissionsForRole` (sprint 2) are consumed as-is.
- `packages/auth`'s `useAuth()` and the stub session (sprint 2) are consumed
  as-is; `ADR-0009`'s stub-only contract is not renegotiated by this sprint.
- `scripts/check-shared-deps.ts` currently comments that
  `@enterprise-mfe/event-bus` "arrives with the typed event bus in sprint
  6" — written speculatively before this sprint's actual scope was decided.
  `docs/blueprint.html` §15 and `ADR-0010`'s own proof point place it here,
  in sprint 5; that comment is corrected as part of this work, not treated
  as a constraint on it.

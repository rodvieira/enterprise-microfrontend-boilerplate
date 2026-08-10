# Feature Specification: Remote Generator

**Feature Branch**: `006-remote-generator`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Sprint 7 — Generator: build `pnpm turbo gen remote`, a scaffolding generator extracted from the common pattern shared by the two existing working remotes, apps/dashboard and apps/admin (per ADR-0008 and Constitution Principle V). Running it should produce a new remote app under apps/<name> that already follows every convention enforced elsewhere in the repo: the exposed/internal split (Principle I), no cross-app relative imports (Principle II, dependency-cruiser), correct singleton shared-dep versions for react/react-dom/packages/auth/packages/event-bus (Principle III, check-shared-deps), a federation config exposing ./App from src/exposed, registration in the shell's remote registry, and wiring into the relevant docs/ file per CLAUDE.md ('every new package or app needs an entry in the relevant docs/ file'). The generator must be built by diffing/extracting from the actual dashboard and admin remotes, not designed from scratch. Per `docs/blueprint.html`'s Definition of Done and ADR-0007/ADR-0008/ADR-0013 (confirmed with the user), this sprint also ships the generator's second, standalone output mode — an independent project consuming `packages/*` as published dependencies via GitHub Packages, with Changesets as the publishing engine — building the real mechanism, not a stub; the first live publish to a real registry is a separate, deliberate, user-triggered action outside this sprint's automated scope."

## User Scenarios & Testing *(mandatory)*

The people served here are contributors who need to add a third (or Nth)
remote to this boilerplate — either inside this monorepo during evaluation,
or as the first commit of a new standalone remote repository — without
hand-copying and editing `apps/dashboard` or `apps/admin` file by file and
hoping nothing was missed. This also serves whoever eventually needs to prove
this project's "a remote can move to its own repository later" claim
(ADR-0007) with real, generated output rather than an assertion.

### User Story 1 - A new remote scaffolds itself, correctly, on the first run (Priority: P1)

A contributor runs the generator, answers a short set of prompts (remote name,
route path, display label, output mode), and — choosing monorepo mode — gets
a new `apps/<name>` that builds, type-checks, lints, passes the boundary
check, passes the shared-deps check, and renders a placeholder page composed
inside the shell — with no manual follow-up edits required to reach that
state.

**Why this priority**: This is the entire point of the generator (ADR-0008):
replace error-prone hand-copying of `apps/dashboard`/`apps/admin` with a
repeatable, correct-by-construction path. Without this, sprint 7 delivers
nothing sprints 4–5 didn't already provide by example.

**Independent Test**: Run the generator for a throwaway remote name in
monorepo mode, then run `pnpm build`, `pnpm test`, `pnpm check:boundaries`,
and `pnpm check:shared-deps` against the whole workspace and confirm all four
pass with zero manual edits, then start `pnpm dev` and confirm the new
remote's placeholder route renders inside the shell.

**Acceptance Scenarios**:

1. **Given** a clean workspace, **When** the generator is run in monorepo
   mode with a valid remote name, **Then** a new `apps/<name>` directory is
   created containing a working app that mirrors the structure
   `apps/dashboard` and `apps/admin` already share.
2. **Given** the newly generated remote, **When** `pnpm build`, `pnpm test`,
   `pnpm lint`, and `pnpm typecheck` are run for the whole workspace, **Then**
   all four succeed for the new app with no edits beyond what the generator
   produced.
3. **Given** the newly generated remote, **When** `pnpm dev` is run and the
   shell's chrome is used to navigate to the new remote's route, **Then** the
   remote's placeholder content renders composed inside the shell, the same
   way `/dashboard` and `/admin` already do.
4. **Given** the generator prompts, **When** a remote name is entered that
   collides with an existing `apps/*` directory or an existing entry in any
   `remotes.<environment>.json`, **Then** the generator refuses to proceed and
   states the collision, rather than overwriting or silently duplicating a
   route.

---

### User Story 2 - The generated remote can't violate a guard rail by construction (Priority: P1)

The same three guard rails already enforced against `apps/dashboard` and
`apps/admin` — the exposed/internal boundary, no cross-app relative imports,
and singleton shared-dependency versions — hold for a generated remote from
the moment it's created, without the person who ran the generator needing to
know those rules exist.

**Why this priority**: A generator that produces a scaffold a contributor then
has to manually fix to pass `check:boundaries` or `check:shared-deps` has not
actually removed the error-prone step ADR-0008 exists to remove — it has just
moved it later. This is what makes the output "correct by construction"
rather than "a starting point that still needs review."

**Independent Test**: Immediately after generation, without any manual edit,
run `pnpm check:boundaries` and `pnpm check:shared-deps` against the whole
workspace and confirm both pass for the new remote.

**Acceptance Scenarios**:

1. **Given** a newly generated remote, **When** `pnpm check:boundaries` runs,
   **Then** it passes — the generated app's public surface is `src/exposed/`
   only, and nothing outside the app imports its `src/internal/`.
2. **Given** a newly generated remote, **When** `pnpm check:shared-deps` runs,
   **Then** it passes — the generated `package.json` declares every singleton
   listed in `scripts/check-shared-deps.ts` (`react`, `react-dom`,
   `react-router`, `@enterprise-mfe/auth`, `@enterprise-mfe/event-bus`) at
   exactly the version ranges the shell and every other remote already use.
3. **Given** a newly generated remote's Module Federation configuration,
   **When** it is inspected, **Then** it exposes exactly `./App` sourced from
   `src/exposed/App`, matching the pattern already used by `apps/dashboard`
   and `apps/admin`, and declares the same `shared` singleton block.

---

### User Story 3 - The generator also produces a standalone, out-of-monorepo remote (Priority: P1)

Choosing standalone mode instead of monorepo mode produces a fully
independent project — outside `apps/*`, with no dependency on this
monorepo's workspace links — that consumes `packages/*` as ordinary
published dependencies, resolved from a real package registry, and builds
successfully on its own.

**Why this priority**: ADR-0007 commits this project to "a remote can move
to its own repository later without any code changes to the boundary."
`docs/blueprint.html`'s own Definition of Done for the architecture lists
"Generator produces both monorepo-mode and standalone-mode output" as a
top-level requirement, not an optional extra, and `docs/decisions/0013-guard-rails-closed.md`
explicitly named this sprint's generator as the thing standalone-repo parity
depends on. A generator that only ever produces monorepo output leaves that
claim untested against anything real.

**Independent Test**: Run the generator in standalone mode for a throwaway
remote name, targeting an empty directory outside this repository. Without
copying any file from this monorepo by hand, run that project's own
`pnpm install` and `pnpm build` against the configured package registry and
confirm both succeed, resolving `@enterprise-mfe/*` packages as installed
dependencies rather than workspace links.

**Acceptance Scenarios**:

1. **Given** the generator's mode prompt, **When** standalone mode is
   chosen, **Then** the generator asks for an output location outside
   `apps/*` and writes a complete, independent project there — not a
   directory inside this monorepo's workspace.
2. **Given** the generated standalone project's `package.json`, **When** it
   is inspected, **Then** every `@enterprise-mfe/*` package it depends on is
   declared at a published semver range, not `workspace:*`, and the project
   includes registry configuration pointing at GitHub Packages so those
   ranges actually resolve.
3. **Given** the generated standalone project, **When** its own `pnpm build`
   is run in an environment authenticated against the configured registry,
   **Then** it succeeds without any file from this monorepo being copied in
   by hand beyond what the generator wrote.
4. **Given** `packages/*` need to exist as installable, versioned artifacts
   for standalone mode to resolve them at all, **When** this sprint's work is
   inspected, **Then** a real Changesets-based versioning and publish
   workflow exists and is documented for `packages/*` — but this sprint's own
   automated work (generation, tests, CI) MUST NOT itself trigger a first
   live publish to the real GitHub Packages registry; that first publish is
   a separate, deliberate action a maintainer takes once repository publish
   credentials are in place.
5. **Given** the standalone project's own exposed/internal structure and
   federation configuration, **When** compared against the equivalent
   monorepo-mode output for the same prompts, **Then** they are structurally
   identical except for how `packages/*` are resolved (workspace link vs.
   published dependency) and any registry-specific configuration files.

---

### User Story 4 - The generated remote is composed and documented, not left orphaned (Priority: P2)

After generation, the new remote is registered wherever the shell needs to
know about it to compose it (monorepo mode), and the project's own
documentation reflects that the app — or, for standalone mode, the pattern
for adding an external remote — now exists, without a separate,
easy-to-forget manual step.

**Why this priority**: CLAUDE.md's own rule — "every new package or app needs
an entry in the relevant `docs/` file, not just code" — applies to the
generator's own output as much as to hand-written apps. A remote that exists
on disk but is invisible to the shell or to `docs/` is a half-finished result
a contributor has to notice and complete themselves. P2 because the app is
independently valuable (User Stories 1–3) even before this wiring is
confirmed, but the generator's job is not done without it.

**Independent Test**: After generating a monorepo-mode remote, without manual
edits, inspect the dev-environment registry file and `docs/architecture.md`
and confirm both reflect the new remote's existence.

**Acceptance Scenarios**:

1. **Given** a newly generated monorepo-mode remote, **When** the
   dev-environment registry
   (`apps/shell/src/internal/federation/remotes.dev.json`) is inspected,
   **Then** it contains a new entry for the remote — name, entry URL, route
   path, and label — added alongside the existing `dashboard` and `admin`
   entries, not replacing them.
2. **Given** a newly generated monorepo-mode remote, **When**
   `docs/architecture.md`'s "Remotes" section is inspected, **Then** it names
   the new remote the same way it already names `apps/dashboard` and
   `apps/admin`.
3. **Given** the generator only writes the dev registry automatically,
   **When** staging or production registration is needed, **Then** the
   generator's own output (README or console output) says so explicitly,
   rather than the contributor discovering the gap when a later deploy is
   missing the remote.
4. **Given** a newly generated standalone-mode remote, **When** its own
   generated `README.md` is inspected, **Then** it states plainly how to
   register that external remote's URL in a consuming shell's registry,
   since the generator itself cannot write to a registry it doesn't own.

---

### Edge Cases

- What happens when the generator is run outside the monorepo root, or in a
  workspace where `apps/dashboard` or `apps/admin` don't exist (a partial or
  corrupted checkout)? The generator MUST fail with a clear message rather
  than producing a broken or partially-written app.
- What happens when the entered remote name isn't a valid package/directory
  name (spaces, uppercase, leading digits, reserved names like `shell`)? The
  generator MUST reject it up front with a specific reason, not fail partway
  through file generation.
- What happens when the entered route path collides with a host-owned route
  (a path the shell itself mounts, independent of any remote)? The generator
  MUST refuse the same way it refuses a colliding remote name, per
  `apps/shell/src/internal/federation/manifest.ts`'s existing route-collision
  check.
- What happens if generation is interrupted partway (process killed, disk
  full)? The next run MUST be able to detect the partial `apps/<name>` (or
  partial standalone output directory) and refuse to proceed silently over
  it, rather than producing a directory that passes generation but fails CI
  in a way that looks unrelated to being incomplete.
- What happens when standalone mode is chosen but `packages/*` have never
  been published, so no version exists yet to depend on? The generator's
  output MUST still be structurally correct (correct dependency names,
  correct registry configuration) and MUST say plainly that install will
  fail until a first publish exists — this is a documented, expected state
  before this project's first real publish, not a bug in the generator.
- What happens when someone runs standalone mode without registry publish
  credentials configured at all (the common case before a maintainer sets
  those up)? The generator MUST still succeed at generating the project and
  MUST NOT attempt to publish anything itself — publishing is always a
  separate, explicit action, never a side effect of generation.

## Requirements *(mandatory)*

### Functional Requirements

**Extraction and scaffolding (both modes)**

- **FR-001**: The generator MUST be implemented by extracting the common
  structure and configuration actually shared by `apps/dashboard` and
  `apps/admin` as they exist today — not a structure designed independently
  of those two apps.
- **FR-002**: Running the generator MUST prompt for, at minimum, an output
  mode (monorepo or standalone), a remote name, a route path, and a display
  label, and MUST validate each before writing any file.
- **FR-003**: In monorepo mode, the generator MUST create a new
  `apps/<name>` directory containing a working app: build config, TypeScript
  config, lint config, test setup, a `src/exposed/App` entry component, and
  a `src/internal/` directory for anything not part of the public surface —
  mirroring what `apps/dashboard` and `apps/admin` already have in common.
- **FR-004**: The generator MUST refuse to run if its target output
  directory already exists (either `apps/<name>` for monorepo mode, or a
  non-empty directory for standalone mode), rather than overwriting it.

**Guard-rail correctness by construction (monorepo mode)**

- **FR-005**: The generated app's Module Federation configuration MUST
  expose exactly `./App`, sourced from `src/exposed/App`, and MUST declare
  the same `shared` singleton block (`react`, `react-dom`, `react-router`,
  `@enterprise-mfe/auth`, `@enterprise-mfe/event-bus`) already used by the
  two existing remotes.
- **FR-006**: The generated app's `package.json` MUST declare every package
  listed in `scripts/check-shared-deps.ts`'s `SINGLETONS` at the exact
  version ranges already used by the shell and the two existing remotes, so
  `pnpm check:shared-deps` passes without modification.
- **FR-007**: The generated app's file layout MUST place all federation-
  exported code under `src/exposed/` and everything else under
  `src/internal/`, and MUST declare every package it imports in its own
  `package.json` (per `.dependency-cruiser.js`'s `no-undeclared-dependencies`
  rule and ADR-0011), so `pnpm check:boundaries` passes without
  modification.
- **FR-008**: Immediately after monorepo-mode generation and a workspace
  install, the new app MUST pass `pnpm build`, `pnpm test`, `pnpm lint`,
  `pnpm typecheck`, `pnpm check:boundaries`, and `pnpm check:shared-deps` for
  the whole workspace, with zero manual edits.

**Standalone mode**

- **FR-016**: The generator MUST support a standalone output mode that
  writes a complete, independent project to a location outside this
  monorepo's `apps/*`, structurally equivalent to monorepo-mode output
  (same exposed/internal split, same federation config shape) except for how
  `packages/*` are resolved.
- **FR-017**: The standalone project's `package.json` MUST declare
  `@enterprise-mfe/*` dependencies at published semver ranges, never
  `workspace:*`, and MUST include the registry configuration (an `.npmrc`
  or equivalent) needed to resolve those ranges from GitHub Packages.
- **FR-018**: This sprint MUST introduce a real Changesets-based versioning
  and publish workflow for `packages/*`, targeting GitHub Packages under
  this project's package scope — the actual mechanism standalone mode's
  dependency resolution relies on, not a description of one.
- **FR-019**: Neither the generator itself nor this sprint's own CI/test
  automation MUST perform a live publish of `packages/*` to the real GitHub
  Packages registry. The publish workflow MUST exist, be documented, and be
  safely dry-run-testable, but its first real invocation is a separate,
  deliberate action a maintainer takes once repository publish credentials
  are configured — never an automatic side effect of running the generator,
  the test suite, or this sprint's CI.
- **FR-020**: The standalone project's generated `README.md` MUST state its
  install prerequisites plainly — that it depends on published
  `@enterprise-mfe/*` packages resolving from GitHub Packages, and that
  install fails until a first publish exists if none has happened yet — so
  this is discovered by reading, not by a confusing install failure.

**Composition and documentation wiring (monorepo mode)**

- **FR-009**: The generator MUST add an entry for the new remote (name, entry
  URL, route path, label) to the dev-environment registry
  (`apps/shell/src/internal/federation/remotes.dev.json`), so the remote is
  immediately composable via `pnpm dev` without a manual edit.
- **FR-010**: The generator MUST NOT write entries to the staging or
  production registries automatically, and MUST state this limitation in its
  own output, since promoting a new remote to those environments is a
  deployment decision, not a scaffolding decision (ADR-0012).
- **FR-011**: The generator MUST add a line naming the new app to
  `docs/architecture.md`'s "Remotes" section, so the app is discoverable in
  documentation the same way `apps/dashboard` and `apps/admin` already are,
  satisfying CLAUDE.md's "every new package or app needs an entry in the
  relevant `docs/` file" rule. (`docs/packages.md` is out of scope here — it
  documents `packages/*`, not `apps/*`.)
- **FR-012**: A newly generated remote's route path MUST be checked against
  both host-owned routes and existing remotes' route paths before generation
  proceeds, reusing the same collision semantics already enforced at runtime
  by `apps/shell/src/internal/federation/manifest.ts`.

**Validation and failure handling (both modes)**

- **FR-013**: The generator MUST validate the remote name as a legal
  directory/package name and MUST reject names that collide with an existing
  `apps/*` directory, a reserved name (e.g. `shell`), or produce an invalid
  package name.
- **FR-014**: The generator MUST perform all validation (name, route path,
  collisions, output-mode-specific checks) before writing any file, so a
  rejected run leaves the workspace unchanged.
- **FR-015**: The generator's own console output MUST state, in plain terms,
  what it did and did not do — files created, the registry entry added (or,
  for standalone mode, that no registry was touched), the docs entry added,
  and that staging/production registration and any real package publish are
  not included — so nothing is discovered only by a later, unrelated
  failure.

### Key Entities

- **Generated remote (monorepo mode)**: A new `apps/<name>` app,
  structurally identical in convention to `apps/dashboard` and
  `apps/admin` — same exposed/internal split, same federation config shape,
  same shared-dependency versions — differing only in name, route, label,
  and placeholder content.
- **Generated remote (standalone mode)**: A complete, independent project
  written outside this monorepo, structurally equivalent to the monorepo
  variant except that `@enterprise-mfe/*` dependencies are published
  packages resolved from GitHub Packages rather than workspace links.
- **Dev registry entry**: One object appended to the `remotes` array in
  `apps/shell/src/internal/federation/remotes.dev.json`, matching the shape
  already used by the `dashboard` and `admin` entries (`name`, `entry`,
  `routePath`, `label`). Monorepo mode only.
- **Docs entry**: One line added to `docs/architecture.md`'s "Remotes"
  section, naming the new app the same way existing apps are already named
  there. Monorepo mode only.
- **Package publish workflow**: A Changesets-driven CI workflow that
  versions and publishes `packages/*` to GitHub Packages. Introduced by this
  sprint as real, working infrastructure; its first live execution against
  the real registry is a deliberate action outside this sprint's automated
  scope (FR-019).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contributor can go from "the generator hasn't been run yet"
  to "a third remote renders composed inside the shell via `pnpm dev`" using
  only the generator's prompts in monorepo mode — zero manual file edits.
- **SC-002**: 100% of the workspace's existing quality gates (`build`,
  `test`, `lint`, `typecheck`, `check:boundaries`, `check:shared-deps`) pass
  against a freshly generated monorepo-mode remote with zero manual edits,
  every time the generator is run.
- **SC-003**: Comparing a generated `apps/<name>` against `apps/dashboard` and
  `apps/admin` shows the same conventions (exposed/internal split, federation
  config shape, shared-dependency versions) — a reviewer can confirm this by
  inspection without running any tool.
- **SC-004**: A new monorepo-mode remote is visible in both the dev
  environment (composable via `pnpm dev`) and the project's documentation
  (`docs/architecture.md`) immediately after generation, with no separate
  step required to make it discoverable.
- **SC-005**: A generated standalone-mode project's own `pnpm install` and
  `pnpm build` succeed, resolving every `@enterprise-mfe/*` dependency from
  the configured registry rather than a local workspace path — demonstrated
  once at least one real publish has occurred.
- **SC-006**: Zero live publishes to the real GitHub Packages registry occur
  as a side effect of running the generator, the test suite, or this
  sprint's own CI, across every run performed while building this feature.

## Assumptions

- **The generator is run from, and only supported from, the monorepo root**,
  consistent with every other workspace command (`pnpm build`, `pnpm dev`,
  etc.) already documented in `CLAUDE.md`. Standalone mode's *output* lives
  outside the monorepo; running the generator itself does not.
- **The generated app's content is a placeholder**, not a real feature — the
  generator's job is structural correctness (build passes, guard rails pass,
  composition works), not producing business logic. This mirrors how
  `apps/dashboard` and `apps/admin` each started before their real features
  were built by hand in sprints 4–5.
- **`pnpm turbo gen remote` is implemented as a Turborepo generator**
  (the existing `pnpm gen` script already runs `turbo gen`; no new root
  script is required) — consistent with the tooling already declared in
  `package.json` and referenced in `docs/architecture.md`.
- **Standalone mode's real publish is deliberately not executed by this
  sprint's own work** (FR-019, confirmed with the user): the Changesets
  workflow and GitHub Packages configuration are built as real, working
  mechanism — not a stub — but the first live publish is a separate action a
  maintainer takes once repository secrets/credentials exist, the same way
  `packages/auth`'s stub is a real contract without a real identity provider
  wired in (ADR-0009 precedent for "mechanism real, external integration
  deliberately deferred").
- **The generator only writes the dev registry, not staging or production**
  (FR-010) — per ADR-0012, environment registries are a deployment concern,
  and a scaffolding tool auto-editing a production routing file would cross
  that boundary. This applies to monorepo mode only; standalone mode never
  writes to any registry it doesn't own.

### Dependencies

- `apps/dashboard` and `apps/admin` (`003-dashboard-remote`,
  `004-admin-remote`) — the two real, working remotes the generator's pattern
  is extracted from, per ADR-0008 and Constitution Principle V. This sprint
  MUST NOT begin until both are confirmed complete (they are, as of
  `005-guard-rails`).
- `apps/shell/src/internal/federation/manifest.ts` and
  `remotes.dev.json` (`002-shell-host`, ADR-0012) — the registry format and
  collision-checking logic the generator's dev-registry write and
  route-collision validation must match.
- `scripts/check-shared-deps.ts` (Constitution Principle III) — the singleton
  version source of truth the generated `package.json` must match exactly.
- `dependency-cruiser` boundary configuration (Constitution Principle I, II)
  — what the generated app's file layout must satisfy without modification.
- `docs/architecture.md` — the documentation section the generator must
  append to for monorepo-mode output (FR-011).
- ADR-0007, ADR-0008, ADR-0013 — the decisions that put standalone-mode
  output in this sprint's scope, not a future one.
- **New dependency this sprint**: Changesets (`@changesets/cli` or
  equivalent), to be justified in the PR description per Constitution
  Principle IX — needed as the versioning/publishing engine for
  `packages/*`, which standalone mode's dependency resolution requires to
  exist at all.

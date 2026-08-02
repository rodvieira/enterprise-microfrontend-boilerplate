<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: Initial ratification. All placeholder tokens replaced with
concrete, already-decided content sourced from CONSTITUTION_DRAFT.md, CLAUDE.md,
and docs/decisions/. No prior version existed, so no principle was modified or
removed.

Principles defined (9, expanded from the template's 5 slots):
  I.    Exposed/Internal Boundary (NON-NEGOTIABLE)
  II.   No Cross-App Relative Imports
  III.  Singleton Shared Dependencies
  IV.   Conventions Are Documented, Never Assumed
  V.    Generator Extracted From Two Real Remotes
  VI.   Auth Is a Contract, Not an Implementation
  VII.  Decisions Are Superseded, Never Rewritten
  VIII. Conventional Commits, English Only
  IX.   Every Dependency Justified

Added sections:
  - Technology Constraints (replaces [SECTION_2_NAME])
  - Development Workflow and Quality Gates (replaces [SECTION_3_NAME])

Removed sections: none.

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" is a generic
     gate resolved against this file at plan time; no hardcoded principle to
     drift. No edit required.
  ✅ .specify/templates/spec-template.md — no constitution-coupled section.
  ✅ .specify/templates/tasks-template.md — no principle-driven task category
     removed or added by this ratification.
  ✅ .claude/skills/speckit-*/SKILL.md — checked for stale agent-specific
     references; none found.
  ✅ CLAUDE.md — already states principles I, II, III, IV, VI, VII, VIII, IX.
  ✅ README.md / CONTRIBUTING.md — consistent with principles I, II, III, VII,
     VIII.

Deferred items: none. RATIFICATION_DATE supplied by the maintainer (2026-08-02).
-->

# enterprise-microfrontend-boilerplate Constitution

## Core Principles

### I. Exposed/Internal Boundary (NON-NEGOTIABLE)

Every app under `apps/*` MUST split its `src/` into `exposed/` and `internal/`.
Only `src/exposed/` may appear in that app's `federation.config.ts` `exposes`
map, and only `src/exposed/` may be imported from outside the app. Nothing
outside an app may import that app's `src/internal/`, even across federation and
even when the build would succeed.

Rationale: Module Federation guarantees no encapsulation on its own. Without an
explicit public surface, a remote's implementation details become someone else's
dependency, and refactors turn into cross-team breakage. See ADR-0006.

### II. No Cross-App Relative Imports

No relative import (`../`) may cross from one app under `apps/*` into another,
even though the monorepo makes it technically possible. Cross-app communication
happens only through federation (the shell's `federation/loadRemote.ts`) or
through a shared package under `packages/*`. `pnpm check:boundaries`
(dependency-cruiser) enforces this. A failure here is a hard stop, never a
warning to route around.

Rationale: A separate repository enforces this boundary for free — there is no
relative path to another repo. Keeping the rule inside the monorepo is what lets
any remote move to its own repository later without touching a line of its code.
See ADR-0007.

### III. Singleton Shared Dependencies

`react`, `react-dom`, `packages/auth`, and `packages/event-bus` MUST resolve to a
single shared instance across the shell and every remote. Version ranges for
these MUST be identical in every `package.json` that declares them.
`pnpm check:shared-deps` (`scripts/check-shared-deps.ts`) enforces this in CI and
on push. Any new package that holds state or a React context consumed by more
than one app MUST be added to that check in the same change that introduces it.

Rationale: Version drift in a singleton does not fail the build. It fails
silently at runtime when a remote loads a second copy of React or a second auth
context, and the resulting bug surfaces far from its cause.

### IV. Conventions Are Documented, Never Assumed

Module Federation prescribes no folder structure. Every convention in this repo
beyond Host/Remote/Manifest/shared-deps is this project's own design and MUST be
documented in `docs/` before it is relied on. When explaining the architecture,
project conventions MUST NOT be presented as Module Federation requirements.

Rationale: Adopters need to know which rules they may change and which are
imposed by the technology. Conflating the two makes the boilerplate harder to
adapt, which defeats its purpose.

### V. Generator Extracted From Two Real Remotes

The scaffolding generator (`pnpm turbo gen remote`) MUST be built by extracting
the pattern from two real, working remotes — `apps/dashboard` and `apps/admin` —
after both exist and work end to end. It MUST NOT be designed before then. A
request to build it earlier MUST be refused with a pointer to this principle.

Rationale: An abstraction designed before the second concrete case guesses at the
shared shape. The second remote is what reveals the requirement the first one
never had. See ADR-0008.

### VI. Auth Is a Contract, Not an Implementation

`packages/auth` MUST ship a stable contract (`useAuth()`, `<ProtectedRoute>`,
`<AuthProvider>`) backed by an in-memory stub user. A real OIDC/OAuth login flow
MUST NOT be implemented in this repository. The stub MUST keep working with zero
configuration so `pnpm dev` demonstrates the full flow without an identity
provider. Integration is documented (`docs/how-to-connect-sso.md`, `.env.example`)
rather than coded.

Rationale: Every enterprise adopting this boilerplate already has an identity
provider and would delete a shipped login flow. This is a deliberate decision,
not unfinished work. See ADR-0009.

### VII. Decisions Are Superseded, Never Rewritten

Every architectural decision lives as an ADR in `docs/decisions/`. When a
decision changes, a new ADR MUST be added that supersedes the old one. An
existing ADR MUST NOT be edited to read as though it always said something
different. Corrections to typos and broken links are the only permitted edits.

Rationale: The value of the record is the reasoning at the time, including
reasoning later found wrong. Rewriting history destroys the only evidence of why
an approach was abandoned, and invites repeating it.

### VIII. Conventional Commits, English Only

Commits MUST follow Conventional Commits, scoped to the app or package touched,
using a scope from the allow-list in `commitlint.config.mjs`. Commitlint enforces
this via the `commit-msg` hook. Code, comments, commit messages, PR text, and
documentation MUST be written in English.

Rationale: The scope is what makes history readable in a monorepo where one log
covers many independently owned units. English keeps the project contributable by
anyone who finds it.

### IX. Every Dependency Justified

No dependency may be added without a one-line justification in the PR
description explaining why it is needed and why an existing dependency does not
cover the case.

Rationale: A boilerplate's dependency list is inherited wholesale by every
adopter. Each addition is a maintenance and supply-chain cost imposed on people
who never chose it.

## Technology Constraints

The following choices are settled. They MUST NOT be re-litigated inside a feature
plan; changing one requires a superseding ADR under Principle VII.

- Bundler: Rspack (not Vite — see ADR-0002)
- Federation: Module Federation 2.0 (see ADR-0003)
- Framework: React 19, TypeScript in strict mode
- Styling: Tailwind CSS
- Monorepo: pnpm workspaces + Turborepo
- Lint and format: Biome
- Git hooks: lefthook
- Commit linting: commitlint, scopes defined in `commitlint.config.mjs`
- Testing: Vitest (unit and component), Playwright (end-to-end)
- Boundary enforcement: dependency-cruiser
- License: MIT

Explicitly out of scope. Work proposing any of these MUST be rejected at the
Constitution Check gate:

- A real authentication or SSO implementation (contract and stub only —
  Principle VI, ADR-0009)
- SAML, entirely — it would require a backend this project deliberately does not
  have
- Backend-For-Frontend — documented as the recommended production upgrade path,
  not built here
- Support for any bundler other than Rspack

## Development Workflow and Quality Gates

Build order (see ADR-0008 and `docs/blueprint.html` §15). Work MUST proceed in
this sequence:

Shared packages with no federation dependency → shell → dashboard remote → admin
remote → guard rails (dependency-cruiser, singleton check, remote-load error
boundary) → generator → documentation and security hardening → deploy and launch.

Gates that MUST pass before a pull request merges:

- `pnpm check:boundaries` — Principle II
- `pnpm check:shared-deps` — Principle III
- `pnpm test` — new or changed behavior requires a test
- `pnpm lint` and `pnpm typecheck`
- Commitlint on every commit message — Principle VIII

Local enforcement is automated through lefthook: formatting on `pre-commit`,
commitlint on `commit-msg`, and typecheck plus both guard rails on `pre-push`.
The same gates run in CI on every pull request. Bypassing a hook with
`--no-verify` is permitted only when the failure is a known artifact of an
incomplete build stage, and the bypass MUST be stated in the pull request.

Remote-load failure MUST be handled with an error boundary. A remote that fails
to load MUST NOT take down the shell.

## Governance

This constitution supersedes all other development practices in this repository.
Where a README, guide, or agent instruction conflicts with it, this file wins and
the conflicting document MUST be corrected.

Amendment procedure. An amendment requires: a written rationale, a superseding
ADR in `docs/decisions/` when the change alters a logged decision, an update to
this file with a version bump, and propagation to every dependent artifact listed
in the Sync Impact Report.

Versioning policy. This constitution is versioned semantically:

- MAJOR — a principle is removed or redefined in a backward-incompatible way
- MINOR — a principle or section is added, or existing guidance is materially
  expanded
- PATCH — clarification, wording, or typo fixes that do not change meaning

Compliance review. Every pull request is reviewed against these principles;
`.claude/agents/pr-reviewer.md` encodes the checks. Violations of Principles I,
II, and III are blockers, not suggestions — they are the failure modes this
architecture exists to prevent. Complexity that violates a principle MUST be
justified in the plan's Complexity Tracking section or the design MUST change.
`CLAUDE.md` carries the runtime development guidance derived from this file.

**Version**: 1.0.0 | **Ratified**: 2026-08-02 | **Last Amended**: 2026-08-02

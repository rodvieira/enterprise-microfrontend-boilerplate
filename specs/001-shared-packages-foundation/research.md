# Phase 0 Research: Shared Packages Foundation

**Feature**: `001-shared-packages-foundation` | **Date**: 2026-08-02

Every decision below resolves an unknown in the plan's Technical Context. The
constitution's Technology Constraints (Rspack, Module Federation 2.0, React,
TypeScript strict, Tailwind CSS, pnpm + Turborepo, Biome, Vitest, Playwright,
dependency-cruiser) are settled and are not researched here — only the open
questions inside those constraints are.

Versions below were read from the registry on 2026-08-02, not recalled.

---

## D1 — Packages ship TypeScript source, not compiled output

**Decision**: Each package's `exports` field points at `./src/index.ts`. No build
step, no `dist/`, no `tsup`/`tsc --build` in this sprint. Consumers transpile the
source as part of their own build.

**Rationale**: Nothing consumes these packages yet. Adding a build pipeline now
means maintaining it through five packages before a single consumer proves what
the output should look like — and the bundler that would consume that output
(Rspack) is not configured until sprint 3. Turborepo documents this arrangement
for workspace-internal packages, and it keeps `pnpm test` fast because there is
no compile step between editing and running.

**Consequences**: The `turbo` `test` and `typecheck` tasks declare
`dependsOn: ["^build"]`, which resolves to nothing while no package defines a
`build` script — a no-op, not an error, so `turbo.json` needs no change. When
ADR-0007's standalone mode requires publishable artifacts, a build step is added
then, to packages that already have consumers proving the shape.

**Alternatives considered**: Compiled `dist/` per package (rejected: build
tooling before any consumer exists, and it slows the edit-test loop for zero
present benefit). Single bundled package (rejected: violates the per-package
boundaries the whole architecture is built on).

---

## D2 — Tailwind CSS v4 with CSS-first tokens

**Decision**: Tailwind CSS `4.3.3`. Design tokens live in
`packages/ui/src/styles/tokens.css` using Tailwind v4's `@theme` block. The
package exports that stylesheet; a consuming application imports it and points
Tailwind at the package source so utility classes used inside components are
generated.

**Rationale**: v4 is the current major. Its CSS-first configuration means the
design tokens are one CSS file the design system owns, rather than a JavaScript
config object every consuming app has to import and merge — which is exactly the
"copy the rules into each package" failure User Story 4 exists to prevent.

**Consequences**: A consumer that imports a component but never imports the
stylesheet gets unstyled output. The spec lists this as an edge case that must
fail loudly; the quickstart's validation covers it.

**Risk and fallback**: ADR-0002 recorded Tailwind's Rspack support as
PostCSS-based, which described the v3 integration. If sprint 3 finds a v4/Rspack
integration problem, the fallback is a v3 shared preset — contained to
`tokens.css` and the app's Tailwind entry, no component code changes, because
components only ever reference utility class names.

**Alternatives considered**: Tailwind v3 + a shared JS preset (rejected: a config
object each app must import correctly, and it is the previous major). CSS
Modules or vanilla-extract (rejected: the constitution fixes Tailwind).

---

## D3 — `packages/ui` carries zero runtime dependencies

**Decision**: The design system depends on `react` and `react-dom` as peer
dependencies only. No component library, no styling utility, no focus-management
library. Class name composition is a ~10-line internal helper. Modal focus
trapping and Escape handling are implemented directly and covered by tests
against the spec's acceptance scenarios.

**Rationale**: This follows directly from the constitution's Principle IX
rationale — "a boilerplate's dependency list is inherited wholesale by every
adopter". Seven components do not justify imposing a dependency tree on every
company that clones this repository.

**Consequences**: Focus trapping, Escape-to-close, and focus restoration are ours
to get right, so FR-002 and FR-003 need real keyboard tests, not smoke tests.
This is the main quality risk in the sprint and is where test effort concentrates.

**Alternatives considered**: `@radix-ui/react-dialog` for Modal (rejected here,
but it is the documented escape hatch: it is the correct choice the moment the
hand-rolled implementation shows a real accessibility gap, and swapping it
touches one component). `clsx` + `class-variance-authority` (rejected: two
runtime dependencies for roughly thirty lines of logic).

---

## D4 — Vitest 4 with a single root config using `projects`

**Decision**: Vitest `4.1.10`, `@testing-library/react` `16.3.2`, `jsdom`
`30.0.1`, `@vitejs/plugin-react` `6.0.5`. One `vitest.config.ts` at the
repository root declaring `test.projects: ['packages/*']`. Each package holds
only its own tests, no per-package runner config.

**Rationale**: One command runs everything (SC-005), and a package inherits the
test environment the same way it inherits lint and type rules — by extension, not
by copy. Vitest's standalone `vitest.workspace.ts` file is superseded by the
`projects` field, so the root config is the current form.

**Consequences**: Four new development dependencies at the root, each justified
in the pull request per Principle IX: `vitest` (runner named by the
constitution), `@vitejs/plugin-react` (compiles JSX for the runner), `jsdom` (DOM
implementation for component tests), `@testing-library/react` (renders components
and drives keyboard interaction the way a person would).

**Alternatives considered**: `happy-dom` instead of `jsdom` (faster, but weaker
focus and `inert` behavior — and focus behavior is precisely what D3 makes us
responsible for testing). Per-package configs (rejected: the duplication User
Story 4 exists to eliminate).

---

## D5 — `scripts/check-shared-deps.ts` reads the workspace and compares ranges

**Decision**: A single script, run by the existing `pnpm check:shared-deps`
through `tsx` (already a root devDependency). It reads every `package.json` under
`apps/*` and `packages/*`, and for each name in an explicit singleton list —
`react`, `react-dom`, `@enterprise-mfe/auth`, and later
`@enterprise-mfe/event-bus` — compares the declared version range across every
manifest that declares it. Any divergence prints a table of package → version →
where, and exits non-zero. Missing directories are not an error, so the script
works today with no `apps/` present.

**Rationale**: FR-012 and Principle III require the gate to exist in this change.
It needs no new dependency: Node's filesystem API plus `JSON.parse` is the whole
implementation. The singleton list is explicit rather than inferred, because the
property being checked — "this must be one instance at runtime" — is a human
decision the code cannot derive.

**Consequences**: `pnpm check:shared-deps` stops failing for the reason it fails
today (missing file) and starts being a real gate. The `pre-push` hook and the CI
step become meaningful, and CI's `continue-on-error: true` on that step can be
removed once `apps/` exists.

**Alternatives considered**: Parsing `pnpm-lock.yaml` for resolved versions
(rejected for now: it checks a different thing — what got installed rather than
what was declared — and the declared range is what drifts in a pull request).
`syncpack` (rejected: a dependency for logic that is forty lines, and it enforces
a broader policy than the one principle we need).

---

## D6 — Package scope and structure

**Decision**: Scope `@enterprise-mfe/`, matching the spec's Assumptions and the
examples already committed in `.claude/agents/shared-deps-guard.md`. Five
packages: `config-typescript`, `config-biome`, `shared-types`, `ui`, `auth`.
Every package has `package.json`, `README.md`, `src/index.ts` as its only public
entry point, and `tsconfig.json` extending the shared base.

**Rationale**: A single public entry per package is what makes the design system
and the auth contract substitutable later — consumers import from the package
name, never from a path inside it.

**Consequences**: `.dependency-cruiser.js` already points `tsConfig` at
`packages/config-typescript/tsconfig.base.json`, a path that does not exist yet.
Creating it is what makes `pnpm check:boundaries` able to resolve the workspace,
so `config-typescript` must be built first.

---

## D7 — React as a peer dependency in `ui` and `auth`

**Decision**: `react` and `react-dom` `^19.2.8` are peer dependencies (plus dev
dependencies for tests) in `packages/ui` and `packages/auth`, never regular
dependencies.

**Rationale**: A regular dependency lets pnpm install a second copy of React
under a package. That is the "two Reacts" failure Principle III exists to
prevent, and it fails silently at runtime rather than at build time — the exact
class of bug this architecture is designed to make impossible.

---

## D8 — TypeScript stays on the 5.x line

**Decision**: `typescript` `^5.7.2` as already pinned at the repository root
(currently resolving to 5.9.3). `packages/config-typescript` targets that.

**Rationale**: TypeScript 7 is published, but moving the whole project to a new
major with a different compiler implementation is a decision on its own merits,
not a side effect of creating a shared tsconfig. The root already declares 5.x,
and the constitution requires strict mode, not a specific version.

**Alternatives considered**: TypeScript 7 (deferred: worth its own ADR once the
apps exist and there is something substantial to compile).

---

## D9 — The auth stub's shape

**Decision**: `AuthProvider` holds React state containing a `status` of
`unknown | authenticated | unauthenticated` plus the current user. `useAuth()`
reads it through context and throws a clear error when called outside a provider
— which is also how a second, accidental provider instance becomes detectable.
`login()` resolves to a fixed in-memory user after a tick; `logout()` clears it.
Nothing touches the network, storage, or an environment variable.

**Rationale**: The three-state `status` is what the spec's first edge case
requires: a consumer must be able to tell "not known yet" from "signed out", or
every protected screen flashes its fallback on first paint. Principle VI fixes
the rest — contract and stub, nothing more.

**Consequences**: `<ProtectedRoute>` renders its fallback for `unauthenticated`,
nothing (or a caller-supplied pending element) for `unknown`, and its children
only for `authenticated`.

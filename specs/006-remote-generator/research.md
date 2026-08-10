# Phase 0 Research: Remote Generator

## D1 — What `apps/dashboard` and `apps/admin` actually share (the extraction, per FR-001)

Diffed directly against both apps' current source (not the blueprint's
original sketch — Constitution Principle V requires extracting from the real
thing).

**Identical, byte-for-byte or structurally**:
- `src/exposed/App.tsx` + `src/internal/` split; `src/index.tsx`'s dynamic
  `import('./bootstrap')` pattern with its shared-singleton-resolution
  comment.
- `src/bootstrap.tsx` shape: standalone `<AuthProvider>` + `<App basePath="/" />`,
  identical `#root` not-found guard.
- `index.html` (differs only in `<title>`).
- `tsconfig.json` (identical, extends `@enterprise-mfe/config-typescript/tsconfig.react.json`).
- `postcss.config.mjs` (identical).
- `rspack.config.ts` structurally identical: same loader rules, same
  `ModuleFederationPlugin` shape (`exposes: { './App': './src/exposed/App.tsx' }`,
  identical `shared` singleton block: `react`, `react-dom`, `react-router`,
  `@enterprise-mfe/auth`, `@enterprise-mfe/event-bus`), same
  `HtmlRspackPlugin` + dev-server CORS header pattern.
- `package.json` shape: same `dependencies`/`devDependencies` keys except
  `recharts` (dashboard-only, a feature dependency, not structural) and the
  `description` field.

**Differs, and must stay a per-remote prompt/derived value**:
- App/package name, `ModuleFederationPlugin`'s `name`, `<title>`, dev-server
  `port` (3001 / 3002).
- `description` in `package.json` (feature-specific prose — a generated
  placeholder gets a generic one, not invented domain content).
- Route path and nav label (only known via `remotes.dev.json`, not derivable
  from the app's own files).

**Decision**: `templates/common/` holds every file/fragment in the first
list, parameterized only by name/title/port. `templates/monorepo/` and
`templates/standalone/` hold just the two things that differ by mode:
`package.json`'s dependency ranges (`workspace:*` vs. published semver) and
whether a registry config file (`.npmrc`) is present at all.

**Rejected**: the original blueprint sketch's `federation.config.ts` (a
separate file) and `remote.manifest.json`. Neither exists in the real
`apps/dashboard` or `apps/admin` — Module Federation config lives inline in
`rspack.config.ts`'s `ModuleFederationPlugin`, and there is no manifest file
at all; `docs/architecture.md` and each app's `README.md` carry what the
blueprint assigned to `remote.manifest.json`. Producing either would design
the generator from an aspirational document instead of the two real remotes,
which is the exact mistake ADR-0008 exists to prevent.

## D2 — Generator tooling: `@turbo/gen`, not a bespoke script

**Decision**: Use `@turbo/gen` (Turborepo's own generator toolkit, Plop
under the hood), registered at `turbo/generators/config.ts`.

**Rationale**: `pnpm gen` already runs `turbo gen` (root `package.json`,
present since sprint 1) — the project's own tooling already points at this
exact mechanism; no generator has been registered yet, but the surface is
already reserved for it. Using the build system's own generator toolkit
avoids inventing a parallel one, and gives prompt validation, template
rendering, and post-generation actions as one coherent API instead of
hand-rolled `inquirer` + `fs` calls.

**Alternatives considered**:
- Plain Node script driven by `inquirer` directly — rejected: reimplements
  what `@turbo/gen` already provides, for no benefit, and leaves `pnpm gen`
  pointing at nothing.
- Yeoman / Hygen — rejected: a second, unrelated scaffolding ecosystem next
  to Turborepo's own, with no justification (Constitution Principle IX) once
  `@turbo/gen` already covers the need.

## D3 — Shared-dependency versions: read dynamically, never hardcoded in a template

**Decision**: `shared-versions.ts` reads `react`, `react-dom`, `react-router`,
`@enterprise-mfe/auth`, and `@enterprise-mfe/event-bus` version ranges
directly from an existing manifest (`apps/dashboard/package.json`) at
generation time, and the template renderer substitutes those into the
generated `package.json` — the template itself never contains a literal
version string for any of `scripts/check-shared-deps.ts`'s `SINGLETONS`.

**Rationale**: A template with a baked-in `"react": "^19.2.8"` string
silently drifts the day the real version moves (a routine dependency bump
touching `apps/dashboard`, `apps/admin`, and `apps/shell` together) unless
someone remembers to also update the generator — an easy miss with no test
to catch it until the *next* generation runs `check:shared-deps` and fails.
Reading the live value at generation time makes drift structurally
impossible: whatever the workspace's real singleton version is, is what gets
written, every time (satisfies FR-006/FR-008's "passes with zero manual
edits" guarantee unconditionally, not just at the moment the generator was
written).

**Alternatives considered**:
- Hardcode versions in the template, add a lint/CI check that fails when
  they drift from `apps/dashboard`'s actual versions — rejected: adds a
  second enforcement mechanism to catch a problem the dynamic-read approach
  makes impossible in the first place; more moving parts for the same
  guarantee.

## D4 — Standalone mode's output location: prompted path, no default inside the repo

**Decision**: When standalone mode is chosen, the generator prompts for an
output path and refuses if it resolves inside the current monorepo (i.e.,
inside the git repository root the generator is running from). No default
path is offered — there is no natural "correct" location for an independent
project the generator has no way to guess (a sibling directory, a path on
another drive, a fresh directory the person will `git init` separately are
all equally plausible).

**Rationale**: Matches FR-016's requirement that standalone output live
"outside this monorepo's `apps/*`" unambiguously, and keeps the refusal in
D4 simple to implement and test: resolve the path, check it does not start
with the repo root, refuse with a specific message if it does.

## D5 — Standalone mode's publish mechanism: real, but never self-triggered

**Decision**: `@changesets/cli` + `.changeset/config.json` targeting GitHub
Packages under this project's package scope, wired into a real
`.github/workflows/publish-packages.yml` that runs `changeset version` /
`changeset publish` — but only on a manually-dispatched or release-tagged
trigger, never on every push to `main` the way the existing `quality` job
does. Nothing this feature's own generation, tests, or CI executes performs
a live publish (FR-019, SC-006).

**Rationale, and why this needed the user's confirmation rather than an
assumption**: `docs/blueprint.html`'s Definition of Done and
`docs/decisions/0013-guard-rails-closed.md` both name dual-mode output —
including standalone's dependency on real published packages — as this
sprint's responsibility, not a future one. But a live publish to a real,
external package registry is a hard-to-reverse action affecting shared
state outside this repository (Anthropic's own operating guidance on
irreversible/external actions applies here as much as to a `git push
--force`). Building the real mechanism without ever having this feature's
own automation invoke it — the option the user chose — satisfies both
constraints: standalone mode is genuinely provable once a maintainer
deliberately runs a first publish with real credentials, and nothing in this
feature's own commits, tests, or CI causes that to happen as a side effect.

**Precedent**: The same shape as ADR-0009 (`packages/auth` ships a real
contract; the real identity provider integration is deliberately left to the
adopter, documented rather than coded). Here, the real contract is the
Changesets/GitHub Packages *mechanism*; the real external integration
(actually publishing, actually authenticating against GitHub Packages) is
deliberately left to a maintainer's explicit action.

**GitHub Packages scope**: `packages/*` are already named `@enterprise-mfe/*`.
GitHub Packages requires a scope to match the owning GitHub org/user exactly,
which is adopter-specific and not something this boilerplate can hardcode to
a real account without being wrong for every adopter but one. `publishConfig.registry`
and `.changeset/config.json` reference the scope via the existing
`@enterprise-mfe` name already in use, with the actual GitHub org/user left
as an adopter-configured value (documented in the new ADR and the
standalone template's `README.md`, per FR-020) — not a placeholder invented
for this feature, but the same open question every adopter already has to
resolve to deploy anything from this boilerplate at all.

## D6 — Dev-registry port assignment: auto-increment from existing entries

**Decision**: `register-dev-remote.ts` reads the current
`remotes.dev.json`, finds the highest port already in use among registered
remotes' `entry` URLs (3001, 3002, ...), and assigns the next one — no
manual port entry required, and no collision possible with an existing
remote.

**Rationale**: The two existing remotes already follow a simple sequential
convention (shell 3000, dashboard 3001, admin 3002). Deriving the next value
avoids adding a prompt for something the existing registry already answers,
and avoids a class of collision bug (two remotes both defaulting to the same
manually-typed port) that a prompt would leave open to human error.

## Resolved unknowns

No `[NEEDS CLARIFICATION]` markers remained after `/speckit-specify`'s own
validation pass. The one open design question surfaced during planning —
how far to build standalone mode's real publish mechanism — was resolved
directly with the user (see D5) rather than guessed, since it involves a
hard-to-reverse action against an external system.

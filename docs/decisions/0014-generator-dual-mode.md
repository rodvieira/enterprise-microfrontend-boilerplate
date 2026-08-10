# 0014 — Generator ships dual-mode, extracted from the two real remotes; the first live publish stays a maintainer's action

**Status:** Accepted

## Context

Sprint 7 (`006-remote-generator`, spec confirmed against `docs/blueprint.html`'s
Definition of Done and ADR-0007/ADR-0008/ADR-0013) builds `pnpm turbo gen
remote`. ADR-0008 requires it be extracted from `apps/dashboard` and
`apps/admin` as they actually are, not designed ahead of them. ADR-0007
commits this project to "a remote can move to its own repository later" —
until this sprint, that claim had never produced any real output to check it
against.

## Decision

1. **Tool: `@turbo/gen`** (Plop under the hood), registered at
   `turbo/generators/config.ts`. `pnpm gen` already ran `turbo gen` since
   sprint 1 with nothing registered — this closes that gap with the
   toolchain the project already committed to, instead of a bespoke
   `inquirer`+`fs` script (research D2).
2. **Extraction, not design**: `templates/common/` holds exactly what
   `apps/dashboard` and `apps/admin` share today (research D1) —
   `src/exposed/`/`src/internal/` split, `bootstrap.tsx`/`index.tsx`
   shape, `rspack.config.ts`'s loader rules and `ModuleFederationPlugin`
   shape, `tsconfig.json`, `postcss.config.mjs`. The blueprint's original
   `federation.config.ts`/`remote.manifest.json` sketch was rejected —
   neither file exists in either real remote.
3. **Two real output modes.** Monorepo mode writes `apps/<name>`,
   workspace-linked, and registers itself in `remotes.dev.json` and
   `docs/architecture.md`. Standalone mode writes an equivalent project
   outside this repository whose `package.json` depends on
   `@enterprise-mfe/*` at published semver ranges instead of `workspace:*`,
   backed by a real Changesets → GitHub Packages publish mechanism
   (`@changesets/cli`, `@changesets/changelog-github`; research D5).
4. **The first live publish is never automatic.** Neither the generator,
   its tests, nor this sprint's CI ever invoke a real `changeset publish`
   against GitHub Packages (FR-019, SC-006) — confirmed with the user
   because a live publish to a real external registry is a hard-to-reverse
   action outside this repository, the same class of action `git push
   --force` is. `.github/workflows/publish-packages.yml` exists and is
   real, but triggers only on `workflow_dispatch` or a `v*` release tag —
   never on the `push`/`pull_request` triggers `ci.yml`'s `quality` job
   already uses. Verified during this sprint by running `changeset status`,
   then `changeset version` locally (bumped `packages/*` to `0.0.1`,
   generated real `CHANGELOG.md` files, cascaded to `apps/*` consumers via
   `updateInternalDependencies`) and reverting every resulting change —
   proving the mechanism works without a network call to the real registry,
   the same precedent ADR-0009 set for `packages/auth`'s stub (real
   contract, real external integration deliberately deferred).
5. **`packages/auth`, `event-bus`, `shared-types`, and `ui` lost
   `"private": true`.** `@changesets/cli` filters every private package out
   of `publish` unconditionally (`publicPackages = packages.filter(pkg =>
   !pkg.packageJson.private)`, checked directly against the installed
   `@changesets/cli` source) — a workflow "real" enough to actually publish
   these four packages could not stay true while they remained private.
   `apps/*` and `packages/config-typescript`/`config-biome` keep
   `"private": true"` and are correctly skipped by `changeset publish`
   without needing `.changeset/config.json`'s `ignore` list at all.
6. **A kebab-case remote name needs a decoupled `library.name`.**
   `ModuleFederationPlugin`'s default `library: { type: 'var' }` requires
   its `name` to be a valid JS identifier — a hyphenated name (this
   project's own convention; `data-model.md`'s own example is
   `user-settings`) is not one. Found by actually running a generated
   remote's `rspack build`, not by inspecting `apps/dashboard`/`apps/admin`
   (whose names happen not to need it). Fixed by setting
   `library: { type: 'var', name: <name with hyphens replaced by
   underscores> } }` — `name` (used by `remotes.dev.json` and `loadRemote`)
   stays kebab-case; only the internal exposed global variable changes.

## What's deliberately not proven yet

- **SC-005** (a generated standalone project's own `pnpm install`/`build`
  succeeding against real published packages) is explicitly **not**
  demonstrated by this sprint's work, per spec: it requires a first real
  publish, which is a maintainer's separate, deliberate action once
  repository publish credentials exist.
- **`packages/*`'s `exports` field points at raw `.ts` source**
  (`"./src/index.ts"`), not a compiled `dist/`. Every consumer inside this
  monorepo already handles that (root `tsconfig.json`, each app's own
  `rspack.config.ts` loader rules). A standalone consumer's bundler
  typically excludes `node_modules` from its loader rules by default (see
  `templates/common/rspack.config.ts.template`'s own `exclude:
  /node_modules/`), so installing these packages from GitHub Packages today
  would resolve correctly but likely fail to build without also adjusting
  that exclusion or adding a real build step to `packages/*`. This sprint's
  scope was the publish *mechanism* (Changesets, registry config,
  `publishConfig`) — not a `packages/*` build pipeline, which nothing in
  `docs/blueprint.html`'s Definition of Done for this sprint names. Noted
  here rather than silently left for whoever runs the first real publish to
  discover as a confusing failure.
- **`turbo/generators/**` is not covered by `pnpm typecheck` or
  `check:boundaries`.** Neither runs against tooling scripts today (the
  existing `scripts/check-shared-deps.ts` is in the same position) —
  `validate.ts` and `shared-versions.ts` carry their own Vitest coverage
  (`turbo/generators/remote/*.test.ts`, registered as the `turbo-generators`
  project in `vitest.config.mts`) instead.

## Consequences

`docs/blueprint.html`'s "Generator produces both monorepo-mode and
standalone-mode output" line is now true against real, generated output —
not an assertion. `apps/dashboard` and `apps/admin` remain the only two
hand-built remotes; every remote after this sprint, in either mode, starts
from `pnpm turbo gen remote`. The four `packages/*` losing `"private":
true"` is a one-time, deliberate change this ADR records — reverting it
would silently make the publish workflow a permanent no-op.

## Related

`specs/006-remote-generator/` — spec, research (D1–D6), data model,
contracts, and quickstart. `docs/decisions/0007-monorepo-and-standalone-parity.md`,
`0008-generator-after-two-remotes.md`, and `0013-guard-rails-closed.md` for
the decisions this sprint closes out.

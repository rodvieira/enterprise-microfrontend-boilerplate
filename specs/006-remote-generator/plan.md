# Implementation Plan: Remote Generator

**Branch**: `006-remote-generator` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-remote-generator/spec.md`

## Summary

`pnpm turbo gen remote` — a Turborepo generator extracted from what
`apps/dashboard` and `apps/admin` actually share, not designed independently
of them (ADR-0008, Constitution Principle V). Two output modes, both real:

- **Monorepo mode** writes `apps/<name>`, workspace-linked, correct by
  construction against every guard rail already enforced
  (`check:boundaries`, `check:shared-deps`), registers itself in the dev
  registry, and adds itself to `docs/architecture.md`.
- **Standalone mode** writes an equivalent, fully independent project
  outside the monorepo whose `package.json` depends on `@enterprise-mfe/*`
  as published packages instead of `workspace:*` — the first real test of
  ADR-0007's "a remote can move to its own repository" claim. This requires
  `packages/*` to be publishable at all, so this sprint also introduces a
  real Changesets-based versioning/publish workflow targeting GitHub
  Packages. That workflow is genuine, working infrastructure; its first live
  publish is a deliberate, separate action outside this sprint's automated
  scope (spec FR-019 — confirmed with the user rather than assumed, since it
  touches a real external registry).

## Technical Context

**Language/Version**: TypeScript 5.9, strict — unchanged.

**Primary Dependencies**:
- `@turbo/gen` (new) — Turborepo's own generator toolkit (Plop under the
  hood); `pnpm gen` already runs `turbo gen`, but no generator has been
  registered under `turbo/generators/` yet. This is the tool the project's
  own tooling stack (Turborepo) expects for this exact job — no alternative
  code-gen framework is justified when the build system already ships one.
- `@changesets/cli` (new) — the publishing engine ADR-0007 names explicitly
  ("Changesets is the publishing engine, not just a changelog tool").
  Needed so `packages/*` have a real version/publish mechanism for
  standalone mode to depend on.
- `@changesets/changelog-github` (new, small) — so changeset changelog
  entries link back to PRs/commits, standard pairing with `@changesets/cli`
  on a GitHub-hosted repo.

Each is a new dependency and gets a one-line justification in the PR
description per Constitution Principle IX; the reasoning above is that
justification, recorded before implementation rather than after.

**Storage**: N/A.

**Testing**: Vitest for the generator's own logic (name/route validation,
port assignment, version-sync from an existing manifest) under
`turbo/generators/remote/*.test.ts`, picked up by the existing root
`vitest run`. Validation of actual generated output happens by running the
generator against a throwaway name and then running the workspace's real
gates (`build`, `test`, `check:boundaries`, `check:shared-deps`) against
that output — a scripted smoke path (`quickstart.md`), not a new permanent
fixture in `apps/shell/e2e/` (a generated-and-deleted app has no business
being a long-lived e2e dependency).

**Target Platform**: Node 22 (existing `engines` constraint), `ubuntu-latest`
for the new publish workflow's CI half.

**Project Type**: Monorepo tooling. No new `apps/*` entry from this sprint's
own work (generated remotes are the *output*, not part of this feature's
source). New: `turbo/generators/`, `.changeset/`, one new CI workflow.

**Performance Goals**: No numeric target. Generation is interactive,
few-second-scale codegen — not a hot path.

**Constraints**:
- Generated `package.json` shared-dependency versions MUST be read from an
  existing source of truth at generation time (e.g. `apps/dashboard`'s own
  `package.json`), not hardcoded into a template file — a template with
  baked-in version strings would silently drift the moment the real
  versions move, defeating FR-006/FR-008's "passes `check:shared-deps` with
  zero edits" guarantee. See research D3.
- All validation (name, route, output-mode-specific checks) happens before
  any file write (FR-014) — partial-write recovery is handled by refusing
  to proceed over a pre-existing partial output directory (edge case),
  not by attempting rollback.
- No step in this feature's own build, test, or CI may perform a live
  publish to the real GitHub Packages registry (FR-019, SC-006).

**Scale/Scope**: One Turborepo generator (~10–15 template files extracted
from the two existing remotes' actual shared shape), one Changesets config,
one new CI workflow, one doc-append mechanism, one registry-append
mechanism. Zero new `packages/*` or `apps/*` entries committed by this
feature itself.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | **Yes** | ✅ | The generator's own output is what must satisfy this (FR-003, FR-007) — templates place federation-exported code under `src/exposed/` and everything else under `src/internal/`, extracted from the real split `apps/dashboard`/`apps/admin` already use. |
| II — No Cross-App Relative Imports | **Yes** | ✅ | Templates never reference another app by path; standalone-mode output has no other app to relatively import in the first place. |
| III — Singleton Shared Dependencies | **Yes** | ✅ | FR-006 requires exact-match versions against `scripts/check-shared-deps.ts`'s `SINGLETONS`. Design constraint above (research D3) makes this read dynamically from an existing manifest instead of a hardcoded template value, so it can't silently drift. |
| IV — Conventions Documented, Never Assumed | **Yes** | ✅ | `docs/architecture.md` gains the new remote (FR-011). `docs/how-to-add-a-remote.md` is explicitly **not** created here — blueprint §15 places it in sprint 8, and inventing it early would document a convention ahead of the sprint that owns it. |
| V — Generator Extracted From Two Real Remotes | **Yes — the sprint's central gate** | ✅ | FR-001 requires the templates be extracted from `apps/dashboard`/`apps/admin` as they exist today (research D1 records the actual diff). `remote.manifest.json` from the original blueprint sketch is deliberately **not** produced — neither real remote has one; inventing it now would violate this exact principle by designing from the blueprint instead of the real code. |
| VI — Auth Is a Contract, Not an Implementation | No | ✅ | Untouched by this feature; cited only as precedent (research D5) for how FR-019 treats standalone-mode publishing — real mechanism, external credential wiring deliberately deferred. |
| VII — Decisions Superseded, Never Rewritten | **Yes** | ✅ | New choices this sprint makes (generator tool choice, Changesets/GitHub Packages scope handling, no-live-publish boundary) are recorded in a new ADR, not by editing ADR-0007/0008/0012. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scope `repo` (generator infra, CI, ADR) is already in `commitlint.config.mjs`'s allow-list; no new scope needed since this feature adds no new `packages/*` or `apps/*` of its own. |
| IX — Every Dependency Justified | **Yes — three new dependencies** | ✅ | `@turbo/gen`, `@changesets/cli`, `@changesets/changelog-github` — each justified above (Primary Dependencies) and again, verbatim, in the PR description. |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking stays empty.

**Re-checked after Phase 1 design: PASS**, unchanged — research and data
model introduced no new package, no cross-app import, and no additional
dependency beyond the three already justified above.

## Project Structure

### Documentation (this feature)

```text
specs/006-remote-generator/
├── plan.md                          # This file
├── spec.md                          # Feature specification
├── research.md                      # Phase 0 — decisions D1–D6
├── data-model.md                    # Phase 1 — entities this feature produces
├── contracts/
│   ├── generator-contract.md        # prompts → output guarantee, both modes
│   └── package-publish-contract.md  # what a packages/* manifest needs for standalone mode to resolve it
├── quickstart.md                    # Phase 1 — how to validate both modes
├── checklists/
│   └── requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
turbo/generators/
├── config.ts                        # registers the "remote" generator with @turbo/gen
└── remote/
    ├── prompts.ts                   # name, route, label, mode — validated before any write (FR-002, FR-014)
    ├── validate.ts                  # name/route/collision rules (FR-004, FR-012, FR-013), unit-tested
    ├── shared-versions.ts           # reads SINGLETONS versions from apps/dashboard/package.json at gen time (research D3)
    ├── shared-versions.test.ts
    ├── validate.test.ts
    ├── templates/
    │   ├── common/                  # files identical across both modes (src/exposed/App.tsx, src/internal/, rspack.config.ts shape, tsconfig.json, postcss, index.html)
    │   ├── monorepo/                # package.json (workspace:* deps), no registry config
    │   └── standalone/               # package.json (published-version deps), .npmrc pointing at GitHub Packages, README prerequisites (FR-020)
    └── actions/
        ├── write-app.ts             # renders templates/common + templates/<mode> into the target directory
        ├── register-dev-remote.ts   # monorepo mode only: appends remotes.dev.json entry + allowedOrigins (FR-009), assigns next free dev port
        └── update-architecture-docs.ts  # monorepo mode only: appends one line to docs/architecture.md "Remotes" section (FR-011)

.changeset/
├── config.json                      # @changesets/cli config: GitHub Packages registry, @enterprise-mfe scope, linked packages
└── README.md                        # generated by `changeset init`

.github/workflows/
└── publish-packages.yml             # new: Changesets version/publish workflow (FR-018) — manually triggered / on release, never on every push (FR-019, SC-006)

packages/*/package.json              # gains `publishConfig.registry` pointing at GitHub Packages (needed for a real publish to resolve at all — no behavior change until a publish actually runs)

docs/architecture.md                 # "Remotes" section gains one line per monorepo-mode generation (FR-011); this feature's own commit adds one line for itself demonstrating the mechanism

docs/decisions/
└── 0014-generator-dual-mode.md      # new ADR: tool choices (@turbo/gen, Changesets), GitHub Packages scope handling, the no-live-publish boundary — records what this sprint decided, per Constitution Principle VII
```

**Structure Decision**: `turbo/generators/remote/` is the generator itself —
Turborepo auto-discovers `turbo/generators/config.ts`, so no change to
`turbo.json` is needed. `templates/common/` holds everything the diff between
`apps/dashboard` and `apps/admin` shows as identical (research D1); only
`package.json` and registry/publish configuration differ by mode, so those
alone split into `templates/monorepo/` and `templates/standalone/`. Actions
are separated from template rendering so `register-dev-remote.ts` and
`update-architecture-docs.ts` — the two file-mutation steps outside the
generated app itself — stay independently testable and skippable in
standalone mode, rather than being inlined into one large generator script.

**Build order within the feature** (dependency order, not priority order):

1. `turbo/generators/remote/validate.ts` and `shared-versions.ts` — pure
   logic, unit-testable in isolation, nothing else depends on them existing
   first.
2. `templates/common/` + `templates/monorepo/` + `write-app.ts` — enough to
   satisfy User Story 1 end to end (a monorepo-mode remote that builds).
3. `register-dev-remote.ts` + `update-architecture-docs.ts` — User Story 4's
   wiring, added once User Story 1's output exists to register.
4. Re-run every workspace gate against a generated throwaway remote and fix
   any drift — closes User Story 2.
5. `.changeset/config.json` + `packages/*` `publishConfig` + `templates/standalone/` +
   `publish-packages.yml` — User Story 3. Built last because standalone
   mode's correctness can only be demonstrated once packages are at least
   *configured* to be publishable, and because it is the one piece this
   sprint deliberately does not exercise against the real registry
   (FR-019) — sequencing it last keeps that boundary easy to see in the
   commit history, one commit per story like `005-guard-rails`.
6. `docs/decisions/0014-generator-dual-mode.md` — written last, once
   everything it needs to point to exists.

## Complexity Tracking

No constitutional violations. Nothing to justify.

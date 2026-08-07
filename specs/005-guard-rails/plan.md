# Implementation Plan: Guard Rails

**Branch**: `005-guard-rails` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-guard-rails/spec.md`

## Summary

Verification and CI enforcement, not new mechanism. The constitution's three
named guard rails (`pnpm check:boundaries`, `pnpm check:shared-deps`, the
remote-load error boundary) were already built across sprints 2, 3, and 5.
This sprint closes the one real gap — the error boundary has only ever been
proven against simulated failures — and wires the one documented gate CI
doesn't yet run (`pnpm e2e`), then records the phase as closed with a new
ADR rather than leaving "is guard rails done?" to commit archaeology.

The one design decision that changed mid-plan: the spec's own guess for how
to produce a "genuinely unreachable" remote (stopping a dev server process)
turned out to be actively hazardous once checked against how the e2e suite
actually runs — `fullyParallel: true` against dev servers shared for the
whole run means killing one would break every other concurrently-running
test. Browser-level network interception (`page.route(...).abort()`)
produces the same real `fetch()` failure without that blast radius. See
research D1.

## Technical Context

**Language/Version**: TypeScript 5.9, strict — unchanged. No new runtime
code; this sprint's surface is a CI workflow step, one e2e spec file, and a
markdown ADR.

**Primary Dependencies**: None new. `@playwright/test` (already a
dependency of `apps/shell` since `003-dashboard-remote`) is what CI now
also installs and runs.

**Storage**: N/A.

**Testing**: Playwright, extending the existing `apps/shell/e2e/` suite
with one real-failure scenario.

**Target Platform**: `ubuntu-latest` GitHub Actions runner, for the CI half
of this work; evergreen browsers (Chromium, matching the existing suite),
unchanged for the e2e half.

**Project Type**: Monorepo — no new app or package. Changes: one CI
workflow file, one new e2e spec, one new ADR.

**Performance Goals**: No numeric target. CI runtime grows by
`pnpm e2e`'s wall-clock time (research D3); not expected to be the
pipeline's bottleneck.

**Constraints**: The real-failure e2e scenario must not affect other tests
running in the same `fullyParallel` suite (research D1). CI's Playwright
install must not add unnecessary browser downloads (research D2).

**Scale/Scope**: 1 CI workflow step, 1 new e2e spec file (~3 scenarios), 1
new ADR. Zero new dependencies, zero new packages, zero new apps.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | No | ✅ | No app or package source changes beyond one e2e spec file and one line in `apps/shell/src/exposed/App.tsx` at most (only if a real bug surfaces — not expected, see Assumptions). |
| II — No Cross-App Relative Imports | No | ✅ | Nothing new to violate this. |
| III — Singleton Shared Dependencies | No | ✅ | No dependency changes at all this sprint. |
| IV — Conventions Documented, Never Assumed | **Yes** | ✅ | The closing ADR (D4) is exactly this principle applied to a whole project phase, not just one convention. |
| V — Generator After Two Remotes | **Yes, the guard this sprint respects** | ✅ | `FR-011` explicitly rules out starting the generator's dual-mode output this sprint, even though both remotes now exist — that decision belongs to sprint 7, and starting it here would violate this principle directly. |
| VI — Auth Is a Contract, Not an Implementation | No | ✅ | Untouched. |
| VII — Decisions Superseded, Never Rewritten | **Yes** | ✅ | The closing record is a **new** ADR (`0013-guard-rails-closed.md`), not an edit to ADR-0007 or ADR-0008. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scope `repo` (CI config, ADR) and `shell` (the new e2e spec) are both already in `commitlint.config.mjs`'s allow-list. |
| IX — Every Dependency Justified | **Yes — zero new dependencies** | ✅ | Nothing added. `@playwright/test` already exists as a dependency; CI installing its browser binary is not a new dependency. |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-guard-rails/
├── plan.md                          # This file
├── spec.md                          # Feature specification
├── research.md                      # Phase 0 — decisions D1–D4
├── quickstart.md                    # Phase 1 — how to validate
├── checklists/
│   └── requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks — not created here)
```

No `data-model.md` or `contracts/` — this feature introduces no new domain
entity and no new public API surface (research.md, final section).

### Source Code (repository root)

```text
.github/workflows/ci.yml             # gains: Playwright browser install + "pnpm e2e" step

apps/shell/e2e/
└── remote-failure.spec.ts           # new: real (network-intercepted) remote failure, US1

docs/decisions/
└── 0013-guard-rails-closed.md       # new: the closing record, US3
```

**Structure Decision**: The new e2e spec lives alongside
`dashboard-composition.spec.ts` and `admin-composition.spec.ts` in the
existing `apps/shell/e2e/` directory — same suite, same `playwright.config.ts`,
no parallel test infrastructure introduced. The CI change is one step
inserted into the existing single `quality` job (research D3), not a new
workflow file. The ADR follows the existing `docs/decisions/NNNN-*.md`
numbering and format exactly.

**Build order within the feature**:

1. `apps/shell/e2e/remote-failure.spec.ts` — written and run first, since
   it's the one scenario with any real risk of surfacing an actual bug
   (Assumptions: "if a real failure exposes a bug the simulated tests
   missed, that bug fix is in scope").
2. `.github/workflows/ci.yml` — add the Playwright install + `pnpm e2e`
   step once the new scenario (and the existing suite) are known-green
   locally.
3. Prove CI actually enforces it: push, confirm green; the "deliberately
   break a scenario" proof from `quickstart.md` §2 is done on a scratch
   branch, not committed to this feature.
4. `docs/decisions/0013-guard-rails-closed.md` — written last, once
   everything it needs to point to (including this sprint's own commits)
   exists to point to.

## Complexity Tracking

No constitutional violations. Nothing to justify.

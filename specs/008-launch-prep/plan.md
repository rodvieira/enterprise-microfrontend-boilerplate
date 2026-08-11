# Implementation Plan: Launch Prep

**Branch**: `008-launch-prep` | **Date**: 2026-08-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-launch-prep/spec.md`

## Summary

Prepares the three launch artifacts that live entirely in version control:
a rewritten `README.md` (real content, one clearly-marked placeholder
section for the demo GIF/live URLs), a complete, publication-ready draft
of the blueprint's one named technical post (the exposed/internal boundary
decision), and `docs/how-to-deploy.md` (the real build/deploy mechanics,
host-agnostic). Re-confirms the Portfolio DoD items closed in prior
sprints are still true. Explicitly does not perform the actual deploy,
record the GIF, pin the repository, or publish anything externally — all
four are the maintainer's own action, confirmed with the user before
scoping this sprint down to exclude them.

## Technical Context

**Language/Version**: Markdown content; no code changes to `apps/*` or
`packages/*`.

**Primary Dependencies**: None new. This sprint writes documentation and
verifies it against the existing, real codebase — no package, no CI
change.

**Storage**: N/A.

**Testing**: No unit tests (no code changes). Verification is running the
real commands `docs/how-to-deploy.md` documents (`FEDERATION_ENV=production
pnpm build` for the shell and one remote) and confirming the output matches
what's documented — the same "quickstart.md as the real test" pattern
`006-remote-generator` and `007-docs-security` both used for
non-code-shaped requirements.

**Target Platform**: N/A — documentation only.

**Project Type**: Documentation. Touches `README.md`, one new content file
for the technical post, and `docs/how-to-deploy.md`.

**Performance Goals**: N/A.

**Constraints**:
- No real production deploy, GIF recording, repo pin, or external publish
  may occur as a side effect of this sprint (FR-008, confirmed with the
  user).
- Every factual claim in the technical post about this project's own
  architecture must be verified against real code/ADRs during this sprint,
  not written from memory (FR-004).
- `docs/how-to-deploy.md` must not imply a live deployment exists —
  `remotes.staging.json`/`remotes.production.json` currently have empty
  `remotes` arrays, a real, current fact to state plainly (FR-006).

**Scale/Scope**: One README rewrite, one new long-form content file, one
new how-to doc. Zero new dependencies, zero CI changes, zero `apps/*`/
`packages/*` changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | No (documented, not touched) | ✅ | The technical post explains this principle for an external reader; nothing in this sprint changes any app's actual `exposed/`/`internal/` split. |
| II — No Cross-App Relative Imports | No | ✅ | No code changes. |
| III — Singleton Shared Dependencies | No | ✅ | No dependency changes. |
| IV — Conventions Documented, Never Assumed | **Yes** | ✅ | `docs/how-to-deploy.md` documents a real mechanism (`FEDERATION_ENV`) that existed but was undocumented outside ADR-0012's own prose — closing exactly this kind of gap is what this principle is for. |
| V — Generator Extracted From Two Real Remotes | No | ✅ | Untouched. |
| VI — Auth Is a Contract, Not an Implementation | No | ✅ | Untouched; not this sprint's subject. |
| VII — Decisions Superseded, Never Rewritten | No | ✅ | This sprint records no new architectural decision — it documents and writes about decisions already recorded (ADR-0006, ADR-0007, ADR-0012). No ADR is added or edited. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scope `docs` (already in `commitlint.config.mjs`'s allow-list) for all three deliverables. |
| IX — Every Dependency Justified | N/A | ✅ | Zero new dependencies. |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking stays empty.

**Re-checked after Phase 0 research: PASS**, unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/008-launch-prep/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — decisions D1–D2
├── quickstart.md          # Phase 1 — how to verify every FR
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks — not created here)
```

No `data-model.md` or `contracts/` — this feature has no runtime domain
data or external interface, the same reasoning `005-guard-rails` and
`007-docs-security` already applied.

### Source Code (repository root)

```text
README.md                                     # rewritten (FR-001, FR-002)
docs/
├── posts/
│   └── exposed-internal-boundary.md          # new — the technical post draft (FR-003, FR-004)
└── how-to-deploy.md                          # new (FR-005, FR-006)
```

**Structure Decision**: The technical post draft lives under `docs/posts/`
— a new, small subdirectory distinct from `docs/decisions/` (internal
decision records, not written for an external readership) and from the
other `docs/*.md` reference/how-to files (contributor- or adopter-facing,
not blog-voice). `docs/how-to-deploy.md` sits alongside
`docs/how-to-connect-sso.md` and `docs/how-to-add-a-remote.md`, matching
the flat how-to-doc convention `007-docs-security` already established —
no new subdirectory needed for a single file fitting an existing pattern.

## Complexity Tracking

No constitutional violations. Nothing to justify.

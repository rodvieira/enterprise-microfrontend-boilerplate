# Implementation Plan: Docs + Security

**Branch**: `007-docs-security` | **Date**: 2026-08-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-docs-security/spec.md`

## Summary

Closes the blueprint's sprint-8 Security and Documentation gaps before
launch (sprint 9): real automated dependency/CVE scanning beyond the
existing `pnpm audit` (Dependabot + a CVE scanner + Socket, research D2/D3),
a build-time Content-Security-Policy whose `script-src` is derived from the
same `remotes.<env>.json` `allowedOrigins` the shell already enforces at the
application level (research D1), the two how-to docs `CLAUDE.md` already
references but that don't yet exist, plus a third (`docs/auth-strategy.md`)
discovered missing during specification, and a one-time audit matching
blueprint §2's ten decisions against `docs/decisions/*.md`.

## Technical Context

**Language/Version**: TypeScript 5.9, strict — unchanged. Markdown for docs/config.

**Primary Dependencies**:
- No new npm package. Dependabot is native to GitHub (a config file, not a
  dependency). The CVE/supply-chain scanners run as GitHub Actions steps
  (`google/osv-scanner-action`, `socket-security/socket-security-action` or
  equivalent), not installed into `package.json` (research D2/D3).
- CSP generation reuses `@rspack/core`'s `HtmlRspackPlugin` (already a
  transitive dependency via `@rspack/cli`) — no new dependency (research D1).

**Storage**: N/A.

**Testing**: `resolveCspScriptSrc` (or equivalent pure function deriving
`script-src` from an `allowedOrigins` array) is unit-tested under
`apps/shell/src/internal/**/*.test.ts`, the same pattern
`resolve-registry-source.ts` already uses. Real CSP presence is verified by
building the shell and inspecting the emitted `index.html` (quickstart.md),
not a new Playwright fixture — this is a build-output shape, not runtime
behavior `apps/shell/e2e/` already covers differently.

**Target Platform**: `ubuntu-latest` for the new CI scanning steps — same as
every existing `ci.yml` step.

**Project Type**: Monorepo tooling + documentation. No new `apps/*` or
`packages/*`. Touches `apps/shell/rspack.config.ts` and `index.html`,
`.github/` (new Dependabot config, new/extended CI steps), and `docs/`.

**Performance Goals**: N/A — build-time config generation and CI steps, not
a runtime hot path.

**Constraints**:
- The CSP's `script-src` MUST be derived from the same `allowedOrigins`
  array `origin-guard.ts` already reads from `remotes.<env>.json` — never a
  second, independently-maintained list (FR-004, spec edge case on drift).
- The new CI scanning step(s) MUST NOT silently inherit `pnpm audit`'s
  `continue-on-error: true` without that being a deliberate, stated choice
  for the new tool specifically (FR-003).
- Local dev (`pnpm dev`, `http://localhost` origins) MUST keep working under
  the CSP — loopback's existing HTTPS exemption in `origin-guard.ts` is the
  precedent the CSP must not be stricter than.

**Scale/Scope**: One Dependabot config file, one or two new CI steps, one
CSP-generation mechanism in `apps/shell`'s existing build (+ its unit test),
three new docs files, one ADR-coverage audit recorded either as its own ADR
or as a table in this plan's research. Zero new `apps/*`/`packages/*`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | No | ✅ | No new app surface; the CSP-generation helper lives under `apps/shell/src/internal/federation/` alongside `resolve-registry-source.ts`, which it directly parallels. |
| II — No Cross-App Relative Imports | No | ✅ | Nothing here imports across `apps/*`. |
| III — Singleton Shared Dependencies | No | ✅ | No new shared runtime package; CI-only tooling and build-time config generation don't touch `SINGLETONS`. |
| IV — Conventions Documented, Never Assumed | **Yes — the sprint's core** | ✅ | This sprint *is* closing documented-but-missing convention gaps (the three how-to docs) and auditing that every blueprint §2 decision actually has an ADR, rather than assuming either. |
| V — Generator Extracted From Two Real Remotes | No | ✅ | Untouched; `docs/how-to-add-a-remote.md` documents the already-built generator (006), doesn't change it. |
| VI — Auth Is a Contract, Not an Implementation | **Yes** | ✅ | `docs/how-to-connect-sso.md`/`docs/auth-strategy.md` document the existing stub contract and integration path — this sprint does not add a real identity-provider integration (spec Assumptions), preserving ADR-0009's decision rather than reopening it. |
| VII — Decisions Superseded, Never Rewritten | **Yes** | ✅ | Any decision this sprint's own research makes (scanner choice, CSP mechanism) gets a new ADR; no existing ADR (0001–0014) is edited. The §2 coverage audit fills genuine gaps, it doesn't rewrite what's already there. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scope `repo` (CI/CSP infra) and `docs` (the three how-to docs, ADR, architecture updates) are both already in `commitlint.config.mjs`'s allow-list. |
| IX — Every Dependency Justified | Conditionally | ✅ | No new `package.json` dependency (CSP reuses an existing transitive dep; scanners run as CI Actions). If planning's research concludes a CLI tool needs installing after all, it will be justified here before implementation, same discipline as 006. |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking stays empty.

**Re-checked after Phase 0 research: PASS**, unchanged — research confirmed
no new dependency is needed (research D2/D3 use GitHub Actions directly) and
no new package boundary is introduced.

## Project Structure

### Documentation (this feature)

```text
specs/007-docs-security/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — decisions D1–D4
├── quickstart.md         # Phase 1 — how to verify every FR
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks — not created here)
```

No `data-model.md` or `contracts/` — like `005-guard-rails` (also an
infra/config-shaped sprint), this feature has no runtime domain data or
external interface to model; its "entities" (a Dependabot config, a CI
step, a CSP meta tag, three docs files, an ADR audit) are described
sufficiently by spec.md's Key Entities and this plan's Project Structure.

### Source Code (repository root)

```text
.github/
├── dependabot.yml                      # new — pnpm/npm + github-actions ecosystems (research D2)
└── workflows/
    └── ci.yml                          # extended: new CVE-scan + Socket steps in the existing quality job (research D3)

apps/shell/
├── rspack.config.ts                    # passes a computed CSP into HtmlRspackPlugin's own `meta` option — index.html itself is untouched (research D1)
└── src/internal/federation/
    ├── build-csp.ts                    # new: pure fn, allowedOrigins[] -> script-src string (research D1)
    └── build-csp.test.ts

docs/
├── how-to-connect-sso.md               # new (FR-007)
├── auth-strategy.md                    # new (FR-008)
├── how-to-add-a-remote.md              # new (FR-009)
└── decisions/
    └── 0015-*.md                       # new: research D1–D3 decisions + the §2 ADR-coverage audit result (FR-010)
```

**Structure Decision**: The CSP-generation helper (`build-csp.ts`) lives
beside `resolve-registry-source.ts` under
`apps/shell/src/internal/federation/` because it reads the exact same
resolved registry file that module already locates — same directory, same
"pure function, unit-tested directly" pattern research already established
in `002-shell-host`. No new `packages/*` is justified for one small pure
function used by exactly one app. The three docs files are adopter-facing
how-tos, distinct from `docs/architecture.md` (contributor-facing reference)
— matching the existing split already visible in `docs/`.

## Complexity Tracking

No constitutional violations. Nothing to justify.

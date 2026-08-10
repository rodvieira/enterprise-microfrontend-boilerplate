---

description: "Task list for Docs + Security"
---

# Tasks: Docs + Security

**Input**: Design documents from `/specs/007-docs-security/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: `build-csp.ts` gets a unit test (US2) — the same "pure function,
unit-tested directly" pattern `resolve-registry-source.ts` already
established. No tests are generated for the docs/ADR stories (US3, US4) or
for the CI-config stories (US1) — a `.github/dependabot.yml` and new CI
steps are validated by `quickstart.md`'s real checks (does GitHub recognize
it, does the workflow run), not a unit test.

**Organization**: Grouped by the four user stories from spec.md. All four
are independent of each other — no story's files overlap with another's, so
there is no blocking Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task names an exact file path

---

## Phase 1: Setup

No new dependency, no shared scaffolding step blocks more than one story
(research D1–D3 confirmed no new `package.json` entry is needed). Each user
story phase below is self-contained.

---

## Phase 2: User Story 1 - A security reviewer sees real, enforced dependency scanning (Priority: P1)

**Goal**: Dependabot is active for this repo, and CI runs a real CVE scanner
(OSV-Scanner) plus a supply-chain scanner (Socket) alongside the existing
`pnpm audit`, each with a deliberately stated failure policy.

**Independent Test**: Inspect `.github/dependabot.yml` for both ecosystems;
inspect `.github/workflows/ci.yml` for both new steps on the existing
`push`/`pull_request` triggers, each with an explicit `continue-on-error`
value and a comment stating why.

### Implementation for User Story 1

- [X] T001 [P] [US1] `.github/dependabot.yml` — `npm` (root `/`, pnpm-lockfile-aware) and `github-actions` ecosystem entries (FR-001, research D2)
- [X] T002 [US1] `.github/workflows/ci.yml` — add an `osv-scan` job calling OSV-Scanner's reusable workflow (`google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@v2.5.0`), `fail-on-vuln: false` with a comment stating why (mirrors `pnpm audit`'s own stated reasoning, arrived at independently) (FR-002, FR-003, research D3)
- [X] T003 [US1] `.github/workflows/ci.yml` — add a `socket-security` job (Socket's CLI-based integration), `continue-on-error: true`, with a comment stating it requires a `SOCKET_SECURITY_API_KEY` secret this repo doesn't have yet — real mechanism, external credential deliberately left to a maintainer (research D3, same pattern as 006's GitHub Packages publish) (FR-002, FR-003)
- [X] T004 [US1] `quickstart.md` §1–2: confirm `dependabot.yml`'s structure and both new CI steps' triggers/failure policy — real check, not inspection-only

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 3: User Story 2 - The shell enforces a CSP matching its own origin allow-list (Priority: P1)

**Goal**: The shell's built `index.html` carries a `Content-Security-Policy`
meta tag whose `script-src` is derived from the same `allowedOrigins` array
`origin-guard.ts` already enforces — for every environment, never a second
hand-maintained list.

**Independent Test**: Build the shell for `dev`, `staging`, and `production`
`FEDERATION_ENV` values; confirm each build's CSP `script-src` matches that
environment's own `remotes.<env>.json` `allowedOrigins` exactly.

### Implementation for User Story 2

- [X] T005 [P] [US2] `apps/shell/src/internal/federation/build-csp.ts` — pure function: `allowedOrigins: readonly string[] -> script-src string` (`'self'` plus each origin) (FR-004, research D1)
- [X] T006 [P] [US2] `apps/shell/tests/build-csp.test.ts` — unit tests: empty list, one origin, multiple origins, no duplicate/malformed output
- [X] T007 [US2] `apps/shell/rspack.config.ts` — read the resolved registry file's `allowedOrigins` (same file `CopyRspackPlugin` already copies) and pass `build-csp.ts`'s output into `HtmlRspackPlugin`'s `meta` option as `{ 'Content-Security-Policy': { 'http-equiv': 'Content-Security-Policy', content: ... } }` — `index.html` itself stays untouched (FR-004, FR-005, research D1)
- [X] T008 [US2] `quickstart.md` §3: build the shell for `dev`/`staging`/`production`, confirm each emitted `index.html`'s CSP matches that environment's `allowedOrigins`, and confirm `pnpm dev` still composes dashboard/admin locally under the CSP (FR-005, FR-006)

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 4: User Story 3 - An adopter finds the two how-to docs the project already promises (Priority: P1)

**Goal**: `docs/how-to-connect-sso.md`, `docs/auth-strategy.md`, and
`docs/how-to-add-a-remote.md` all exist and substantively answer the
question `CLAUDE.md`/the blueprint already implies they answer.

**Independent Test**: Follow each pointer from `CLAUDE.md` (or the
blueprint, for the third) and confirm the target file exists and is
substantive, not a stub.

### Implementation for User Story 3

- [X] T009 [P] [US3] `docs/how-to-connect-sso.md` — how to replace `packages/auth`'s stub with a real identity provider; what the `useAuth()`/`<ProtectedRoute>`/`<AuthProvider>` contract requires of a real implementation; links to ADR-0009 (FR-007)
- [X] T010 [P] [US3] `docs/auth-strategy.md` — the auth contract's strategy, at the level `CLAUDE.md`'s existing reference implies (FR-008)
- [X] T011 [P] [US3] `docs/how-to-add-a-remote.md` — documents `pnpm turbo gen remote` (006) as the default path, and the manual convention (`apps/dashboard`/`apps/admin`'s own structure) a hand-built remote must still match (FR-009)
- [X] T012 [US3] `quickstart.md` §4: confirm all three files answer their implied question, not just that they exist

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 5: User Story 4 - Every named decision has a real ADR, confirmed by audit (Priority: P2)

**Goal**: `docs/decisions/*.md` has a 1:1 match against blueprint §2's ten
decisions, and `CONTRIBUTING.md`/`CODE_OF_CONDUCT.md` are confirmed (not
assumed) to satisfy the DoD's Portfolio checklist line.

**Independent Test**: Re-run research D4's comparison after this phase and
confirm zero gaps remain.

### Implementation for User Story 4

- [X] T013 [P] [US4] `docs/decisions/0004-react-typescript-tailwind.md` — records blueprint §2 item 04 (React 19 + TypeScript strict + Tailwind CSS), backfilled into its reserved number (research D4)
- [X] T014 [P] [US4] `docs/decisions/0005-pnpm-turborepo.md` — records blueprint §2 item 05 (pnpm workspaces + Turborepo, Plop-based generators over Nx), backfilled into its reserved number (research D4)
- [X] T015 [US4] `docs/decisions/0015-docs-security-closed.md` — records this sprint's own decisions (D1 CSP mechanism, D2 Dependabot, D3 OSV-Scanner + Socket) and the §2 coverage audit result (research D1–D4, FR-010)
- [X] T016 [US4] Confirm `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` satisfy the DoD's Portfolio checklist line; edit either only if a real gap is found, not by default (FR-011)
- [X] T017 [US4] `quickstart.md` §5: re-run the §2-vs-`docs/decisions/` comparison and confirm a 1:1 match

**Checkpoint**: All four user stories are independently functional. Every
DoD line this sprint targets is closed.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] `docs/architecture.md` — one short mention of the CSP mechanism (where it's generated, what it's derived from), matching the existing "Remote loading"/"Boundary enforcement" section style
- [X] T019 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm check:boundaries`, `pnpm check:shared-deps`, `pnpm e2e` in sequence — confirm all seven exit `0`
- [X] T020 Push the branch and confirm the two new CI steps (T002, T003) actually run and report in a real GitHub Actions run — not just locally
- [X] T021 Write the pull request description
- [X] T022 Review the diff against `.claude/agents/pr-reviewer.md`'s checks before opening the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Empty — nothing blocks any story.
- **Phases 2–5 (US1–US4)**: Fully independent of each other; any order,
  or all four in parallel by different contributors.
- **Phase 6 (Polish)**: Last — needs every prior phase's real output
  (T019's full gate run, T020's real CI confirmation) to be meaningful.

### Parallel Opportunities

- T001 (US1), T005+T006 (US2), T009+T010+T011 (US3), and T013+T014 (US4)
  are all independent files and can be built together by up to four
  contributors.
- Within US2, T005/T006 (the pure function + its test) can be written
  before T007 (wiring it into `rspack.config.ts`) needs to exist, but T007
  itself is sequential after them (it imports `build-csp.ts`).

### Commit discipline

Per user story, scoped per `commitlint.config.mjs`'s allow-list: `repo` for
`.github/`, `apps/shell/rspack.config.ts`, and `build-csp.ts` (US1, US2);
`docs` for the three how-to docs, the two backfilled ADRs, the closing ADR,
and the `docs/architecture.md` mention (US3, US4, T018). Matches
`006-remote-generator`'s per-phase commit pattern.

---

## Implementation Strategy

### MVP scope

Any single user story is independently shippable — there is no MVP subset
smaller than "pick one." US1 and US2 are both P1 and both close a named,
still-open DoD Security line; US3 is P1 because `CLAUDE.md` already
references files that don't exist. US4 is P2 — a completeness audit, valued
once the rest exists to audit truthfully.

### Incremental delivery

1. Phase 2 (US1) → Dependabot + real CI scanning, independently mergeable.
2. Phase 3 (US2) → CSP, independently mergeable.
3. Phase 4 (US3) → the three how-to docs, independently mergeable.
4. Phase 5 (US4) → ADR backfill + audit record, independently mergeable
   (and most honest done last, once US1–US3's own decisions exist to be
   recorded in the closing ADR).
5. Phase 6 → full gate run, real CI confirmation, PR.

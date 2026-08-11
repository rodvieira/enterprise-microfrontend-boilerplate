---

description: "Task list for Launch Prep"
---

# Tasks: Launch Prep

**Input**: Design documents from `/specs/008-launch-prep/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: None — this feature is documentation content, no code changes.
Verification is `quickstart.md`'s real commands (build output inspection,
claim-checking against source), not a unit/e2e suite.

**Organization**: Grouped by the four user stories from spec.md. All are
independent — different files, no shared prerequisite beyond reading the
real source each deliverable describes.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

None — no new tooling, no scaffolding step shared across stories.

---

## Phase 2: User Story 1 - A first-time visitor understands the project without reading the blueprint (Priority: P1)

**Goal**: `README.md` replaces its stub with real content and exactly one
correctly-scoped placeholder section.

**Independent Test**: Read only `README.md`; confirm it answers what/why/
how-to-run/where-to-go-deeper, and the quick start matches real commands.

- [X] T001 [US1] Rewrite `README.md`: project description, why it exists, architecture summary, `pnpm install && pnpm dev` quick start, links to `docs/blueprint.html`/`docs/architecture.md`/`docs/decisions/` (FR-001)
- [X] T002 [US1] `README.md` — add one clearly-marked "Demo & live URLs" section noting both are pending a real deploy/recording, not scattered placeholders (FR-002)
- [X] T003 [US1] `quickstart.md` §1: confirm the README's own quick-start commands match reality by actually running them

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 3: User Story 2 - The technical post exists as a complete, publishable draft (Priority: P1)

**Goal**: `docs/posts/exposed-internal-boundary.md` is a complete, accurate, standalone draft.

**Independent Test**: Read the draft alone; verify its three concrete
claims against the real source (research D2).

- [X] T004 [US2] `docs/posts/exposed-internal-boundary.md` — full draft: the problem (MF prescribes no structure), the decision (ADR-0006), enforcement (dependency-cruiser, ADR-0007), and the three verified real details from research D2 (FR-003)
- [X] T005 [US2] Verify every factual claim in the draft against real source: `.dependency-cruiser.js`'s `issue #2` comment, `apps/dashboard/src/exposed/App.tsx`'s styles.css comment, `docs/decisions/0008-generator-after-two-remotes.md` (FR-004)
- [X] T006 [US2] `quickstart.md` §2: read the draft start to finish, confirm zero placeholder text

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 4: User Story 3 - A maintainer knows exactly how to deploy this project (Priority: P2)

**Goal**: `docs/how-to-deploy.md` documents the real, host-agnostic build/deploy mechanism.

**Independent Test**: Follow the guide's build steps for the shell and one
remote; confirm output matches exactly.

- [X] T007 [US3] `docs/how-to-deploy.md` — per-app independent static builds, the `FEDERATION_ENV` mechanism, and what a maintainer updates in `remotes.<env>.json` once a remote has a real URL (FR-005)
- [X] T008 [US3] `docs/how-to-deploy.md` — state plainly that `remotes.staging.json`/`remotes.production.json` currently have empty `remotes` arrays (FR-006)
- [X] T009 [US3] `quickstart.md` §3: actually run `FEDERATION_ENV=production`/`staging` builds for the shell and a remote build, confirm output matches the guide exactly

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 5: User Story 4 - Every already-closed Portfolio checklist item is confirmed, not assumed (Priority: P3)

**Goal**: Re-confirm CONTRIBUTING.md/CODE_OF_CONDUCT.md/issue-PR templates/ADR coverage are still true.

**Independent Test**: Re-run `007-docs-security`'s own audit checks.

- [X] T010 [US4] Re-list `docs/decisions/*.md` against blueprint §2's ten items — confirm the 1:1 match still holds (FR-007)
- [X] T011 [US4] Confirm `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` are present and current; edit only if a real gap is found (FR-007)
- [X] T012 [US4] `quickstart.md` §4: run the re-confirmation commands for real

**Checkpoint**: All four user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 Confirm no real external action occurred as a side effect (no deploy, no GIF, no repo pin, no external publish) — FR-008, SC-005
- [X] T014 Write the pull request description
- [X] T015 Review the diff against `.claude/agents/pr-reviewer.md`'s checks before opening the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Empty.
- **Phases 2–5 (US1–US4)**: Independent; any order.
- **Phase 6 (Polish)**: Last.

### Commit discipline

Scope `docs` for all three deliverables (`README.md`, the technical post,
`docs/how-to-deploy.md`), per `commitlint.config.mjs`'s allow-list —
matching `007-docs-security`'s pattern.

## Implementation Strategy

Any single story is independently shippable. US1 (README) and US2 (the
post) are both P1 — the two artifacts with an actual external audience
once published/deployed. US3 (deploy guide) is P2 — supports the
maintainer's own next action without blocking launch-readiness itself. US4
(re-confirmation) is P3 — cheap insurance against drift, not new
discovery.

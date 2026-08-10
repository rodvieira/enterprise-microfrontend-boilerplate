---

description: "Task list for Remote Generator"
---

# Tasks: Remote Generator

**Input**: Design documents from `/specs/006-remote-generator/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included where the spec/plan call for them — unit tests for the
generator's own validation/version logic, plus quickstart dry runs as the
integration proof for each user story. No new `apps/shell/e2e/` fixture
(plan.md Technical Context: a generated-and-deleted app has no business
being a long-lived e2e dependency).

**Organization**: Grouped by the four prioritized user stories from
spec.md. `register-dev-remote.ts` is implemented in the Foundational phase,
not User Story 4's phase, even though FR-009 is spec'd under US4 — User
Story 1's own acceptance scenario 3 ("placeholder renders composed inside
the shell") cannot be demonstrated without it. US4's phase covers the parts
that are genuinely optional polish on top of a working generator: the docs
line and the console summary.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task names an exact file path

---

## Phase 1: Setup

- [ ] T001 Add `@turbo/gen`, `@changesets/cli`, and `@changesets/changelog-github` to root `package.json` `devDependencies` (research D2, D5); draft the one-line justification for each, verbatim, for the PR description (Constitution Principle IX)
- [ ] T002 [P] Create `turbo/generators/config.ts` registering an empty `remote` generator stub, so `pnpm turbo gen remote` resolves to something before any prompt logic exists (research D2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story below can be demonstrated until this phase is complete — every story's independent test runs the generator end to end.

- [ ] T003 [P] `turbo/generators/remote/validate.ts` — name legality, reserved-name (`shell`) and existing-`apps/*`-directory collision checks, route-path collision against `HOST_OWNED_ROUTE_PATHS` and existing `remotes.dev.json` entries (FR-004, FR-012, FR-013; reuses the collision semantics already in `apps/shell/src/internal/federation/manifest.ts`)
- [ ] T004 [P] `turbo/generators/remote/validate.test.ts` — unit tests for every rule in T003, including the edge cases (invalid name shapes, `admin`/`shell` collisions, `/admin` route collision)
- [ ] T005 [P] `turbo/generators/remote/shared-versions.ts` — reads `react`, `react-dom`, `react-router`, `@enterprise-mfe/auth`, `@enterprise-mfe/event-bus` version ranges live from `apps/dashboard/package.json` at generation time (research D3) — no version literal lives in any template
- [ ] T006 [P] `turbo/generators/remote/shared-versions.test.ts` — confirms the read values match `apps/dashboard/package.json` exactly, and fails loudly if a singleton listed in `scripts/check-shared-deps.ts`'s `SINGLETONS` is missing from the source manifest
- [ ] T007 `turbo/generators/remote/prompts.ts` — collects `mode`, `name`, `routePath`, `label` (and `outputPath` when `mode === 'standalone'`), running every check from T003 before any file write (FR-002, FR-014)
- [ ] T008 [P] `turbo/generators/remote/templates/common/` — extract the files research D1 found identical between `apps/dashboard` and `apps/admin` (`src/exposed/App.tsx`, `src/internal/`, `src/index.tsx`, `src/bootstrap.tsx`, `index.html`, `tsconfig.json`, `postcss.config.mjs`), parameterized only by name/title
- [ ] T009 `turbo/generators/remote/templates/monorepo/package.json` — `@enterprise-mfe/auth` and `@enterprise-mfe/event-bus` at `workspace:*`; `react`/`react-dom`/`react-router` substituted from T005's live read (FR-006)
- [ ] T010 `turbo/generators/remote/actions/write-app.ts` — renders `templates/common/` + `templates/monorepo/` into `apps/<name>` (FR-003)
- [ ] T011 `turbo/generators/remote/actions/register-dev-remote.ts` — appends a `remotes.dev.json` entry (`name`, `entry`, `routePath`, `label`) and, if needed, an `allowedOrigins` addition; assigns the next free dev port after existing entries (research D6, FR-009, `data-model.md`'s `DevRegistryEntry`)

**Checkpoint**: A monorepo-mode remote can now be generated and composed by the shell. User story work below builds on this.

---

## Phase 3: User Story 1 - A new remote scaffolds itself, correctly, on the first run (Priority: P1) 🎯 MVP

**Goal**: Running the generator in monorepo mode produces a working `apps/<name>` with zero manual follow-up.

**Independent Test**: Generate a throwaway remote, run the workspace's build/test/lint/typecheck against it, then `pnpm dev` and confirm it renders composed inside the shell.

### Implementation for User Story 1

- [ ] T012 [US1] Wire `turbo/generators/config.ts`'s `remote` generator: monorepo path = T007 prompts → T003 validation → T010 write-app → T011 register-dev-remote (`contracts/generator-contract.md` monorepo postconditions)
- [ ] T013 [US1] `quickstart.md` §1: generate `apps/scratch-remote`; run `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` — confirm all five pass with zero manual edits (FR-008)
- [ ] T014 [US1] `quickstart.md` §1: `pnpm dev`, visit `/scratch-remote`, confirm the placeholder renders composed inside the shell (contract acceptance scenario 3); clean up the scratch remote and its registry entry afterward
- [ ] T015 [US1] `quickstart.md` §3: confirm a name collision (`admin`), a reserved name (`shell`), and a route collision (`/admin`) each refuse before any file write and leave the workspace unchanged (edge cases)

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - The generated remote can't violate a guard rail by construction (Priority: P1)

**Goal**: A freshly generated remote passes `check:boundaries` and `check:shared-deps` with zero edits.

**Independent Test**: Immediately after generation, run `pnpm check:boundaries` and `pnpm check:shared-deps` against the whole workspace and confirm both pass.

### Implementation for User Story 2

- [ ] T016 [US2] `turbo/generators/remote/templates/common/rspack.config.ts` — `ModuleFederationPlugin` exposes exactly `{ './App': './src/exposed/App.tsx' }` and declares the identical `shared` singleton block `apps/dashboard`/`apps/admin` already use (FR-005)
- [ ] T017 [US2] Re-run `pnpm check:boundaries` against a freshly generated scratch remote (reuse T013's output or regenerate) — confirm pass with zero edits (FR-007)
- [ ] T018 [US2] Re-run `pnpm check:shared-deps` against the same scratch remote — confirm pass with zero edits (FR-006)
- [ ] T019 [US2] Spot-check every import inside the generated `src/exposed/` and `src/internal/` is declared in the generated `package.json` (`.dependency-cruiser.js`'s `no-undeclared-dependencies` rule, ADR-0011)

**Checkpoint**: User Stories 1 and 2 together deliver ADR-0008's core rationale — a correct-by-construction monorepo remote.

---

## Phase 5: User Story 3 - The generator also produces a standalone, out-of-monorepo remote (Priority: P1)

**Goal**: Standalone mode produces an independent project outside this monorepo whose `package.json` depends on `@enterprise-mfe/*` as published packages, backed by a real (never self-triggered) Changesets/GitHub Packages publish workflow.

**Independent Test**: Generate a standalone-mode remote to a path outside this repo; confirm its `package.json` has no `workspace:*` reference, its registry config is present, and nothing under this monorepo changed.

### Implementation for User Story 3

- [ ] T020 [US3] `.changeset/config.json` — designates `packages/*` as the linked/publishable set (never `apps/*`), targets GitHub Packages under the `@enterprise-mfe` scope (research D5)
- [ ] T021 [P] [US3] Add `publishConfig` (`registry`, `access: "restricted"`) to `packages/auth/package.json`, `packages/event-bus/package.json`, `packages/shared-types/package.json`, and `packages/ui/package.json` (`contracts/package-publish-contract.md`) — no behavior change until a publish actually runs
- [ ] T022 [US3] `.github/workflows/publish-packages.yml` — `changeset version` / `changeset publish`, triggered only by `workflow_dispatch` or a release tag, never on the existing `push`/`pull_request` triggers the `quality` job uses (FR-018, FR-019)
- [ ] T023 [US3] Extend `turbo/generators/remote/prompts.ts` and `validate.ts` (T003, T007) with the `outputPath` prompt: required when `mode === 'standalone'`, refused if it resolves inside the monorepo root or into a non-empty directory (research D4, FR-016)
- [ ] T024 [US3] `turbo/generators/remote/templates/standalone/package.json` and `.npmrc` — `@enterprise-mfe/*` at published semver ranges (never `workspace:*`), registry config pointing at GitHub Packages (FR-017)
- [ ] T025 [US3] `turbo/generators/remote/templates/standalone/README.md` — states plainly that install requires `packages/*` to have been published at least once, and that failure is expected before that first publish (FR-020)
- [ ] T026 [US3] `turbo/generators/remote/actions/write-app.ts` — standalone branch: render `templates/common/` + `templates/standalone/` to `outputPath`; confirm no monorepo-only action (T011, and Phase 6's docs action) ever runs for this mode (FR-016)
- [ ] T027 [US3] `quickstart.md` §2: generate `../scratch-standalone`; confirm its `package.json` has no `workspace:*`, `.npmrc` is present and correct, `README.md` states the prerequisite, and `git status` in this repo shows nothing changed; clean up afterward
- [ ] T028 [US3] `quickstart.md` §4: dry-run the publish workflow (`pnpm exec changeset status` or equivalent) to confirm `.changeset/config.json` and `publishConfig` are wired correctly — **without invoking a real `changeset publish` against GitHub Packages** (FR-019, SC-006)

**Checkpoint**: Both output modes work. `docs/blueprint.html`'s "Generator produces both monorepo-mode and standalone-mode output" DoD line is now true, without a live publish having occurred.

---

## Phase 6: User Story 4 - The generated remote is composed and documented, not left orphaned (Priority: P2)

**Goal**: Documentation and console output close the loop — nothing about a generated remote is discoverable only by accident.

**Independent Test**: After generating a monorepo-mode remote, inspect `docs/architecture.md` and the generator's own console output without any manual edit.

### Implementation for User Story 4

- [ ] T029 [US4] `turbo/generators/remote/actions/update-architecture-docs.ts` — appends one line naming the new app to `docs/architecture.md`'s "## Remotes" section, matching its existing prose style (FR-011)
- [ ] T030 [US4] Wire T029 into `config.ts`'s monorepo path only (after T011, alongside T012's wiring); confirm standalone mode never touches `apps/shell/`, `docs/`, or `remotes.dev.json` (acceptance scenario 4)
- [ ] T031 [US4] Generator console summary (FR-015): files created, the registry entry added (or, for standalone, that no registry was touched), the docs line added, and an explicit statement that staging/production registration and any real package publish are **not** included
- [ ] T032 [US4] `quickstart.md` §1 re-run: confirm `docs/architecture.md` gains the new remote's line automatically, with no separate manual step

**Checkpoint**: All four user stories are independently functional. The generator's output is discoverable, not just present on disk.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T033 Write `docs/decisions/0014-generator-dual-mode.md` — records the tool choices (`@turbo/gen`, Changesets; research D2, D5), the `remote.manifest.json`/`federation.config.ts` rejection (research D1), the GitHub Packages scope handling, and the no-live-publish boundary (FR-019), per Constitution Principle VII
- [ ] T034 Run `quickstart.md` §1–§4 end to end on a clean checkout
- [ ] T035 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm check:boundaries`, `pnpm check:shared-deps`, `pnpm e2e` in sequence — confirm all seven exit `0` with the three new devDependencies in place
- [ ] T036 Write the pull request description, including T001's dependency justifications verbatim (Principle IX)
- [ ] T037 Review the diff against `.claude/agents/pr-reviewer.md`'s checks before opening the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS** every user story; includes `register-dev-remote.ts` (T011) because US1's own acceptance test needs it, not because it belongs to US4
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2; reuses Phase 3's generated output rather than re-deriving it, but is independently verifiable on any fresh generation
- **Phase 5 (US3)**: Depends on Phase 2 only — does not require Phase 3/4 to be done first, since standalone mode shares `validate.ts`/`prompts.ts`/`templates/common/` but not `register-dev-remote.ts` or the monorepo template
- **Phase 6 (US4)**: Depends on Phase 3 (T011 exists) for T030's monorepo wiring, and on Phase 5 (T026) for T030's standalone non-interference check
- **Phase 7 (Polish)**: Last — the ADR needs every prior phase's real outcome to describe accurately

### Parallel Opportunities

- T003, T005, T008 (validation, version-reading, template extraction) touch different files and can run in parallel once Phase 1 is done
- T004 and T006 (their respective unit tests) can run in parallel with each other, after their implementation tasks
- T021 (four `publishConfig` edits) are four independent files — fully parallel
- Phase 5 (US3) can proceed in parallel with Phase 3/4 (US1/US2) by a second contributor, since it depends only on Phase 2, not on US1/US2's completion

### Commit discipline

Per user story, scoped per `commitlint.config.mjs`'s allow-list: `repo` for
`turbo/generators/`, `.changeset/`, and CI workflow changes; `auth`,
`event-bus`, `shared-types`, `ui` for their individual `publishConfig`
additions (T021); `docs` for the ADR (T033) and the `docs/architecture.md`
mechanism (T029). Matches `005-guard-rails`'s per-phase commit pattern.

---

## Parallel Example: Foundational Phase

```bash
# Independent files, can be built together:
Task: "turbo/generators/remote/validate.ts — name/route validation and collision rules"
Task: "turbo/generators/remote/shared-versions.ts — live-read shared-dep versions"
Task: "turbo/generators/remote/templates/common/ — extracted from apps/dashboard + apps/admin"
```

---

## Implementation Strategy

### MVP scope

Phases 1–4 (Setup, Foundational, US1, US2) deliver ADR-0008's actual
rationale: a monorepo-mode generator whose output is correct by
construction. This alone replaces the error-prone hand-copying this sprint
exists to remove, and is demoable on its own.

### Incremental delivery

1. Phase 1 → new tooling installed, `pnpm turbo gen remote` resolves
2. Phase 2 → the generator can produce a working monorepo remote
3. Phase 3 (US1) → proven end to end, composed inside the shell (MVP)
4. Phase 4 (US2) → proven guard-rail-clean
5. Phase 5 (US3) → standalone mode ships, satisfying the sprint's DoD, with
   zero live publishes performed
6. Phase 6 (US4) → documentation and console output close the loop
7. Phase 7 → the closing ADR, full quickstart, full gate run, PR

### Sequencing note

Phase 5 (US3, standalone mode) is scoped as P1 in `spec.md` because
`docs/blueprint.html`'s Definition of Done requires it for this sprint, but
it is sequenced *after* US1/US2 in delivery order (plan.md's "Build order
within the feature") — it is the one piece this sprint deliberately does not
exercise against the real registry (FR-019), so keeping it last makes that
boundary easy to see in the commit history, one story per commit group,
matching `005-guard-rails`'s precedent.

---

## Notes

- [P] = different files, no dependency on incomplete work
- T011 living in the Foundational phase rather than US4's is a deliberate
  deviation from "register/docs wiring is P2 polish" — it is P2 in
  *business-value ranking* (spec.md), but a hard prerequisite for US1's own
  acceptance scenario 3 in *implementation order*. The two orderings are not
  the same thing, and tasks.md follows implementation order.
- T028 and Phase 5 generally carry the sprint's one genuine external-system
  risk: if the Changesets/GitHub Packages wiring is subtly wrong, the
  failure won't surface until a maintainer's first real publish, since
  FR-019 deliberately keeps this sprint from ever exercising that path for
  real. Reviewing T020–T022 carefully matters more than usual for exactly
  that reason.

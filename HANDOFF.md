# Handoff — starting a new execution session

**Written**: 2026-08-05, at the close of Sprint 3 (`002-shell-host`, PR #7, merged).

This file is ephemeral, the same way `CONSTITUTION_DRAFT.md` was. Read it once
at the start of the next session, then delete it — everything durable it
points to already lives in `CLAUDE.md`, `.specify/memory/constitution.md`, the
ADRs, and the merged `specs/*` directories. Don't let this file become stale
documentation; that's what those are for.

## Where things stand

`main` is clean, at `b93bc30`, all six gates verified green on this exact
commit before writing this handoff (`pnpm lint`, `typecheck`, `build`, `test`
— 103 passing, `check:boundaries`, `check:shared-deps`). No open branch, no
uncommitted work.

**Sprints 1–3 are done**, each as a merged PR built through the full Spec Kit
cycle (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement`):

| Sprint | Spec dir | Delivered |
|---|---|---|
| 1 — foundation | *(pre-Spec-Kit, see `docs/decisions/000{1,2,3,6,7,8,9,10}-*.md`)* | Monorepo tooling, governance, Claude Code config |
| 2 — shared packages | [`specs/001-shared-packages-foundation/`](specs/001-shared-packages-foundation/) | `config-typescript`, `config-biome`, `shared-types`, `ui` (7 components), `auth` (stub) |
| 3 — shell host | [`specs/002-shell-host/`](specs/002-shell-host/) | `apps/shell`, `federation-utils`, manifest-driven registry, origin control |

`packages/` currently has 6 members, `apps/` has 1 (`shell`). Read
[`docs/packages.md`](docs/packages.md) and
[`docs/architecture.md`](docs/architecture.md) for what exists and why — don't
re-derive it from scratch.

## Open issues — triage before starting new work

```
gh issue list --state open
```

- **#1** (Biome 1.9 can't resolve `extends` from `node_modules`) — blocks
  standalone-mode config sharing (ADR-0007). Not urgent; only matters once the
  dual-mode generator (sprint 7) is real.
- **#3** (`pnpm test` bypasses Turborepo, no caching) — low priority, cosmetic
  until the suite is large enough for caching to matter.
- **#6** (dependency-cruiser can't resolve `../../`-or-deeper relative imports
  *in this specific checkout*, though an isolated identical config resolves
  fine) — unexplained after a genuinely exhaustive investigation (see the
  issue body and `specs/002-shell-host/tasks.md` T064/T065). **Worth
  retrying** once `apps/dashboard` exists for real: sprint 4 is the first
  chance to reproduce this against an actual second app instead of a
  throwaway one, and if it still reproduces, that's new information.

Issues #2 and #4 were closed manually after merge — the PR body didn't use
GitHub's exact `Closes #N` syntax, so they didn't auto-close. Watch for that
in future PRs if you want auto-close to work: use `Closes #N`, not prose.

## How this project runs — the discipline, not just the rules

`CLAUDE.md` and `.specify/memory/constitution.md` are authoritative on *what*
the rules are. This section is about *how the last two sprints were actually
executed*, because that pattern is what made them trustworthy — repeat it.

- **Every sprint goes through all four Spec Kit phases**, in order, each
  committed separately (`docs: specify …`, `docs: plan …`,
  `docs: break down … into executable tasks`, then the implementation
  commits). Don't skip straight to code.
- **Tests are written before implementation** and confirmed failing first,
  per task. This isn't a formality — it's what makes "93 passed" mean
  something.
- **Every non-trivial claim gets verified by actually running it**, not by
  reading the config and trusting it. This found real bugs both sprints:
  `@rspack/dev-server` being a separate package, `defineConfig` living in
  `@rspack/cli` not `@rspack/core`, `turbo.json` not declaring `FEDERATION_ENV`
  as a cache-key input (which would have silently broken environment
  switching under any warm cache), a genuine same-app carve-out bug in the
  boundary rule that had existed since the bootstrap commit. All four were
  found by running the actual command, not by inspection.
- **Guard rails are proven by deliberately breaking them**, not trusted
  because the code looks right: the drift check, the boundary gate, the
  Tailwind pipeline were each broken on purpose and confirmed to fail
  correctly before being trusted.
- **No `--no-verify`, ever**, once the tooling stabilized in sprint 1 — every
  commit since has gone through lefthook + commitlint for real.
- **A blocker becomes a GitHub issue, not a silent skip or a fabricated
  pass.** Issue #6 is the clearest example: real investigation (ruled out ~8
  hypotheses with actual reproductions), honest documentation of what
  couldn't be explained, and an alternative verification method (direct
  regex-logic testing) used *in addition to*, not *instead of*, being honest
  that the CLI-level proof didn't work.
- **Commit scope must be one of the allow-listed values** in
  `commitlint.config.mjs`: `shell`, `dashboard`, `admin`, `ui`, `auth`,
  `shared-types`, `federation-utils`, `event-bus`, `telemetry`,
  `testing-utils`, `config-typescript`, `config-biome`, `docs`, `claude`,
  `repo`. `dashboard` and `admin` are already in the list, unused until
  sprint 4/5.
- **PR descriptions justify every new dependency**, one line each
  (constitution Principle IX), and disclose every deviation from the task
  list with the reasoning, not just the diff.

## Environment gotchas already paid for — don't rediscover these

- **Local Node is 22.20.0; the declared floor is `>=22.22.2`.** `pnpm install`
  warns but proceeds. Everything has worked so far despite the mismatch, but
  it's a known gap — if something behaves strangely, check this first.
- **Hoisted `node_modules`** (`.npmrc`: `node-linker=hoisted`,
  `hoist-workspace-packages=true`, see ADR-0011). Every package must declare
  every import in its own `package.json`, including test tooling — nothing is
  enforced by directory isolation anymore, only by the
  `no-undeclared-dependencies` dependency-cruiser rule.
- **Tailwind v4's `@source` directive respects `.gitignore`** — pointing it at
  a `node_modules` symlink path silently scans nothing, since
  `node_modules/` is gitignored. Always use the workspace-relative path (see
  `apps/shell/src/internal/styles.css`).
- **`pnpm --filter <name>` needs the exact `package.json` "name"** (e.g.
  `@enterprise-mfe/shell`), not a folder name. `pnpm test -- --project shell`
  is different — that's a Vitest project name, defined explicitly in
  `vitest.config.mts`, unrelated to the pnpm/turbo filter syntax.
- **`turbo.json` tasks that read an env var need it declared** under that
  task's `"env"` array, or Turbo's cache key won't account for it and a
  second run with a different value silently replays stale output. This bit
  `apps/shell`'s `build` task for `FEDERATION_ENV` — check any new task that
  reads `process.env` for the same gap.
- **Ephemeral tooling (screenshots, one-off reproductions) goes in the
  scratchpad, never in the project's `package.json`/lockfile.** Playwright
  was used twice for real browser verification, installed only in
  `/tmp/claude-*/scratchpad`, never as a project dependency — Playwright is
  deliberately deferred to sprint 4 as a project dependency (research D7 in
  `specs/002-shell-host/research.md`).

## What's next — Sprint 4: the first remote

Per the build order (ADR-0008, `docs/blueprint.html` §15): shared packages →
shell → **dashboard remote** → admin remote → guard rails → generator. This is
the first remote, and per ADR-0010 it's specifically the analytics/overview
domain (KPI cards, activity chart, recent activity feed) — the toy-domain
bar this project set for itself is "does it prove something a generic todo
app wouldn't," not just federation mechanics.

Inputs already sitting in the repo for this sprint, don't re-derive them:

- **The registry contract** (`specs/002-shell-host/contracts/registry-contract.md`)
  defines exactly what `apps/dashboard`'s `federation.config.ts` and
  `remote.manifest.json` need to satisfy for the shell to accept it — origin
  in `allowedOrigins`, `name`, `entry`, `routePath`, `label`.
- **The exposed/internal convention** is already proven in `apps/shell`;
  copy that structure, don't reinvent it.
- **Singleton list** (`scripts/check-shared-deps.ts`) already anticipates a
  remote: `react`, `react-dom`, `@enterprise-mfe/auth`, `react-router` must
  match exactly across `apps/dashboard/package.json` too.
- **`.claude/agents/scaffold-assistant.md`** exists for exactly this — walking
  through the domain/auth/monorepo-vs-standalone/event-bus questions before
  scaffolding. Consider using it, or `/scaffold-remote dashboard`, rather than
  scaffolding free-hand.
- **Issue #6 gets a real second data point here.** Once `apps/dashboard`
  exists as a genuine second app (not a throwaway test fixture), rerun the
  T064-style cross-app-import check. If dependency-cruiser resolves correctly
  against a real remote, that's a strong clue the bug was specific to
  something about the throwaway fixture rather than the environment broadly —
  update issue #6 with whatever is found either way.

**First command of the new session**: `/speckit-specify` for sprint 4,
following the same pattern as `specs/002-shell-host/spec.md` — cite ADR-0010
and the blueprint's dashboard section as authoritative sources, don't
re-derive the domain from scratch.

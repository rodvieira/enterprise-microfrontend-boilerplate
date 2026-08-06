# Quickstart Validation: Dashboard Remote

**Feature**: `003-dashboard-remote` | **Date**: 2026-08-06

How to verify this feature delivers what the spec promises. Each section maps
to a success criterion. Run from the repository root, branch
`003-dashboard-remote`.

## Prerequisites

```bash
pnpm install
```

## 1. Standalone, no shell (edge case: a remote works on its own)

```bash
pnpm dev --filter @enterprise-mfe/dashboard
```

Open the printed URL (`http://localhost:3001`). Expected: KPI cards, chart,
and feed all render fully with no shell present — a remote is a portable
application in its own right.

## 2. The shell composes a real remote for the first time (SC-001)

```bash
pnpm dev
```

In another terminal, register the dashboard (if not already committed — see
`contracts/registry-entry.md`), then open the shell's URL and navigate to
`/dashboard`. Expected:

- The dashboard's UI renders inside the shell's frame.
- `git status --porcelain apps/shell/src` shows exactly **one** changed file
  — `remotes.dev.json` — once the one-time route-patching mechanism this
  sprint builds is in place (see `research.md` addendum below).
- Signed in through the shell's session, the dashboard reads that same
  session via the shared auth contract — no second sign-in.

## 3. KPI cards resolve, one way or the other (SC-002)

```bash
pnpm test -- --project dashboard
```

Expected, from `fetchDashboardOverview`'s two modes
(`contracts/dashboard-data-contract.md`):

| Call | Expected card state |
|---|---|
| default options | loading, then populated with `active-users` and `usage-trend` |
| `forceFailure: true` | loading, then each card's distinct error state — never a permanent spinner |

## 4. The chart doesn't leak (SC-003)

```bash
pnpm test -- --project shell
```

Composed-shell test asserts the shell's chrome and navigation DOM before and
after the dashboard mounts and are unaffected. Confirm by hand once too:
inspect computed styles on the shell's nav bar with the dashboard mounted vs.
unmounted — no difference.

## 5. The feed never shows a blank region (SC-004)

```bash
pnpm test -- --project dashboard
```

Expected: fixture data renders newest-first; an explicitly empty `feed` array
renders the `Table`'s `emptyState`, not nothing.

## 6. The boundary and singleton gates hold against a real second app (SC-005, SC-006 — issue #6's retest)

```bash
pnpm check:boundaries
pnpm check:shared-deps
```

Both pass. Then, deliberately:

```bash
# Introduce a relative import from apps/dashboard reaching into apps/shell,
# e.g. an import like '../../shell/src/internal/chrome' in a dashboard file.
pnpm check:boundaries   # expected: fails, names the violated rule
# revert
pnpm check:boundaries   # expected: passes again

# Change one singleton's version range in apps/dashboard/package.json only
pnpm check:shared-deps  # expected: fails, names the package and the mismatch
# revert
pnpm check:shared-deps  # expected: passes again
```

Record the `check:boundaries` result against
[issue #6](https://github.com/rodvieira/enterprise-microfrontend-boilerplate/issues/6):
if the deliberate violation above resolves and fails correctly against this
real second app — unlike the throwaway fixture in sprint 3 — that is evidence
the bug was specific to that fixture or its environment, not the tool or this
checkout broadly. If it reproduces the same unresolved-import failure, that is
equally important new information. Either way, update issue #6 with the
result; do not leave it silently re-confirmed or silently contradicted.

## 7. `pnpm e2e` stops being a no-op (research D6)

```bash
pnpm e2e
```

Expected: Playwright starts the shell and dashboard, navigates to
`/dashboard`, and asserts the composed page — the first real run this command
has ever done in this project.

## 8. Every gate, clean checkout (SC-007)

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm e2e
pnpm check:boundaries
pnpm check:shared-deps
```

Expected: all seven exit `0`, zero `--no-verify` in the branch history.
`check:shared-deps` now covers `apps/dashboard`'s manifest for the first time.

## What this feature does NOT deliver

No live cross-remote KPI update. ADR-0010's "Admin role change updates
Dashboard's KPI via `packages/event-bus`" needs `apps/admin` and
`packages/event-bus`, neither of which exists until sprint 5. `spec.md`
Assumptions says so explicitly — this quickstart proves the dashboard's
domain in isolation, not the cross-remote proof point.

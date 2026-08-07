# Quickstart Validation: Guard Rails

**Feature**: `005-guard-rails` | **Date**: 2026-08-06

How to verify this feature delivers what the spec promises. Run from the
repository root, branch `005-guard-rails`.

## Prerequisites

```bash
pnpm install
npx playwright install chromium
```

## 1. A real remote failure is contained (SC-001, SC-002)

```bash
pnpm e2e
```

Expected: the new real-failure scenario in
`apps/shell/e2e/remote-failure.spec.ts` passes —

- Navigating to the route of a remote whose manifest/entry request is
  aborted at the network layer shows a contained, distinct failure state
  for that region only.
- The shell's chrome, navigation, and the *other* composed remote's route
  remain fully usable while the failed remote's region is broken.
- Un-aborting the route and using the region's retry control recovers it
  without a full page reload.

## 2. CI enforces the full gate set (SC-003, SC-004)

Push this branch (or open the PR) and inspect the `quality` job in GitHub
Actions. Expected: an `End-to-end` step runs after `Shared deps drift check`
and before `Security audit`, and the job is green.

To prove it actually catches something: temporarily break a passing e2e
scenario (for example, comment out the `patchRoutesOnNavigation` call in
`apps/shell/src/exposed/App.tsx`), push, and confirm the `quality` job goes
red on the `End-to-end` step specifically — then revert and confirm it goes
green again. Do this on a scratch branch, not on `005-guard-rails` itself.

## 3. The closing record answers "is guard rails done?" cold (SC-005)

```bash
cat docs/decisions/0013-guard-rails-closed.md
```

Expected: reading it alone (no other context) answers, for each of the
three constitution-named guard rails, where and when it was built and
verified, and states explicitly that "boundary enforcement matches
monorepo and standalone-repo behavior" depends on the sprint 7 generator's
standalone-mode output (ADR-0007) rather than being an oversight here.

## 4. Every gate, clean checkout

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm e2e
pnpm check:boundaries
pnpm check:shared-deps
```

Expected: all seven exit `0`, matching exactly what CI now runs (§2).

## What this feature does NOT deliver

Any change to the scaffolding generator (ADR-0008, Principle V) — sprint 7's
work, not this sprint's, even though both remotes it needs now exist. No new
package, app, or public API — this sprint's surface is CI configuration, one
e2e test file, and a decision record.

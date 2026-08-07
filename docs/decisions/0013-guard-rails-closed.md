# 0013 — Guard rails (sprint 6) closed: what was already done, what this sprint added, what's deferred

**Status:** Accepted

## Context

`docs/blueprint.html` §15 names sprint 6 "guard rails: dependency-cruiser,
singleton CI check, error boundary." The constitution's Development Workflow
section names the same three, more precisely: `pnpm check:boundaries`, `pnpm
check:shared-deps`, and the remote-load error boundary. By the time this
sprint started, all three already existed and were already enforced — built
incrementally across sprints 2, 3, and 5, not as one dedicated phase. Without
a record saying so explicitly, a future reader (including whoever starts
sprint 7) would have to reconstruct that fact from commit archaeology, or
worse, assume it was never done and redo it.

This ADR is that record. `005-guard-rails`'s own spec required it
(`FR-009`, `FR-010`) precisely to prevent this ADR itself from being skipped
under the same pressure that would have skipped the guard rails.

## What was already done, and where

| Guard rail | Built | Verified |
|---|---|---|
| `pnpm check:boundaries` (dependency-cruiser) | `002-shell-host`, restored to inspect `apps/` (closing issue #2) | First real second-app retest in `003-dashboard-remote` (closing issue #6); retested again against a third real app in `004-admin-remote` |
| `pnpm check:shared-deps` (singleton drift) | `002-shell-host`, `react`/`react-dom`/`@enterprise-mfe/auth`/`react-router` | Extended to a second singleton *package* (`@enterprise-mfe/event-bus`) in `004-admin-remote`, correcting a stale sprint-3 comment that had guessed it would arrive later |
| Remote-load error boundary (`packages/federation-utils`'s `useRemote`/`RemoteBoundary`, `apps/shell`'s `RemoteRegion`) | `002-shell-host` | Only against **simulated** loaders until this sprint — see below |

## What this sprint added

1. **The error boundary proven against a real failure, not a simulated one**
   (`005-guard-rails` US1, `apps/shell/e2e/remote-failure.spec.ts`). Real
   remotes didn't exist until sprint 4, so `002-shell-host` could only test
   fake loader functions. Four scenarios now abort a real remote's network
   requests at the browser level and confirm containment, retry, and
   correct behavior on a mid-session failure and a double failure. All four
   passed on the first run — the existing mechanism needed no changes.
2. **`pnpm e2e` enforced in CI** (`005-guard-rails` US2,
   `.github/workflows/ci.yml`). It was the one gate in `CLAUDE.md`'s
   documented set CI didn't already run. Verified twice in real GitHub
   Actions runs: once passing green with this sprint's own changes (PR #10),
   and once — on a scratch branch, deliberately breaking route-patching,
   never merged — failing specifically on the `End-to-end` step while every
   other gate stayed green (PR #11, closed without merging).

## What's deliberately deferred, not forgotten

Blueprint's sprint 6 bullet also says boundary enforcement should "match
monorepo and standalone-repo behavior." This is **not** a gap this sprint
failed to close — it's a dependency of work that doesn't exist yet.
ADR-0007 already decided that standalone-repo parity is proven by the
scaffolding generator's standalone-mode output (via Changesets, published to
GitHub Packages), because parity has to be checked against something real,
not asserted about a mode that has never produced any output. That generator
is sprint 7's work (ADR-0008, constitution Principle V), gated on both
`apps/dashboard` and `apps/admin` existing — which, as of this sprint, they
do.

Building any part of the generator in this sprint was explicitly ruled out
(`005-guard-rails` `FR-011`) rather than started "since we're here" — the
same discipline ADR-0008 itself insists on: don't guess the abstraction
before the second real case that reveals its actual shape.

## Consequences

Guard rails, as the constitution defines them, are done. The next phase
(sprint 7) can start from a codebase where `apps/dashboard` and `apps/admin`
are both real, working, and covered by real-failure e2e tests — exactly the
precondition ADR-0008 requires, and now provably true rather than assumed.

## Related

`specs/005-guard-rails/` — spec, plan (including the mid-plan correction of
how "genuinely unreachable" is produced), research, and the task breakdown
this ADR closes out. `docs/decisions/0007-monorepo-and-standalone-parity.md`
and `docs/decisions/0008-generator-after-two-remotes.md` for the deferred
item's actual owner.

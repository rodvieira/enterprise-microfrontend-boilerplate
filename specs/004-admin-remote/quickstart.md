# Quickstart Validation: Admin Remote

**Feature**: `004-admin-remote` | **Date**: 2026-08-06

How to verify this feature delivers what the spec promises. Each section
maps to a success criterion. Run from the repository root, branch
`004-admin-remote`.

## Prerequisites

```bash
pnpm install
```

## 1. Standalone, no shell (edge case: a remote works on its own)

```bash
pnpm dev --filter @enterprise-mfe/admin
```

Open `http://localhost:3002`. Expected: the user table, paginated and
sortable, renders fully with no shell present.

## 2. The shell composes a second real remote (SC-001)

```bash
pnpm dev
```

Navigate to `/dashboard`, then to `/admin`, then back. Expected:

- Both remotes render inside the shell's frame at their own routes.
- `git status --porcelain apps/shell/src` shows exactly **one** changed
  file (`remotes.dev.json`) after registering `admin` — the route-patching
  mechanism already exists (`003-dashboard-remote`).
- Navigating between the two never leaves stale content from the other
  mounted underneath.

## 3. The user table pages and sorts (SC-002)

```bash
pnpm test -- --project admin
```

Expected: a fixture set larger than one page renders bounded, and choosing
a sortable column reorders the visible rows.

## 4. Invite and role change, permission-gated (SC-003, SC-004)

```bash
pnpm test -- --project admin
```

Expected, from the two test identities (`research.md` D5):

| Session | Expected |
|---|---|
| the real stub (`users:write` granted) | invite/edit modal reachable; a submitted invite or role change appears in the table; an invalid submission is rejected with a visible reason, table unchanged |
| a mocked lower-privilege user (`users:write` absent) | the action to open the modal is not offered at all |

## 5. The live cross-remote update — the headline proof (SC-005)

```bash
pnpm e2e
```

Expected: with the shell composing both remotes, a role change submitted on
`/admin` updates `/dashboard`'s "active users" KPI with no reload. Confirm
by hand once, in two separate browser tabs both pointed at the shell (one
on `/dashboard`, one on `/admin`) — the update crosses via
`packages/event-bus`'s `BroadcastChannel` relay (`research.md` D2), not
merely within one tab.

```bash
grep -rn "from '\.\./\.\./" apps/admin/src apps/dashboard/src
```

Expected: no output — neither remote's source imports the other, directly
or via a relative path (`FR-015`).

## 6. The boundary and singleton gates hold against a third real app (SC-006, SC-007)

```bash
pnpm check:boundaries
pnpm check:shared-deps
```

Both pass. Then, deliberately:

```bash
# Introduce a relative import from apps/admin reaching into apps/dashboard or apps/shell
pnpm check:boundaries   # expected: fails, names the violated rule
# revert
pnpm check:boundaries   # expected: passes again

# Mismatch @enterprise-mfe/event-bus's version range between apps/admin and apps/dashboard
pnpm check:shared-deps  # expected: fails, names the package and both manifests
# revert
pnpm check:shared-deps  # expected: passes again
```

## 7. Every gate, clean checkout (SC-008)

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
`check:shared-deps` now covers `apps/admin`'s manifest and
`@enterprise-mfe/event-bus` for the first time.

## What this feature does NOT deliver

The scaffolding generator (ADR-0008, Principle V) — this sprint is what
makes it viable next (sprint 7), not a reason to start it early. Cross-*origin*
event delivery — `packages/event-bus`'s `BroadcastChannel` relay is
same-origin only, which is all the shell's single-origin composition model
ever needs (`contracts/event-bus-contract.md`).

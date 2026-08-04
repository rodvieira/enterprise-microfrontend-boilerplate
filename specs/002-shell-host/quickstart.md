# Quickstart Validation: Shell Host

**Feature**: `002-shell-host` | **Date**: 2026-08-03

How to verify this feature delivers what the spec promises. Each section maps to
a success criterion. Run from the repository root.

## Prerequisites

- Node 22.22.2 or newer (the root `engines` floor, raised by jsdom in sprint 2)
- pnpm 9
- A clean checkout of branch `002-shell-host`

```bash
pnpm install
```

## 1. The host runs, and something real is on screen (SC-001)

```bash
pnpm dev
```

Open the printed URL. Expected, with no file edited and no service running:

- A styled application frame — navigation, layout, a session indicator — built
  from `@enterprise-mfe/ui`, not from components the shell defines itself.
- **Styling is actually applied.** This is the whole of issue #4: if the frame
  renders as unstyled HTML, `tokens.css` was not processed and the Tailwind
  pipeline is wrong. Unstyled output here is a failure, not a cosmetic detail.
- No error, despite `remotes.dev.json` containing zero remotes. An empty registry
  is a valid state.
- Signing in through the stub makes the protected area of the frame reachable.

## 2. One build, three environments (SC-002)

```bash
FEDERATION_ENV=staging pnpm build --filter @enterprise-mfe/shell
grep -o '"environment": *"[a-z]*"' apps/shell/dist/remotes.json

FEDERATION_ENV=production pnpm build --filter @enterprise-mfe/shell
grep -o '"environment": *"[a-z]*"' apps/shell/dist/remotes.json
```

Expected: the deployed `remotes.json` differs between the two runs, and

```bash
git status --porcelain apps/shell/src
```

is **empty after both** — zero host source files changed to move environments.
That is the architectural claim of this sprint; if anything under `src/` differs,
the claim is false.

## 3. Adding a remote touches one file (SC-003)

Add an entry to `remotes.dev.json` and its origin to `allowedOrigins`. Then:

```bash
git status --porcelain apps/shell
```

Expected: exactly one file changed. No component, route file, or config touched.

## 4. A broken remote stays broken in one place (SC-004)

```bash
pnpm test -- --project @enterprise-mfe/federation-utils
pnpm test -- --project shell
```

Expected: all four simulated failure modes covered and passing —

| Simulation | Expected |
|---|---|
| loader rejects | region shows the error state, navigation still works |
| loader never settles | region times out into the error state, not a blank area |
| module has no usable export | treated as failed, not as an empty region |
| remote throws during render | contained by the boundary, application survives |

Then `retry()` returns the region to loading without remounting the application.

## 5. Origin control refuses what it should (SC-005)

Covered by tests, and worth confirming by hand once:

| Registry entry | Expected |
|---|---|
| origin absent from `allowedOrigins` | refused, `origin-not-allowed`, host still starts |
| `http://` on a non-loopback origin | refused, `insecure-transport` |
| `http://localhost:3001` | **allowed** — local development must keep working |
| `entry` not a valid URL | refused, `malformed-url` |

Every case must be decided explicitly. A remote that is silently absent is a
failure of this criterion even if the outcome looks the same.

## 6. The boundary gate can finally fail (SC-006) — issue #2

```bash
pnpm check:boundaries          # passes, and now actually inspects apps/
```

Restoring `apps/` to this gate's scope immediately found 13 real violations —
the original `no-reaching-into-internal` rule had no same-app carve-out and
flagged an app importing its *own* `internal/`. Fixed by splitting it into two
backreferenced rules; see `.dependency-cruiser.js` and the commit that closed
issue #2. That in itself is organic proof the gate isn't vacuous.

A full CLI-level reproduction of a *new* deliberate cross-app violation is
currently blocked by [issue #6](https://github.com/rodvieira/enterprise-microfrontend-boilerplate/issues/6):
dependency-cruiser fails to resolve any relative import needing 2+ `../`
segments in this checkout specifically, though an isolated, config-identical
reproduction resolves the same import correctly. In its place, the three
rules' regex logic was verified directly against simulated resolved paths —
see the T064/T065 notes in `tasks.md` for the full account. Once issue #6 is
resolved, this section should be updated back to a live `pnpm check:boundaries`
reproduction.

## 7. Every gate, clean checkout (SC-007)

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm check:boundaries
pnpm check:shared-deps
```

Expected: all six exit `0`, with no `--no-verify` anywhere in the branch history.
`check:shared-deps` now covers `apps/shell` — the first manifest under `apps/` it
has ever seen — and `react-router` joins the singleton list.

## What this feature does NOT deliver

No remote. Nothing is composed end to end, because there is nothing to compose
until sprint 4. Every remote-loading and origin-control guarantee above is proved
against simulated remotes, and the spec says so in its Assumptions rather than
implying coverage it cannot have. `pnpm e2e` remains unimplemented for one more
sprint (research D7).

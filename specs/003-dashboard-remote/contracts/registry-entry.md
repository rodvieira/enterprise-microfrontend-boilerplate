# Contract Fulfillment: registering `apps/dashboard`

**Feature**: `003-dashboard-remote` | **Date**: 2026-08-06

This is not a new contract — it is `apps/dashboard` satisfying the one
`specs/002-shell-host/contracts/registry-contract.md` already defined,
recorded here so the exact entry this sprint adds is unambiguous.

## The registration this sprint adds

`apps/shell/src/internal/federation/remotes.dev.json`, `remotes` array:

```jsonc
{
  "name": "dashboard",
  "entry": "http://localhost:3001/mf-manifest.json",
  "routePath": "/dashboard",
  "label": "Dashboard"
}
```

`allowedOrigins` already contains `http://localhost:3001` (sprint 3) — no
change needed there.

## What makes this entry valid against the existing contract

| Registry rule (from `registry-contract.md`) | How this entry satisfies it |
|---|---|
| `name` unique within the registry | Only registration in the array — trivially unique |
| `entry` a valid URL, origin on `allowedOrigins` | `http://localhost:3001/mf-manifest.json`, origin already allow-listed |
| `routePath` no collision with a host-owned route | `HOST_OWNED_ROUTE_PATHS` (`apps/shell/src/internal/routes/remote-routes.tsx`) is `['/']` — `/dashboard` does not collide |
| `label` shown in navigation | `"Dashboard"` |

## What this sprint does **not** touch

Per `FR-017` and the registry contract's own "Adding a remote" section: only
`remotes.dev.json` changes. `remotes.staging.json` and `remotes.production.json`
keep their empty `remotes` arrays — staging and production rollout of this
remote is explicitly out of this sprint's scope (`spec.md` Assumptions).
No file under `apps/shell/src` other than the two registry array entries
above changes.

## The other half: what `apps/dashboard` must produce

For `entry` to resolve to something real, `apps/dashboard`'s
`ModuleFederationPlugin` config (see `research.md` D1, `plan.md` Project
Structure) must declare `name: 'dashboard'` and expose `./App` — the shell's
`createFederationLoader('dashboard/App')` (pattern already established in
`apps/shell/src/internal/federation/loader.ts`) is what turns this
registration into a mounted component.

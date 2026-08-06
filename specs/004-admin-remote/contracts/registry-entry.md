# Contract Fulfillment: registering `apps/admin`

**Feature**: `004-admin-remote` | **Date**: 2026-08-06

Not a new contract — `apps/admin` satisfying the same
`specs/002-shell-host/contracts/registry-contract.md` `apps/dashboard`
already fulfilled (`specs/003-dashboard-remote/contracts/registry-entry.md`),
recorded here so the second entry is unambiguous.

## The registration this sprint adds

`apps/shell/src/internal/federation/remotes.dev.json`, `remotes` array
gains a second entry, alongside `dashboard`:

```jsonc
{
  "name": "admin",
  "entry": "http://localhost:3002/mf-manifest.json",
  "routePath": "/admin",
  "label": "Admin"
}
```

`allowedOrigins` already contains `http://localhost:3002` (sprint 3) — no
change needed there.

## What makes this entry valid against the existing contract

| Registry rule | How this entry satisfies it |
|---|---|
| `name` unique within the registry | `admin` — distinct from `dashboard`, the only other entry |
| `entry` a valid URL, origin on `allowedOrigins` | `http://localhost:3002/mf-manifest.json`, already allow-listed |
| `routePath` no collision with a host-owned route or `dashboard`'s `/dashboard` | `HOST_OWNED_ROUTE_PATHS` is `['/']`; `/admin` collides with neither |
| `label` shown in navigation | `"Admin"` |

## What this sprint does **not** touch

Per `FR-020` and the registry contract's "Adding a remote" section: only
`remotes.dev.json` gains this one entry. `remotes.staging.json` and
`remotes.production.json` keep their empty `remotes` arrays, matching how
both sprint 3 and sprint 4 scoped registry changes to development only. No
file under `apps/shell/src` other than this one array entry changes — the
route-patching mechanism `003-dashboard-remote` built (`patchRoutesOnNavigation`
in `apps/shell/src/exposed/App.tsx`) is not remote-specific and needs no
further change to support a second remote.

## The other half: what `apps/admin` must produce

For `entry` to resolve to something real, `apps/admin`'s
`ModuleFederationPlugin` config must declare `name: 'admin'` and expose
`./App` — the same shape `apps/dashboard`'s config already proved
(`specs/003-dashboard-remote/research.md` D1).

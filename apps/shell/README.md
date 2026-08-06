# apps/shell

The React host: reads a manifest-driven remote registry per environment and
composes federated regions into a single application. Built with Rspack and
Module Federation 2.0, configured as a host that exposes nothing of its own
(`ModuleFederationPlugin`'s `exposes` map is deliberately empty — the shell
composes, it doesn't get composed into).

It runs standalone with zero remotes registered — that has always been a
valid, tested state. As of sprint 4, `apps/dashboard` is registered in the
development registry (`src/internal/federation/remotes.dev.json`) and
composed at `/dashboard`, the first real remote this host has ever loaded
across a real network boundary.

Registered remotes are patched into the router lazily, via react-router 8's
`patchRoutesOnNavigation` (`src/exposed/App.tsx`) — not the simpler
imperative `router.patchRoutes` — because a hard navigation straight to a
remote's path needs the route to exist *before* the router decides there's
no match, not after. Origin control and MF registration still run eagerly at
startup regardless of navigation (`FR-016`–`FR-018`).

## Running it

```bash
pnpm --filter @enterprise-mfe/shell run dev    # http://localhost:3000
pnpm --filter @enterprise-mfe/shell run build
```

No configuration is required to start. `FEDERATION_ENV` defaults to `dev`.

## Structure

Split into `src/exposed/` and `src/internal/`, the same convention every
remote uses (constitution Principle I) — even though the shell is a host, not
a remote, and its `exposed/` currently has nothing to expose over federation.

```text
src/
├── exposed/
│   └── App.tsx              # what bootstrap.tsx mounts
├── internal/
│   ├── federation/           # registry fetch/validate, origin control, the MF loader
│   ├── routes/                # host-owned routes, the remote region component
│   ├── chrome/                 # layout + session indicator, from @enterprise-mfe/ui + auth
│   └── styles.css              # Tailwind entry, imports the design system's tokens
├── bootstrap.tsx              # the real entry point
└── index.tsx                  # dynamic import('./bootstrap') — the MF async boundary
```

## Switching environment

The remote registry is fetched at runtime from `/remotes.json`, which the
build copies from exactly one of three source files
(`remotes.dev.json` / `.staging.json` / `.production.json`) based on
`FEDERATION_ENV`. This is what makes environment switching a deployment
decision, not a rebuild: **one build serves all three environments**. See
[the registry contract](../../specs/002-shell-host/contracts/registry-contract.md)
for the file format and validation rules, and
[research.md D3](../../specs/002-shell-host/research.md) for why runtime fetch
was chosen over build-time injection.

## Origin control

The shell refuses to load a remote from an origin that isn't on the
registry's `allowedOrigins` list, and refuses insecure transport outside
local development. This runs before any remote code is fetched — see
`src/internal/federation/origin-guard.ts`.

## End-to-end tests

`e2e/` holds this project's first real Playwright suite — the shell composing
`apps/dashboard` across a real network boundary, not a simulated one
(`002-shell-host`'s research D7 deferred this until a real remote existed).

```bash
pnpm --filter @enterprise-mfe/shell run e2e
```

`playwright.config.ts` starts both the shell's and the dashboard's dev
servers itself; no manual setup is required.

# Contract: the remote registry file

**Feature**: `002-shell-host` | **Date**: 2026-08-03

This is the file a team edits to ship a remote, and the file an operator swaps to
move between environments. It is the shell's only configuration input. Shapes are
defined in [data-model.md](../data-model.md).

## Where it lives

| Path | Purpose |
|---|---|
| `apps/shell/src/internal/federation/remotes.dev.json` | development |
| `apps/shell/src/internal/federation/remotes.staging.json` | staging |
| `apps/shell/src/internal/federation/remotes.production.json` | production |
| `remotes.json` (beside the built assets) | what the running host actually fetches |

The build copies the file matching the selected environment to `remotes.json`.
**One build serves all three environments** — the deployed file is the
environment (research D3).

## Format

```jsonc
{
  "environment": "dev",
  "allowedOrigins": ["http://localhost:3001", "http://localhost:3002"],
  "remotes": [
    {
      "name": "dashboard",
      "entry": "http://localhost:3001/mf-manifest.json",
      "routePath": "/dashboard",
      "label": "Dashboard"
    }
  ]
}
```

An empty `remotes` array is valid and is the state this sprint ships in — no
remote exists until sprint 4.

## Rules the host enforces at startup

| Condition | Result |
|---|---|
| File missing or unparseable | Startup fails, naming the file and environment |
| `environment` not one of the three | Startup fails |
| Two registrations share a `name` | Startup fails, naming the duplicate |
| A `routePath` collides with a host-owned route | Startup fails, naming both |
| A remote's origin is absent from `allowedOrigins` | That remote is refused and dropped; the host starts |
| Insecure transport on a non-loopback origin | That remote is refused and dropped; the host starts |
| `entry` is not a valid URL | That remote is refused and dropped; the host starts |

The split is deliberate: a **malformed registry** is the operator's mistake and
stops the host, while a **refused remote** is contained like any other failure and
the rest of the application keeps working (`FR-018`).

## Adding a remote

1. Add one object to `remotes` in each environment file it should appear in.
2. Add its origin to `allowedOrigins` in those same files.
3. Nothing else. No file under `apps/shell/src` changes (`SC-003`).

## What is deliberately not here

- **No description of what the remote exposes.** The host mounts a remote's root
  component. A richer contract would be guesswork until a real remote exists.
- **No per-remote feature flags or ordering.** Speculative until something needs
  them.
- **No credentials or tokens.** The registry is public: it ships beside the
  static assets and anyone can read it. Nothing secret may ever go in it.

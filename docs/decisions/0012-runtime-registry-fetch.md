# 0012 — The remote registry is fetched at runtime, not compiled in

**Status:** Accepted

## Context

The shell needs to know, per environment, which remotes exist and where their
entry points live. The obvious approach — inject the registry at build time,
for example via Rspack's `DefinePlugin` — makes environment a build-time
concern: staging and production would be different builds of the same source,
and the artifact that was tested is not the artifact that ships. That
contradicts the architectural claim this project makes: that switching
environment is switching a file, never recompiling.

## Decision

The registry is fetched at runtime. Three source files
(`remotes.dev.json`, `remotes.staging.json`, `remotes.production.json`) live
in the shell's source. The build copies exactly one — selected by
`FEDERATION_ENV`, defaulting to `dev` — to `remotes.json` beside the built
assets. At startup, the shell fetches `/remotes.json` over the network,
validates it, and only then registers any remotes.

**One build, three deployments.** The same compiled JavaScript runs in every
environment; only the deployed `remotes.json` differs.

## Consequences

- There is a network round trip before any remote can load. The shell's frame
  renders immediately regardless — it never waits on this fetch — and an
  empty or slow registry is a valid, tested state, not an error.
- A malformed, missing, or environment-mismatched registry is a startup-time
  failure that names the file and the environment. It is not a silent
  fallback to a default.
- Adding a remote, or moving the host between environments, touches exactly
  one file — verified directly by building for two different environments and
  confirming zero application source files changed.
- The origin allow-list travels with the registry (same file, same fetch), so
  reviewing what the host may execute is one place, not a search across build
  configuration and source.

## Alternatives considered

- **Build-time injection** (`DefinePlugin` or equivalent) — rejected: breaks
  the one-build guarantee, and couples a deployment decision to a rebuild.
- **A registry served from an API** — rejected: this project is deliberately
  frontend-only (see ADR-0009's auth strategy for the same reasoning); adding
  a backend just to serve a static list of remotes is disproportionate.

## Related

`specs/002-shell-host/research.md`, decision D3, has the full reasoning
recorded during planning. `specs/002-shell-host/contracts/registry-contract.md`
documents the file format itself.

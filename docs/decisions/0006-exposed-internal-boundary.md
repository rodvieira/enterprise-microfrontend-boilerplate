# 0006 — exposed/ vs internal/ as the contract boundary

**Status:** Accepted

## Context

Module Federation does not prescribe any folder structure. Without an explicit
convention, nothing stops a remote's implementation details from leaking into
what other apps depend on, making refactors risky across team boundaries.

## Decision

Every app under `apps/*` splits its `src/` into:

- `exposed/` — the only code listed in that app's `federation.config.ts`
  `exposes` map. This is the public contract.
- `internal/` — business logic, private to that app. Never imported from
  outside, even across federation.

## Consequences

This is a convention, not a technical guarantee — see ADR-0007 for how the
boundary is actually enforced (repository topology + `dependency-cruiser`).
Anyone integrating a new remote can read this rule once and know exactly what's
safe to depend on.

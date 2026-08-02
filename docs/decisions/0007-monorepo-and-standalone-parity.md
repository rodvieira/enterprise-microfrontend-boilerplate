# 0007 — Dual-repo readiness: monorepo convenience, separate-repo discipline

**Status:** Accepted

## Context

Real enterprise adoption of this boilerplate will not always keep every remote
in one monorepo — different teams often own separate repositories with
different deploy cadences. A separate repository enforces the exposed/internal
boundary (ADR-0006) for free: there is no relative import path to another
repository. A monorepo does not enforce this automatically — a relative import
across `apps/*` still compiles and runs, even though it violates the intended
architecture.

## Decision

1. Never use relative imports across apps, even inside this monorepo.
2. Enforce rule 1 in CI via `dependency-cruiser` (`.dependency-cruiser.js`,
   `pnpm check:boundaries`), not just by convention.
3. The scaffolding generator (see ADR-0008) ships two output modes:
   monorepo-mode (workspace-linked) and standalone-mode (independent project
   consuming `packages/*` as published dependencies via GitHub Packages,
   published through Changesets).

## Consequences

A remote can move from `apps/*` in this monorepo to its own repository later
without any code changes to the boundary — because the boundary was never
allowed to depend on being in the same repository in the first place.

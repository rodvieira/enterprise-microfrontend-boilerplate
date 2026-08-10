# 0005 — pnpm workspaces + Turborepo for the monorepo

**Status:** Accepted

## Context

`docs/blueprint.html` §2 names this as the project's fifth key decision;
like ADR-0004, no ADR recorded it until `007-docs-security`'s audit
surfaced the gap (research D4). Backfilled into its reserved number — every
other §2 item already has a 1:1-numbered ADR except this one and 0004.

This project has used pnpm workspaces (`pnpm-workspace.yaml`) and
Turborepo (`turbo.json`) since its earliest commits; this ADR documents an
already-fully-in-effect decision, not a new one.

## Decision

pnpm workspaces for dependency management (single hoisted `node_modules`
at the repository root — see
[ADR-0011](0011-hoisted-node-modules.md) for why hoisted rather than
pnpm's default strict-isolation layout) and Turborepo for task
orchestration and caching (`turbo build`/`test`/`typecheck`/`e2e`, each
declared once in `turbo.json` and inherited by every workspace member).
Scaffolding uses Turborepo's own generator toolkit (`@turbo/gen`, Plop
under the hood) — see
[ADR-0014](0014-generator-dual-mode.md) — rather than a separate
scaffolding tool.

## Rationale

Consistency with the author's other projects, the same reasoning
ADR-0004 gives for the React/TypeScript/Tailwind stack: one set of
conventions across a portfolio, not a bespoke setup per repository.

**Nx was considered and rejected.** Nx's generators are the strongest in
the monorepo-tooling ecosystem, but adopting them requires adopting Nx as
the permanent monorepo tool — its generators are not a standalone,
extractable piece. Turborepo's own generators (`@turbo/gen`, Plop-based)
achieve the same scaffolding goal (proven in `006-remote-generator`:
`pnpm turbo gen remote`, dual-mode output) without that lock-in — a project
already committed to Turborepo for build orchestration gains scaffolding
for free rather than adding a second monorepo framework's worth of
concepts.

## Consequences

Every workspace member (`apps/*`, `packages/*`) is declared in
`pnpm-workspace.yaml` and gets its build/test/typecheck/lint tasks
orchestrated through `turbo.json`'s task graph — `pnpm build` always means
`turbo build`, never a hand-written loop over packages. The generator
(`turbo/generators/`) is discovered automatically by `pnpm gen`
(`turbo gen`), with no separate scaffolding-tool dependency to install or
maintain (Constitution Principle IX — no dependency without justification;
here, the justification is that Turborepo already provides this).

## Related

`docs/blueprint.html` §2 item 05.
`docs/decisions/0008-generator-after-two-remotes.md` and
`docs/decisions/0014-generator-dual-mode.md` (what was built on top of this
choice). `docs/decisions/0011-hoisted-node-modules.md` (the pnpm-specific
follow-on decision).

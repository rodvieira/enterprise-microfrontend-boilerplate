# 0004 — React 19 + TypeScript strict + Tailwind CSS

**Status:** Accepted

## Context

`docs/blueprint.html` §2 names this stack decision as the project's fourth
key decision, but no ADR recorded it — found during `007-docs-security`'s
audit of blueprint §2 against `docs/decisions/*.md` (research D4), which
surfaced this and ADR-0005 as the only two of ten §2 decisions without a
matching file. Backfilled here into the number the existing sequence
already reserves for it (0003 and 0006 are both already written; nothing
else was ever numbered 0004).

Every app (`apps/shell`, `apps/dashboard`, `apps/admin`) and shared package
already uses this stack — this ADR documents a decision already fully in
effect since the project's earliest sprints, not a new choice.

## Decision

React 19, TypeScript in strict mode (`packages/config-typescript`'s
`tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
all on), and Tailwind CSS for styling, applied uniformly across every app
and package.

## Rationale

Consistency with the rest of the author's portfolio — the same stack
choice other projects already use, rather than introducing a second set of
conventions a reader would have to learn just for this repository.
Tailwind has official Rspack support (PostCSS-based,
`@tailwindcss/postcss`) confirmed against Tailwind's own framework guide
(ADR-0002's research already established Rspack as the bundler; this
decision depends on that one holding).

TypeScript strict mode specifically (not TypeScript's default, looser
configuration) matches this project's own stated priorities:
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` catch exactly
the class of bug a federation boundary makes expensive to discover late —
a shape mismatch between what one app exposes and what another expects to
consume, surfaced at compile time in each app's own build rather than at
runtime after composition.

## Consequences

Every new app or package extends
`@enterprise-mfe/config-typescript/tsconfig.base.json` (or
`tsconfig.react.json` for anything rendering JSX) rather than defining its
own compiler options — see `docs/packages.md`. The sprint-7 generator's
templates inherit this by construction (monorepo mode) or inline the same
options directly (standalone mode, since `@enterprise-mfe/config-typescript`
is a monorepo-only package, never published — see ADR-0014). Tailwind's own
content-scanning gotcha (a remote's exposed entry must import its
stylesheet directly, not only through its standalone `bootstrap.tsx`) is
documented in `docs/architecture.md`'s "Remotes" section, found while
building `apps/dashboard`.

## Related

`docs/blueprint.html` §2 item 04. `docs/decisions/0002-rspack-over-vite.md`
(the bundler this stack builds on). `packages/config-typescript/README.md`.

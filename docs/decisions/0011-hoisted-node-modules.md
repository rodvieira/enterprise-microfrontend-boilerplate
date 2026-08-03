# 0011 — Single hoisted node_modules, with the isolation moved into CI

**Status:** Accepted

## Context

pnpm's default layout gives every workspace package its own `node_modules`
containing symlinks to exactly the dependencies that package declares. Nothing is
duplicated — the symlinks point into one content-addressed store at the root —
but the directories are visible in every package folder.

That layout is not only cosmetic. It is what makes an undeclared import fail
immediately: a package can only resolve what is linked into it. Verified before
this change — `packages/ui` importing `@enterprise-mfe/auth`, a package it does
not declare, failed with TS2307.

The maintainer prefers a single `node_modules` at the repository root rather than
one directory per package.

## Decision

Use pnpm's hoisted layout:

```ini
# .npmrc
node-linker=hoisted
hoist-workspace-packages=true
```

Enforce the lost guarantee in CI instead, with a third `dependency-cruiser` rule:

```js
{
  name: 'no-undeclared-dependencies',
  severity: 'error',
  from: { path: '^(apps|packages)/' },
  to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
}
```

A module that imports a package its own `package.json` does not declare now fails
`pnpm check:boundaries`.

## Consequences

- External dependencies resolve from the root only. React is installed once and
  appears in no package directory.
- **Per-package `node_modules` does not disappear entirely.** pnpm still links a
  package's *workspace* dependencies into it — that is how the dependency graph
  is expressed, and `hoist-workspace-packages` only adds a root copy on top. What
  remains is 24 KB of symlinks across all packages. Removing it would mean not
  declaring workspace dependencies at all, which is the phantom-dependency
  problem this ADR exists to contain.
- The failure mode moves from "immediate, local, at the point of import" to "at
  the boundary gate". That is strictly later feedback. It is acceptable because
  the gate runs on `pre-push` and in CI, so nothing reaches `main` unchecked.
- Applying the rule immediately found a pre-existing violation that the old
  layout had never surfaced: test files in `packages/ui`, `packages/auth`, and
  `packages/shared-types` imported `vitest` and `@testing-library/*` from the
  root without declaring them. Node's upward resolution had always allowed this.
  Each package now declares its own test tooling, which is also what ADR-0007
  requires for a package to be extractable to its own repository.

## Relationship to ADR-0007

ADR-0007 requires that a remote can move to its own repository without changing a
line of its code. The hoisted layout weakens that guarantee at the filesystem
level and the new rule restores it at the gate level. Anyone considering removing
the rule should read ADR-0007 first: without it, an undeclared import breaks on
the day of extraction, when it is most expensive to find.

## Alternatives considered

- **Keep pnpm's default isolated layout** — the strongest guarantee, rejected on
  the maintainer's preference for a single root directory after the trade-off was
  laid out.
- **Hide the directories in the editor instead** (`files.exclude`) — addresses
  the visible symptom without touching resolution. Rejected as a half-measure
  here, but it remains available and costs nothing.

# Public Contract: shared configuration and the drift gate

**Feature**: `001-shared-packages-foundation` | **Date**: 2026-08-02

Covers `@enterprise-mfe/config-typescript`, `@enterprise-mfe/config-biome`,
`@enterprise-mfe/shared-types`, and `scripts/check-shared-deps.ts`.

## `@enterprise-mfe/config-typescript`

Exposes two files consumed by `extends`:

| File | Purpose |
|---|---|
| `tsconfig.base.json` | Strict settings every package and app inherits. |
| `tsconfig.react.json` | Extends the base, adds JSX settings for packages that render. |

Consumed as:

```jsonc
{ "extends": "@enterprise-mfe/config-typescript/tsconfig.react.json" }
```

`tsconfig.base.json` MUST exist at exactly that path — `.dependency-cruiser.js`
already points at `packages/config-typescript/tsconfig.base.json`, so
`pnpm check:boundaries` cannot resolve the workspace until it does (research D6).

**Guarantees**: `strict` is on; a package extending this needs no local
compiler-option copies (FR-016, FR-018, SC-006).

## `@enterprise-mfe/config-biome`

Exposes `biome.json` for consumption via Biome's `extends`.

**Guarantee**: identical to the rules already enforced at the repository root —
single quotes, semicolons, two-space indent, width 100, `noUnusedVariables` as an
error. Adopting it reformats nothing that exists today (FR-017). The root
`biome.json` is the source those values are copied from, and the copy is verified
by running `pnpm lint` after the switch and observing zero changes.

## `@enterprise-mfe/shared-types`

Type declarations only, no runtime code (FR-014). Full shapes are in
[data-model.md](../data-model.md).

```ts
export type { User, Role, Permission, RemoteAppProps, WithClassName };
export { ROLE_PERMISSIONS };
```

`ROLE_PERMISSIONS` is the one exception to "no runtime code": a frozen lookup
table mapping each role to its permissions. It is data, not behavior, and both
the admin remote (which changes roles) and the dashboard (which reacts) must read
the same table rather than each hard-coding it.

## `scripts/check-shared-deps.ts`

The gate behind `pnpm check:shared-deps` (FR-012, Principle III).

**Input**: every `package.json` under `apps/*` and `packages/*`. A missing
directory is not an error — `apps/` does not exist yet.

**Checks**: for each singleton — `react`, `react-dom`, `@enterprise-mfe/auth`,
and `@enterprise-mfe/event-bus` when it exists — the declared version range must
be byte-identical everywhere it is declared, across `dependencies`,
`devDependencies`, and `peerDependencies`.

**Output**:

- Agreement: one line per singleton, exit code `0`.
- Divergence: a table of package → declared range → where, naming which
  manifests disagree, exit code `1`. It reports; it never edits a manifest —
  choosing the correct version is a human decision (mirrors the behavior already
  specified in `.claude/agents/shared-deps-guard.md`).

**Extension point**: the singleton list is an explicit constant with a comment
pointing at Principle III. Adding a stateful shared package means adding it here
in the same change — the rule `.claude/commands/add-shared-package.md` already
tells contributors to follow.

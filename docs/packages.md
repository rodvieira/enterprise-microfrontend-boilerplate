# Shared packages

Everything under `packages/` is consumed by more than one app. The catalog below
mirrors `docs/blueprint.html` §7; the four packages listed as *planned* arrive in
later sprints.

| Package | Solves | Singleton |
|---|---|---|
| [`@enterprise-mfe/ui`](../packages/ui) | Working design system — Button, Input, Modal, Table, Toast, Layout, Nav. Not empty; something real renders on clone. | No |
| [`@enterprise-mfe/auth`](../packages/auth) | Shared session contract: `useAuth()`, `<ProtectedRoute>`, `<AuthProvider>`. Stub implementation by default — see ADR-0009. | **Yes** |
| [`@enterprise-mfe/shared-types`](../packages/shared-types) | TypeScript contracts between shell and remotes — `User`, `Permission`, exposed component prop types. | No |
| [`@enterprise-mfe/config-typescript`](../packages/config-typescript) | Shared strict tsconfig, extended by every package and app. | No |
| [`@enterprise-mfe/config-biome`](../packages/config-biome) | Shared lint and format rules. | No |
| `@enterprise-mfe/federation-utils` | *Planned (sprint 3)* — a `useRemote()` hook wrapping `React.lazy` + Suspense + error boundary, so no remote hand-rolls federation loading. | No |
| `@enterprise-mfe/event-bus` | *Planned (sprint 6)* — typed pub/sub for cross-remote communication without direct coupling. | **Yes** |
| `@enterprise-mfe/telemetry` | *Planned (sprint 8)* — thin observability wrapper. | No |
| `@enterprise-mfe/testing-utils` | *Planned (sprint 6)* — mocks and helpers for testing federation-consuming components. | No |

## Dependency direction

```text
config-typescript ──▶ (every package and app, via tsconfig extends)
config-biome      ──▶ (every package and app, via biome extends)

shared-types ──▶ auth
      │
      └────────▶ ui
```

`shared-types` depends on nothing. `ui` never depends on `auth` — the design
system stays free of domain knowledge, so a component cannot start assuming a
session exists.

## Adding a package

Use `.claude/commands/add-shared-package.md`, or by hand:

1. `packages/<name>/package.json` named `@enterprise-mfe/<name>`, with `exports`
   pointing at `./src/index.ts` — one public entry, always.
2. `tsconfig.json` extending `@enterprise-mfe/config-typescript`.
3. A `README.md` stating in one paragraph what it solves.
4. A row in the table above.
5. **If it holds state or a React context consumed by more than one app**, add it
   to `SINGLETONS` in `scripts/check-shared-deps.ts` in the same change. This is
   not optional — it is how `auth` is protected, and skipping it reintroduces the
   exact class of bug the guard rail exists to catch (constitution Principle III).

## Where dependencies live

There is one `node_modules`, at the repository root (`node-linker=hoisted` in
`.npmrc` — see [ADR-0011](decisions/0011-hoisted-node-modules.md)). React is
installed once and appears in no package directory.

The small `node_modules` you will still see inside a package holds only symlinks
to its *workspace* dependencies — that is how pnpm expresses the graph, and it is
24 KB across all packages.

Because everything else is hoisted, an undeclared import resolves anyway and
nothing fails locally. **Declare every package you import in that package's own
`package.json`**, including test tooling. `pnpm check:boundaries` enforces this
through the `no-undeclared-dependencies` rule, and it is what lets a package be
extracted to its own repository later (ADR-0007).

## No build step

Packages ship TypeScript source: `exports` points at `src/index.ts` and the
consuming application compiles it. There is no `dist/`. When standalone mode
(ADR-0007) needs publishable artifacts, a build step is added then — to packages
that already have real consumers proving the output shape.

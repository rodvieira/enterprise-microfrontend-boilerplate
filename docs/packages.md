# Shared packages

Everything under `packages/` is consumed by more than one app. The catalog below
mirrors `docs/blueprint.html` §7; the four packages listed as *planned* arrive in
later sprints.

| Package | Solves | Singleton |
|---|---|---|
| [`@enterprise-mfe/ui`](../packages/ui) | Working design system — Button, Card, Input, Modal, Table, Toast, Layout, Nav. Not empty; something real renders on clone. | No |
| [`@enterprise-mfe/auth`](../packages/auth) | Shared session contract: `useAuth()`, `<ProtectedRoute>`, `<AuthProvider>`. Stub implementation by default — see ADR-0009. | **Yes** |
| [`@enterprise-mfe/shared-types`](../packages/shared-types) | TypeScript contracts between shell and remotes — `User`, `Permission`, exposed component prop types. | No |
| [`@enterprise-mfe/config-typescript`](../packages/config-typescript) | Shared strict tsconfig, extended by every package and app. | No |
| [`@enterprise-mfe/config-biome`](../packages/config-biome) | Shared lint and format rules. | No |
| [`@enterprise-mfe/federation-utils`](../packages/federation-utils) | `useRemote()` + `RemoteBoundary` — remote loading and error containment, so no app hand-rolls federation loading mechanics. Bundler- and MF-agnostic by design (a loader function, not `React.lazy`/Suspense) — see research D5. | No |
| [`@enterprise-mfe/event-bus`](../packages/event-bus) | Typed pub/sub for cross-remote communication without direct coupling — the mechanism behind the admin → dashboard live role-change/KPI-update demo. Same-tab delivery plus a same-origin `BroadcastChannel` relay for cross-tab delivery — see `004-admin-remote` research D2. | **Yes** |
| [`@enterprise-mfe/telemetry`](../packages/telemetry) | Remote-observability contract: `<TelemetryProvider>`, `useTelemetry()`, and four events separating a load failure from a render crash. Console-backed by default, no vendor — see ADR-0023 and `docs/how-to-connect-telemetry.md`. | **Yes** |
| `@enterprise-mfe/testing-utils` | *Planned (sprint 6)* — mocks and helpers for testing federation-consuming components. | No |

## Dependency direction

```text
config-typescript ──▶ (every package and app, via tsconfig extends)
config-biome      ──▶ (every package and app, via biome extends)

shared-types ──▶ auth
      │
      ├────────▶ ui
      │
      └────────▶ event-bus

federation-utils   (depends on nothing but react — no bundler, no MF runtime)
```

`shared-types` depends on nothing. `ui` never depends on `auth` — the design
system stays free of domain knowledge, so a component cannot start assuming a
session exists. `federation-utils` depends on nothing in this workspace either
— the federation-specific half of remote loading lives in the app that
consumes it (`apps/shell/src/internal/federation/loader.ts`), not in the
package, so the package itself stays testable with a plain loader function.
`event-bus` depends on `shared-types` for the one domain type its current
event payload carries (`Role`) — not on `auth`, `ui`, or anything else; it
knows nothing about sessions or rendering.

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
consuming application compiles it. There is no `dist/`.

Standalone mode (ADR-0007, sprint 7 — `pnpm turbo gen remote`, ADR-0014)
now exists, and `@enterprise-mfe/auth`, `@enterprise-mfe/event-bus`,
`@enterprise-mfe/shared-types`, and `@enterprise-mfe/ui` are publish-ready:
non-private, with `publishConfig` pointing at GitHub Packages, versioned and
released through a real `.changeset/config.json` +
`.github/workflows/publish-packages.yml`. **A build step producing `dist/`
is still not part of that mechanism** — a standalone consumer's own bundler
typically excludes `node_modules` from its loader rules by default (see
`turbo/generators/remote/templates/common/rspack.config.ts.template`), so
installing these packages from GitHub Packages today would resolve
correctly but likely fail to build without one. This sprint's scope was the
publish mechanism itself, confirmed with the user rather than assumed
(ADR-0014) — adding a `dist/` build is real, separate follow-up work, not
forgotten.

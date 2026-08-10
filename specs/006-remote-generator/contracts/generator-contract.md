# Contract: `pnpm turbo gen remote`

What running the generator guarantees, for either mode. This is the contract
`tasks.md` implements against and `quickstart.md` validates against.

## Invocation

```bash
pnpm turbo gen remote
```

Interactive prompts only — no flags are required for a first run. (A
non-interactive flag form may exist for scripting, but is not required by
this feature's acceptance criteria.)

## Preconditions (checked before any prompt is trusted, FR-014)

1. Run from the monorepo root (`apps/dashboard` and `apps/admin` both exist
   — the two real remotes the templates were extracted from; their absence
   means a partial/corrupted checkout, not a valid target).
2. `name` does not collide with an existing `apps/*` directory, is not a
   reserved name, and is a legal package-name segment.
3. `routePath` does not collide with `HOST_OWNED_ROUTE_PATHS` or any
   existing remote's `routePath`.
4. (Standalone mode only) `outputPath` resolves outside the monorepo root,
   and does not already contain a non-empty directory.

Any precondition failure MUST refuse before writing any file and MUST name
the specific reason (FR-004, FR-013, edge cases).

## Postconditions — monorepo mode

Given valid input, after the generator exits successfully:

- `apps/<name>/` exists with: `package.json`, `tsconfig.json`,
  `rspack.config.ts`, `postcss.config.mjs`, `index.html`,
  `src/index.tsx`, `src/bootstrap.tsx`, `src/exposed/App.tsx`,
  `src/internal/` (placeholder content).
- `apps/<name>/package.json`'s `dependencies` include `@enterprise-mfe/auth`
  and `@enterprise-mfe/event-bus` at `workspace:*`, and `react`,
  `react-dom`, `react-router` at the exact ranges live-read from
  `apps/dashboard/package.json` (research D3).
- `apps/<name>/rspack.config.ts`'s `ModuleFederationPlugin` exposes exactly
  `{ './App': './src/exposed/App.tsx' }` and declares the same `shared`
  singleton block as `apps/dashboard`/`apps/admin`.
- `apps/shell/src/internal/federation/remotes.dev.json` gains one entry
  (data-model.md's `DevRegistryEntry`) and, if needed, one `allowedOrigins`
  addition.
- `docs/architecture.md`'s "Remotes" section gains one line naming the app.
- Console output states: files created, the registry entry added, the docs
  line added, and that staging/production registration was **not** done
  (FR-015).
- From a clean install, `pnpm build`, `pnpm test`, `pnpm lint`,
  `pnpm typecheck`, `pnpm check:boundaries`, and `pnpm check:shared-deps`
  all pass for the whole workspace, unmodified (FR-008).

## Postconditions — standalone mode

Given valid input, after the generator exits successfully:

- `<outputPath>/` exists, outside the monorepo, with the same file set as
  monorepo mode's `apps/<name>/` (minus anything monorepo-specific), plus
  `.npmrc` configured for GitHub Packages.
- `<outputPath>/package.json`'s `@enterprise-mfe/*` dependencies are
  published semver ranges, never `workspace:*`.
- `<outputPath>/README.md` states the install prerequisite plainly: these
  packages must have been published at least once, or `pnpm install` will
  fail, and that failure is expected before this project's first real
  publish (FR-020).
- Nothing under this monorepo (`apps/shell`, `docs/`, `remotes.dev.json`)
  changes — standalone mode never writes to a registry it doesn't own
  (User Story 4, Acceptance Scenario 4).
- No live publish to GitHub Packages occurs as part of generation (FR-019).

## Failure contract

Every refusal (name collision, route collision, invalid name, existing
non-empty output directory, missing `apps/dashboard`/`apps/admin`) prints
the specific reason and exits non-zero, leaving the workspace byte-for-byte
unchanged — no partial `apps/<name>` or partial standalone output directory
is ever left behind by a rejected run.

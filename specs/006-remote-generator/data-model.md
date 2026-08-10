# Phase 1 Data Model: Remote Generator

This feature has no runtime domain data — no database, no API payloads
consumed by an end user. The "entities" below are the generator's own
inputs and file-system outputs, recorded here because `data-model.md` is
where their shape and validation rules live before `tasks.md` breaks them
into implementation steps.

## GeneratorPrompt (input)

The validated answer set collected before any file is written (FR-002,
FR-014).

| Field | Type | Validation |
|---|---|---|
| `mode` | `'monorepo' \| 'standalone'` | Required; determines which template set and which actions run. |
| `name` | `string` | kebab-case, valid npm package-name segment, not `shell`, not an existing `apps/*` directory (FR-013). |
| `routePath` | `string` | Starts with `/`; no collision with `HOST_OWNED_ROUTE_PATHS` or any existing remote's `routePath` in `remotes.dev.json` (FR-012, reusing `apps/shell/src/internal/federation/manifest.ts`'s collision semantics). |
| `label` | `string` | Non-empty; shown in shell navigation. |
| `outputPath` | `string \| undefined` | Standalone mode only (D4); required when `mode === 'standalone'`, must resolve outside the monorepo root. |

## GeneratedRemote (output — monorepo mode)

A rendered `apps/<name>` directory. Fields below describe what varies
per-generation; everything else is `templates/common/`, unparameterized
beyond name/title/port substitution (research D1).

| Field | Derived from |
|---|---|
| `packageName` | `@enterprise-mfe/<name>` |
| `federationName` | `<name>` (matches `ModuleFederationPlugin`'s `name`, and `remotes.dev.json`'s `name`) |
| `devServerPort` | Next free port after existing registry entries (research D6) |
| `sharedDependencyVersions` | Read live from `apps/dashboard/package.json` at generation time (research D3) — never a template literal |

## GeneratedRemote (output — standalone mode)

Structurally identical to the monorepo variant (same `federationName`,
same `src/exposed`/`src/internal` split, same `ModuleFederationPlugin`
shape) with two differences:

| Field | Monorepo mode | Standalone mode |
|---|---|---|
| `@enterprise-mfe/*` dependency ranges | `workspace:*` | Published semver range, resolved via the registry config below |
| Registry config | None (hoisted root `node_modules`, ADR-0011) | `.npmrc` pointing at GitHub Packages for the `@enterprise-mfe` scope |
| Location | `apps/<name>` inside this monorepo | `outputPath`, outside this monorepo entirely |

## DevRegistryEntry (output — monorepo mode only)

One object appended to `remotes.dev.json`'s `remotes` array (contract
already defined by `specs/002-shell-host/contracts/registry-contract.md`,
reused verbatim — this feature does not redefine it):

```jsonc
{
  "name": "<name>",
  "entry": "http://localhost:<devServerPort>/mf-manifest.json",
  "routePath": "<routePath>",
  "label": "<label>"
}
```

`allowedOrigins` gains `http://localhost:<devServerPort>` in the same write
if not already present (it won't be, for a genuinely new port).

## DocsEntry (output — monorepo mode only)

One line appended to `docs/architecture.md`'s "## Remotes" section, naming
the new app alongside the existing `apps/dashboard` (sprint 4) / `apps/admin`
(sprint 5) sentences (FR-011). Not a table row — that section is prose, and
the generator's edit matches its existing style rather than introducing a
new structure mid-document.

## PackagePublishConfig (output — infrastructure, not per-generation)

Added once, to every `packages/*/package.json`, not regenerated per remote:

| Field | Value |
|---|---|
| `publishConfig.registry` | GitHub Packages URL for this project's scope (research D5) |
| `publishConfig.access` | `restricted` (GitHub Packages default for scoped packages) |

## State / lifecycle

No entity here has a runtime state machine — generation is a single
validate-then-write operation (FR-014: all validation before any write).
The only "state" that persists across runs is `remotes.dev.json` itself
(read for port/collision derivation, then appended to) and the set of
`apps/*` directories on disk (read for name-collision checks).

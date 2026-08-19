# @enterprise-mfe/config-biome

The lint and format rules every package and app inherits — single quotes,
semicolons, two-space indent, width 100, unused variables as an error, and
Biome's recommended set including its accessibility rules. It exists for the same
reason as the shared TypeScript config: rules that are copied are rules that
drift, and the first copy is where the drift starts. Extend this rather than
restating a rule locally.

## Usage

```jsonc
// biome.json
{
  "extends": ["./packages/config-biome/biome.json"]
}
```

## Why a relative path

Biome 1.9 resolves `extends` relative to the configuration file and does not look
in `node_modules`, so the package-name form
(`@enterprise-mfe/config-biome/biome.json`) does not work yet. That is fine
inside this monorepo and a real problem for standalone-mode remotes in their own
repositories — tracked in issue #1, resolved by moving to Biome 2.x.

## Overriding

Project-specific exceptions belong in the consuming `biome.json` under
`overrides`, not in this package. The root config does exactly that for one file,
`apps/admin/src/internal/ui/modal.tsx`, where a suppression comment cannot attach
to the JSX attribute the rule fires on.

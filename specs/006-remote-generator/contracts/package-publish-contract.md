# Contract: `packages/*` publish readiness

What standalone mode's dependency resolution requires to be true of
`packages/*` — introduced this sprint as real infrastructure, never
self-triggered (spec FR-018, FR-019; research D5).

## Per-package requirements

Every `packages/*/package.json` that a generated remote can depend on
(`@enterprise-mfe/auth`, `@enterprise-mfe/event-bus`, and transitively
`@enterprise-mfe/shared-types`, `@enterprise-mfe/ui`) MUST declare:

```jsonc
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  }
}
```

This is a no-op until a publish actually runs — it does not change how the
package resolves inside this monorepo's own hoisted `node_modules` (ADR-0011
is unaffected).

## Versioning and publish workflow

- `.changeset/config.json` designates `packages/*` as the linked/publishable
  set (`apps/*` are never published — a remote is deployed, not consumed as
  a dependency).
- `.github/workflows/publish-packages.yml` runs `changeset version` and
  `changeset publish` on a manual (`workflow_dispatch`) or release-tag
  trigger only — never on the `quality` job's existing `push`/`pull_request`
  triggers.
- A dry run (`changeset publish --dry-run` or equivalent, against a scoped
  test registry or `--no-git-tag`/local verdaccio if used for validation)
  MUST be exercised during this feature's own development to prove the
  workflow is correct, without that dry run ever touching the real GitHub
  Packages registry.

## What standalone-mode generation checks, and what it doesn't

The generator itself does **not** verify that a real publish has already
happened — doing so would require a network call to GitHub Packages during
generation, which is unnecessary for producing structurally correct output
and would make the generator depend on network access and registry
credentials just to scaffold a placeholder app. Instead:

- The generated `package.json`'s dependency ranges and `.npmrc` are correct
  by construction, regardless of whether anything has been published yet.
- The generated `README.md` states plainly that install will fail until a
  first publish exists (FR-020) — this is a documented, expected state, not
  a generator bug (spec edge case).

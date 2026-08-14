# 0020 — Publishable packages build to `dist/`, via `publishConfig.exports`

**Status:** Accepted

**Supersedes:** the `packages/*` raw-source portion of
[ADR-0014](0014-generator-dual-mode.md)'s "What's deliberately not proven yet"

## Context

ADR-0014 shipped the publish *mechanism* (Changesets, GitHub Packages,
`publishConfig`) and recorded, honestly, that it stopped short: every
package's `exports` pointed at `./src/index.ts`, so anyone installing one
would get raw TypeScript their bundler excludes from its loader rules by
default. It also noted no package had a build step at all — which meant
`publish-packages.yml`'s own `pnpm build` was a silent no-op for
`packages/*`.

Two things made that gap urgent rather than theoretical:

1. **Standalone mode depends on it.** The generator's standalone output
   declares `@enterprise-mfe/*` at published semver ranges, so
   `pnpm install` in a generated project resolves to packages that cannot
   compile.
2. **`pnpm eject` ([ADR-0021](0021-eject-adoption-path.md)) hands every
   adopting company its own scope.** They will publish `@acme/ui` to their
   own registry on day one and hit the exact same wall. The problem is no
   longer "our packages are unpublished"; it is "this boilerplate cannot
   produce a publishable package at all".

## Decision

**Build with `tsup`, but keep local resolution pointed at source.**

- The four publishable packages (`ui`, `auth`, `event-bus`,
  `shared-types`) gain
  `tsup src/index.ts --format esm --dts --clean`. `packages/ui` adds
  `--publicDir src/styles` so `tokens.css` is copied verbatim rather than
  bundled — it is Tailwind directives a consumer imports into their own
  CSS, not something to transform.
- `exports` still points at `./src/index.ts`. `publishConfig.exports`
  points at `./dist/`, and npm/pnpm swap it in at publish time.
- `files: ["dist"]` keeps source out of the tarball.

Keeping `exports` on source is the point, not an oversight: it is what
lets the apps import packages with no build step and lets `pnpm dev`
hot-reload a change to `packages/ui`. Pointing `exports` at `dist/`
directly would have traded that DX away for nothing a consumer can
observe.

`federation-utils` is unchanged: it stays `private: true` (ADR-0014), is
host-side only, and no standalone remote depends on it.

## The gate

A swap that only happens at publish time is invisible to every normal
build, test, and typecheck run — precisely the shape of failure this
project builds guard rails for. `pnpm check:package-exports`
(`scripts/check-package-exports.ts`, wired into CI after `Build`) packs
each package for real and asserts every path the *published* manifest
advertises exists inside the tarball. It reports and never edits, the
same contract `check-shared-deps.ts` has.

It was verified to fail, not just to pass: emptying one package's `files`
array makes it exit non-zero and name the missing paths.

## Consequences

- `pnpm build` now builds `packages/*` before the apps. Turborepo's
  existing `"build": { "dependsOn": ["^build"] }` already ordered this;
  there was simply nothing to order before.
- A first real publish is still a maintainer's deliberate action. What
  changed is that the artifact it would produce is now correct, and CI
  proves it on every push instead of leaving it to be discovered by
  whoever installed the package.
- Adding a publishable package means adding `build`, `files`, and
  `publishConfig.exports` to it — otherwise `check:package-exports`
  skips it silently, since a package with no `publishConfig.exports` has
  no published shape to verify.

## Alternatives considered

- **Point `exports` at `dist/` directly** — rejected: it breaks
  `pnpm dev` hot-reload for `packages/*` and forces a build before
  typecheck, buying nothing a consumer can tell apart from the
  `publishConfig` swap.
- **Publish raw source and tell consumers to transpile `node_modules`** —
  rejected: it pushes this repo's build configuration into every
  consumer's bundler, which is the coupling ADR-0007 exists to avoid.

## Related

`docs/decisions/0014-generator-dual-mode.md` — where this gap was first
recorded. `scripts/check-package-exports.ts`,
`.github/workflows/publish-packages.yml`.

# Quickstart: validating the remote generator

Two independent validation paths, one per output mode. Neither requires
real GitHub Packages credentials.

## 1. Monorepo mode (User Stories 1, 2, 4)

```bash
pnpm turbo gen remote
# mode: monorepo
# name: scratch-remote
# routePath: /scratch-remote
# label: Scratch Remote
```

Expected, with zero manual edits afterward:

```bash
pnpm install
pnpm build            # apps/scratch-remote builds alongside the rest
pnpm test
pnpm lint
pnpm typecheck
pnpm check:boundaries   # passes — exposed/internal split correct by construction
pnpm check:shared-deps  # passes — versions matched apps/dashboard's at gen time
```

Then:

```bash
pnpm dev
# open http://localhost:3000/scratch-remote — placeholder renders inside the shell
```

Confirm `apps/shell/src/internal/federation/remotes.dev.json` gained a
`scratch-remote` entry and `docs/architecture.md`'s "Remotes" section names
it.

**Cleanup**: `rm -rf apps/scratch-remote`, revert the `remotes.dev.json` and
`docs/architecture.md` edits — this is a throwaway validation run, not a
commit.

## 2. Standalone mode (User Story 3)

```bash
pnpm turbo gen remote
# mode: standalone
# name: scratch-standalone
# outputPath: ../scratch-standalone   (must resolve outside this repo)
# routePath: /scratch-standalone
# label: Scratch Standalone
```

Expected:

- `../scratch-standalone/` exists, outside this repository, with no
  `workspace:*` reference anywhere in its `package.json`.
- `../scratch-standalone/.npmrc` points at GitHub Packages for the
  `@enterprise-mfe` scope.
- `../scratch-standalone/README.md` states that install requires a prior
  publish of `packages/*`.

**What this run does not prove, and why that's expected**: `pnpm install`
inside `../scratch-standalone` will fail until `packages/*` have actually
been published at least once (FR-019 — this feature does not perform that
publish). Confirming SC-005 for real is a separate, later action a
maintainer takes once `.github/workflows/publish-packages.yml` has been run
once with real credentials — not part of this quickstart.

**Cleanup**: `rm -rf ../scratch-standalone`.

## 3. Failure-path spot checks (edge cases)

```bash
pnpm turbo gen remote   # name: admin       → refuses, names the collision
pnpm turbo gen remote   # name: shell       → refuses, reserved name
pnpm turbo gen remote   # routePath: /admin → refuses, route collision
```

Each MUST exit non-zero, print the specific reason, and leave the workspace
unchanged (`git status` shows nothing new).

## 4. Publish workflow dry run (does not touch the real registry)

```bash
pnpm exec changeset status
# or a scoped dry-run per package-publish-contract.md
```

Confirms `.changeset/config.json` and `publishConfig` are wired correctly
without invoking a real `changeset publish` against GitHub Packages.

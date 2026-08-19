---
description: Add a new package under packages/, wired into the workspace and (if it holds shared state) into the singleton drift check.
argument-hint: <package-name>
---

Create `packages/$ARGUMENTS` with:

- `package.json` following the naming convention of existing packages
  (`@enterprise-mfe/$ARGUMENTS` or whatever scope the project actually uses —
  check an existing package first, don't assume).
- `tsconfig.json` extending `packages/config-typescript`.
- A `README.md` explaining what it solves in one paragraph, matching the tone of
  the package list in `docs/USAGE.md`.

Then ask: **does this package hold state or a context that more than one app
(shell + any remote) will consume?** If yes, add it to `scripts/check-shared-deps.ts`
so version drift is caught in CI — this is not optional, it's how
`packages/telemetry` is protected today, and skipping it here reintroduces the
exact bug class the guard rail exists to prevent.

Then ask the harder question: **is this a package a remote would have to
import?** If so, it is almost certainly the wrong shape. Remotes live in other
repositories and cannot install from here — anything they need arrives through
`RemoteAppProps`. A new shared package is legitimate only when its consumers are
all inside this repository.

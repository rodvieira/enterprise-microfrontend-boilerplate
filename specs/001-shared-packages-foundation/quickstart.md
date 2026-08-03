# Quickstart Validation: Shared Packages Foundation

**Feature**: `001-shared-packages-foundation` | **Date**: 2026-08-02

How to verify this feature actually delivers what the spec promises. Each section
maps to a success criterion. Run from the repository root.

## Prerequisites

- Node 20 or newer (the root `engines` field)
- pnpm 9
- A clean checkout of branch `001-shared-packages-foundation`

```bash
pnpm install
```

## 1. The gates pass (SC-007)

```bash
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm check:shared-deps
pnpm test
```

Expected: all five exit `0`. `check:boundaries` and `check:shared-deps` are the
two that fail today for missing files — after this feature they must pass on
their own merits, with no `--no-verify` and no `continue-on-error` masking them.

## 2. The component set is real (SC-001, SC-002)

```bash
pnpm test --filter @enterprise-mfe/ui
```

Expected: every one of the seven components has rendering and keyboard tests, and
all pass. Specifically verifiable:

- Modal: focus enters on open, cycles inside while open, Escape closes, focus
  returns to the opener, background is inert — five separate assertions
  ([ui-contract.md](contracts/ui-contract.md), Modal focus rules).
- Table with an empty collection renders its empty state.
- Two simultaneous toasts both remain readable and dismiss independently.
- Nav marks the active item as current, not just styled differently.

## 3. The session contract works with zero configuration (SC-003)

```bash
pnpm test --filter @enterprise-mfe/auth
```

Expected, with no environment variable set and no service running:

- Initial `status` is `unknown`, then resolves — never a boolean flash.
- `ProtectedRoute` does not render children while unauthenticated; the children
  are absent from the tree, not merely hidden.
- After `login()`, children render and the user's identity and permissions are
  readable.
- Two consumers of `useAuth()` in one tree observe the same change from one
  `logout()`.
- `useAuth()` outside a provider throws a message naming the provider.

## 4. Each shared concept exists once (SC-004)

```bash
grep -rn "interface User\|type User\b" packages/ --include=*.ts --include=*.tsx
grep -rn "type Permission\b" packages/ --include=*.ts --include=*.tsx
```

Expected: exactly one definition each, both in `packages/shared-types`. Every
other occurrence is an import.

## 5. The drift gate actually catches drift (FR-012)

Prove the gate works by breaking it on purpose:

```bash
# temporarily set a different react range in packages/ui/package.json
pnpm check:shared-deps   # must exit 1 and name packages/ui
git checkout packages/ui/package.json
pnpm check:shared-deps   # must exit 0 again
```

A gate that has never failed has not been tested. This is the one validation step
that must be performed manually before the pull request.

## 6. Shared configuration is inherited, not copied (SC-006)

```bash
grep -c '"extends"' packages/*/tsconfig.json
```

Expected: every package extends the shared base and declares no local compiler
options beyond paths specific to itself.

## 7. Unstyled usage fails loudly (spec edge case 4)

Render any component without importing `@enterprise-mfe/ui/styles.css`. Expected:
visibly unstyled output — obvious immediately, never a subtly broken screen that
reaches production.

## What this feature does NOT deliver

No shell, no remote, no federation configuration, no Rspack, no running
application to open in a browser. The validation above runs entirely through
tests and gates. A browser-visible result arrives in sprint 3, when the shell
exists to render these packages.

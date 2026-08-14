# enterprise-microfrontend-boilerplate

## What this is

A production-grade monorepo boilerplate for large, scalable React applications
built on micro-frontend architecture (Module Federation 2.0 via Rspack). Ships two
working example micro-frontends (dashboard, admin) composed inside a shell, sharing
a design system, an auth contract, and a typed event bus for cross-remote
communication.

Full spec: `docs/blueprint.html` (open in a browser). Every architectural decision
is also logged as an ADR in `docs/decisions/`. The binding rules behind both live
in `.specify/memory/constitution.md` — this file is the runtime guidance derived
from it, and the constitution wins on any conflict.

## Architecture (non-negotiable)

```
apps/shell        → React host, reads federation/manifest.ts per environment
apps/dashboard    → remote 1, exposes ./App
apps/admin        → remote 2, exposes ./App
packages/*        → shared code, singleton where noted below
```

- `usecase`-equivalent rule for this project: **`src/exposed/` is the only
  federation-importable code in any app.** Everything in `src/internal/` is
  private to that app. Never violate this even inside the monorepo.
- **Never use a relative import (`../`) across apps.** Even though the monorepo
  technically allows it, doing so breaks the boundary that keeps a remote portable
  to its own repository later. `dependency-cruiser` enforces this in CI — treat a
  CI failure here as a hard stop, not a warning to route around.
- **React, ReactDOM, `packages/auth`, and `packages/event-bus` must resolve to a
  single shared instance** across shell and every remote. `scripts/check-shared-deps.ts`
  verifies this in CI. If you add a new package that holds state and gets consumed
  by more than one app, add it to that check too.
- Module Federation itself prescribes no folder structure. Everything under
  `apps/*/src/` beyond `exposed/`/`internal/` is our convention, documented in
  `docs/architecture.md` — don't assume it's an MF requirement when explaining it
  to someone else.

## Build order (see ADR-0008)

Shared packages (no federation dependency) → shell → dashboard remote → admin
remote → guard rails → generator. The generator (`turbo gen remote`) is built by
extracting the pattern from two real, working remotes — never design it before
both exist. If you're asked to build the generator before both remotes are done,
push back and point to this rule.

## Commands

- `pnpm dev` → runs shell + all remotes concurrently
- `pnpm build` → `turbo build`, each app isolated + shell composed
- `pnpm test` → `turbo test`
- `pnpm e2e` → Playwright, shell composing both remotes
- `pnpm check:boundaries` → dependency-cruiser, fails on cross-app relative imports
- `pnpm check:shared-deps` → singleton drift check
- `pnpm check:package-exports` → packs each publishable package and verifies its
  `publishConfig.exports` resolve inside the tarball (run after `pnpm build`)
- `pnpm audit --audit-level=high` → CVE baseline
- `pnpm eject` → one-time: rename the scope, swap the example remotes for your own

## Auth (see ADR-0009, docs/auth-strategy.md)

`packages/auth` ships a **stub implementation** (in-memory fake user) behind a
stable contract (`useAuth()`, `<ProtectedRoute>`, `<AuthProvider>`). Do not
implement a real login flow unless explicitly asked — that decision was made
deliberately, not left unfinished. If asked to "add real login," point to
`docs/how-to-connect-sso.md` and confirm the person actually wants to change this
decision, since it was made for a specific reason (enterprises bring their own
identity provider).

## Rules

- Conventional Commits, English only — code, comments, commits, docs, PR text.
- **Comments in shipped code explain the *why*, in self-contained prose.** A
  comment is read by someone who has this file open and nothing else, so
  traceability markers (`FR-012`, `research D3`, `US2 scenario 1`, sprint
  numbers) do not belong there — they resolve to `specs/`, which an adopter
  who ran `pnpm eject` no longer has. Link an ADR when the reasoning is
  genuinely elsewhere; otherwise state the reason inline. Tests may still
  cite whatever helps.
- No dependency added without a one-line justification in the PR description.
- Every new package or app needs an entry in the relevant `docs/` file, not just code.
- If a decision changes something already logged in `docs/decisions/`, add a new
  ADR that supersedes it — never edit an old ADR to pretend it always said that.

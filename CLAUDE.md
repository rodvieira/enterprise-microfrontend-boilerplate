# enterprise-microfrontend-boilerplate

## What this is

A production-grade monorepo boilerplate for large, scalable React applications
built on micro-frontend architecture (Module Federation 2.0 via Rspack). Ships two
working example micro-frontends (dashboard, admin) composed inside a shell, sharing
a design system, an auth contract, and a typed event bus for cross-remote
communication.

`docs/USAGE.md` is the one documentation file: commands, a step-by-step, and how
to do each thing. Keep it that way — this project deliberately does not carry a
spec folder, a decision log, or a doc per topic.

## Architecture (non-negotiable)

```
apps/shell        → React host, reads a per-environment remote registry
apps/dashboard    → remote 1, exposes ./App
apps/admin        → remote 2, exposes ./App
packages/*        → shared code, singleton where noted below
```

- **`src/exposed/` is the only federation-importable code in any app.**
  Everything in `src/internal/` is private to that app. Never violate this
  even inside the monorepo.
- **Never use a relative import (`../`) across apps.** Even though the monorepo
  technically allows it, doing so breaks the boundary that keeps a remote portable
  to its own repository later. `dependency-cruiser` enforces this in CI — treat a
  CI failure here as a hard stop, not a warning to route around.
- **React, ReactDOM, `react-router`, `packages/auth`, `packages/event-bus`, and
  `packages/telemetry` must resolve to a single shared instance** across shell and
  every remote. `scripts/check-shared-deps.ts` verifies this in CI. If you add a
  package that holds state or a React context consumed by more than one app, add it
  to that check in the same change.
- Module Federation itself prescribes no folder structure. Everything under
  `apps/*/src/` beyond `exposed/`/`internal/` is this project's own convention —
  don't present it as an MF requirement when explaining it to someone else.

## Commands

- `pnpm dev` → runs shell + all remotes concurrently
- `pnpm build` → `turbo build`, each app isolated + shell composed
- `pnpm build:site` → builds everything and assembles `_site/` for deployment
- `pnpm test` → `vitest run` (deliberately not `turbo test`: no package defines a
  `test` script, so `turbo test` would find zero tasks and exit 0 having run
  nothing — a false green)
- `pnpm e2e` → Playwright, shell composing both remotes
- `pnpm check:boundaries` → dependency-cruiser, fails on cross-app relative imports
- `pnpm check:shared-deps` → singleton drift check
- `pnpm check:package-exports` → packs each package and verifies its
  `publishConfig.exports` resolve inside the tarball (run after `pnpm build`)
- `pnpm audit --audit-level=high` → CVE baseline
- `pnpm eject` → one-time: rename the scope, swap the example remotes for your own

## Auth

`packages/auth` ships a **stub implementation** (in-memory fake user) behind a
stable contract (`useAuth()`, `<ProtectedRoute>`, `<AuthProvider>`). Do not
implement a real login flow unless explicitly asked — that decision was made
deliberately, not left unfinished. If asked to "add real login," point to
`docs/USAGE.md`'s "Connecting real authentication" and confirm the person actually
wants to change this, since enterprises bring their own identity provider.

`packages/telemetry` is the same shape of decision: a contract and a console sink,
never a vendor integration.

## Publishing

This repository **does not publish its packages.** The packaging is kept correct
and verified (`tsup` build, `publishConfig.exports`, `check:package-exports`) so
that whoever adopts this can publish their own scope on day one — but do not add a
release pipeline or publish anything without being asked.

The consequence to state honestly whenever standalone mode comes up: a
standalone-generated project cannot `pnpm install` until its scope is published
somewhere.

## Rules

- Conventional Commits, English only — code, comments, commits, docs, PR text.
- **Comments in shipped code explain the *why*, in self-contained prose.** A
  comment is read by someone who has this file open and nothing else, so
  traceability markers (`FR-012`, `research D3`, sprint numbers) do not belong
  there. State the reason inline. Tests may still cite whatever helps.
- No dependency added without a one-line justification in the PR description.
- Documentation changes go in `docs/USAGE.md`. Do not add new doc files unless
  asked — the single-file structure is deliberate.

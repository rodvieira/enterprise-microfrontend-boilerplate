# Draft answers for `/speckit.constitution`

When you run `/speckit.constitution` inside Claude Code, it will ask questions
to build the project constitution. Use these answers — they're already decided,
don't re-derive them from scratch.

## Project principles

1. The `exposed/` vs `internal/` boundary in every app is absolute. Only code
   under `src/exposed/` may be imported from outside that app.
2. No relative import (`../`) ever crosses an app boundary, even inside this
   monorepo. Enforced by `dependency-cruiser` in CI.
3. Singleton-shared packages (React, ReactDOM, `packages/auth`,
   `packages/event-bus`) must resolve to identical versions across shell and
   every remote. Enforced by `scripts/check-shared-deps.ts` in CI.
4. Module Federation prescribes no folder structure — every convention in this
   repo beyond Host/Remote/Manifest/shared-deps is ours, and is documented,
   not assumed.
5. The scaffolding generator is built by extracting the pattern from two real,
   working remotes (dashboard, admin) — never designed before both exist.
6. `packages/auth` ships a contract and a stub, never a real login
   implementation. See ADR-0009 before changing this.
7. Every architectural decision that changes something already in
   `docs/decisions/` gets a new ADR that supersedes the old one. Old ADRs are
   never edited to pretend they always said something different.
8. Conventional Commits, scoped to the app or package touched. English only —
   code, comments, commits, PR text, docs.
9. No dependency added without a one-line justification in the PR description.

## Tech stack (already decided, do not re-litigate)

- Bundler: Rspack (not Vite — see ADR-0002)
- Federation: Module Federation 2.0 (see ADR-0003)
- Framework: React 19, TypeScript strict
- Styling: Tailwind CSS
- Monorepo: pnpm workspaces + Turborepo
- Lint/format: Biome
- Git hooks: lefthook
- Commit linting: commitlint with the scopes in `commitlint.config.js`
- Testing: Vitest (unit/component), Playwright (e2e)
- Boundary enforcement: dependency-cruiser
- License: MIT

## Build order (see ADR-0008 and docs/blueprint.html §15)

Shared packages (no federation dependency) → shell → dashboard remote → admin
remote → guard rails (dependency-cruiser + singleton check + error boundary)
→ generator → docs/security hardening → deploy/launch.

## Out of scope for this project

- Real authentication/SSO implementation (contract + stub only — ADR-0009)
- SAML (out of scope entirely — would require a backend, which this project
  deliberately doesn't have; see the auth strategy section of the blueprint)
- Backend-For-Frontend — documented as a future upgrade path, not built here
- Support for bundlers other than Rspack

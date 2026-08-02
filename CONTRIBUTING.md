# Contributing

Thanks for considering a contribution. This project follows a specific set of
architectural rules — please read this before opening a PR, it'll save both of
us a review cycle.

## Setup

```bash
pnpm install
pnpm dev
```

## The rules that matter most

1. **Never import across apps with a relative path.** `apps/dashboard` must never
   `import` anything from `apps/admin` directly — only through federation or a
   shared package. This is enforced in CI via `dependency-cruiser`
   (`pnpm check:boundaries`), and failing it blocks the PR.
2. **Only `src/exposed/` is a valid import target from outside an app.**
   `src/internal/` is private, always. See `docs/architecture.md`.
3. **Shared singleton packages** (`packages/auth`, `packages/event-bus`, React
   itself) must stay on identical versions across every app. `pnpm check:shared-deps`
   verifies this — if you bump a version, bump it everywhere that package is used.
4. **Conventional Commits**, scoped to the app or package you touched (e.g.
   `feat(admin): add role-change confirmation modal`). Enforced by commitlint on
   commit.
5. **English only** — code, comments, commit messages, PR descriptions, docs.

## Adding a new remote

Once the generator exists (see `docs/decisions/0008-generator-after-two-remotes.md`
for why it doesn't exist from day one), use `pnpm turbo gen remote`. Before that
point, copy the structure of the closer of `apps/dashboard` or `apps/admin`.

## Adding a shared package

Anything consumed by more than one app needs an entry in
`scripts/check-shared-deps.ts` if it holds state. See
`.claude/commands/add-shared-package.md` if you're using Claude Code — it walks
through this.

## Reporting a security issue

Please don't open a public issue for a security vulnerability. See
`SECURITY.md` (or, until that file exists, open a private security advisory via
GitHub's "Report a vulnerability" button on this repo).

## Pull request checklist

- [ ] `pnpm check:boundaries` passes
- [ ] `pnpm check:shared-deps` passes
- [ ] `pnpm test` passes
- [ ] New/changed behavior has a test
- [ ] If this changes an architectural decision already in `docs/decisions/`, a
      new ADR is added (never edit an old one to pretend it always said that)

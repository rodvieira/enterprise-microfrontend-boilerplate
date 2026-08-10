# Quickstart: validating docs + security

Five independent checks, one per FR group.

## 1. Dependabot (FR-001, SC-001)

```bash
cat .github/dependabot.yml
```

Confirm two `package-ecosystem` entries (`npm`, `github-actions`). After
merge to `main`, confirm under GitHub → Insights → Dependency graph →
Dependabot that both ecosystems are recognized (this step requires the repo
to actually be on GitHub — not verifiable purely locally).

## 2. CI scanning steps (FR-002, FR-003, SC-002)

```bash
grep -A3 "osv-scanner\|socket-security" .github/workflows/ci.yml
```

Confirm both steps exist in the `quality` job, run on the same
`push`/`pull_request` triggers the job already uses, and each has an
explicit, commented `continue-on-error` value (not silently copied from
`pnpm audit`'s).

## 3. CSP (FR-004, FR-005, FR-006, SC-003)

```bash
pnpm --filter @enterprise-mfe/shell run build
grep -A2 "Content-Security-Policy" apps/shell/dist/index.html
```

Expected: a `<meta http-equiv="Content-Security-Policy" content="script-src
'self' http://localhost:3001 http://localhost:3002 ...">` (dev build) whose
origin list matches `apps/shell/src/internal/federation/remotes.dev.json`'s
`allowedOrigins` exactly. Repeat with `FEDERATION_ENV=staging` and
`FEDERATION_ENV=production` and confirm each build's CSP matches that
environment's own registry file — proving the CSP isn't a single hardcoded
value.

```bash
pnpm exec vitest run --project shell -t build-csp
```

Unit test for the pure `script-src`-derivation function.

## 4. The three how-to docs (FR-007, FR-008, FR-009, SC-004)

```bash
test -f docs/how-to-connect-sso.md && echo ok
test -f docs/auth-strategy.md && echo ok
test -f docs/how-to-add-a-remote.md && echo ok
```

Read each and confirm it answers the question `CLAUDE.md`'s own pointer (or
the blueprint, for the third) implies — not just that the file exists.

## 5. ADR coverage (FR-010, FR-011, SC-005)

```bash
test -f docs/decisions/0004-react-typescript-tailwind.md && echo ok
test -f docs/decisions/0005-pnpm-turborepo.md && echo ok
test -f docs/decisions/0015-*.md && echo ok
head -5 CONTRIBUTING.md CODE_OF_CONDUCT.md
```

Confirm `docs/decisions/` now has one file per blueprint §2 item (research
D4's table, re-run instead of trusted from memory), and that
`CONTRIBUTING.md`/`CODE_OF_CONDUCT.md` are present and substantive (already
true as of this sprint's start — this step confirms it wasn't assumed).

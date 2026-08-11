# Quickstart: validating launch prep

Three independent checks, one per deliverable.

## 1. README (FR-001, FR-002, SC-001)

Read `README.md` alone, no other file open. Confirm it answers: what is
this, why does it exist, how do I run it locally, where do I go for more
depth. Confirm exactly one section is marked for the demo GIF/live URLs,
with a note explaining why it's empty.

```bash
pnpm install
pnpm dev
# confirm the README's own quick-start commands are exactly these two
```

## 2. Technical post draft (FR-003, FR-004, SC-002)

```bash
cat docs/posts/exposed-internal-boundary.md
```

Read start to finish with no other file open — confirm it's a complete
argument, zero placeholder text. Then verify its three concrete claims
against the real source:

```bash
grep -A6 "issue #2" .dependency-cruiser.js
grep -n "styles.css" apps/dashboard/src/exposed/App.tsx
cat docs/decisions/0008-generator-after-two-remotes.md
```

## 3. Deploy guide (FR-005, FR-006, SC-003)

```bash
FEDERATION_ENV=production pnpm --filter @enterprise-mfe/shell run build
cat apps/shell/dist/remotes.json   # confirm: environment "production", empty remotes/allowedOrigins
FEDERATION_ENV=staging pnpm --filter @enterprise-mfe/shell run build
cat apps/shell/dist/remotes.json   # confirm: environment "staging", same empty state
pnpm --filter @enterprise-mfe/dashboard run build   # confirms independent per-remote build
```

Confirm every command `docs/how-to-deploy.md` documents matches these
exactly, and that the guide states plainly that
`remotes.staging.json`/`remotes.production.json` are currently empty.

## 4. Portfolio DoD re-confirmation (FR-007, SC-004)

```bash
ls docs/decisions/ | wc -l   # expect 15 (10 matching blueprint §2 + 5 sprint 6/7/8 ADRs)
ls .github/ISSUE_TEMPLATE/
cat .github/PULL_REQUEST_TEMPLATE.md | head -5
head -5 CONTRIBUTING.md CODE_OF_CONDUCT.md
```

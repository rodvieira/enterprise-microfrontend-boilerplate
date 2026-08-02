## What this changes

<!-- One or two sentences. What does this PR do, and why? -->

## Checklist

- [ ] `pnpm check:boundaries` passes (no relative import crosses an app boundary)
- [ ] `pnpm check:shared-deps` passes (no singleton version drift)
- [ ] `pnpm test` passes
- [ ] New or changed behavior has a test
- [ ] If this changes a decision already logged in `docs/decisions/`, a new ADR
      is added (never edit an old one to pretend it always said that)
- [ ] Commit messages follow Conventional Commits with the correct scope

## Type of change

- [ ] New remote or app
- [ ] New shared package
- [ ] Fix
- [ ] Documentation / ADR
- [ ] Tooling / CI
- [ ] Other (describe above)

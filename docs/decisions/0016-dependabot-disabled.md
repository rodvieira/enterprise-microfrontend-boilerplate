# 0016 — Dependabot disabled; OSV-Scanner and Socket remain the active dependency-scanning mechanism

**Status:** Accepted

**Supersedes:** the Dependabot portion of [ADR-0015](0015-docs-security-closed.md)

## Context

ADR-0015 (`007-docs-security`) enabled Dependabot via `.github/dependabot.yml`
(`npm` and `github-actions` ecosystems, weekly). In its first day active,
it opened seven pull requests. One (`@types/node` `22.10.2` →
`26.2.0`, PR #28) was a real problem: a major-version jump in type
definitions with no relationship to this project's actual `"engines":
{"node": ">=22.22.2"}` (Node 22) — Dependabot has no way to know
`@types/node`'s major needs to track the runtime engine's major, and
would have kept proposing it on every future scan. That specific gap was
closed first, independently
(`.github/dependabot.yml`'s `ignore` rule for `@types/node` semver-major
updates, since removed along with the rest of this file). The remaining
six were routine, low-risk patch/minor bumps.

## Decision

Disable Dependabot for this repository — delete `.github/dependabot.yml`,
close every open Dependabot-authored pull request.

## What this does not change

`osv-scan` and `socket-security` (also introduced in ADR-0015) remain
active, unaffected by this decision — they run on every push/pull
request, independent of Dependabot's own weekly scan-and-PR cycle. The
Security DoD line this ADR partially reopens is "Dependabot/Renovate,
Socket all wired into CI" (`docs/blueprint.html` §16) — Socket (and
OSV-Scanner, standing in for the blueprint's own "OWASP CVE Lite CLI"
wording per ADR-0015) still satisfy the CVE/supply-chain-scanning half of
that line. Dependabot specifically is the mechanism disabled here.

`pnpm audit --audit-level=high` (`.github/workflows/ci.yml`, pre-dating
even ADR-0015) is also unaffected.

## Consequences

Dependency updates for this repository are no longer proposed
automatically — a maintainer runs `pnpm outdated`/`pnpm update` (or
re-enables Dependabot later, by restoring `.github/dependabot.yml`) on
their own schedule instead. `docs/blueprint.html` is not edited to
reflect this — per this project's own convention, the blueprint records
original planning intent and the ADR sequence records what actually
happened and why, including reversals; this ADR is that record for this
one.

## Related

`docs/decisions/0015-docs-security-closed.md` — the decision this ADR
partially supersedes. `specs/007-docs-security/` — where Dependabot was
originally specified and researched.

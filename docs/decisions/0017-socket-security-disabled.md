# 0017 — Socket supply-chain scan removed from CI; OSV-Scanner remains

**Status:** Accepted

**Supersedes:** the Socket portion of [ADR-0015](0015-docs-security-closed.md)

## Context

ADR-0015 (`007-docs-security`) added a `socket-security` job to
`.github/workflows/ci.yml`, requiring a `SOCKET_SECURITY_API_KEY`
repository secret — documented at the time as "real mechanism, external
Socket.dev account setup deliberately left to a maintainer." No one
created that account or added the secret. The job ran, and failed, on
every push and pull request, exactly as documented — `continue-on-error:
true` kept it from blocking anything, but it was still a permanently red
check with nothing behind it.

Per the same reasoning [ADR-0016](0016-dependabot-disabled.md) already
applied to Dependabot: a mechanism nobody is going to configure is better
removed than left inert.

## Decision

Remove the `socket-security` job from `.github/workflows/ci.yml`.

## What this does not change

`osv-scan` (also from ADR-0015) is unaffected — it still runs on every
push/pull request and still covers CVE/advisory scanning, the primary
signal the blueprint's "OWASP CVE Lite CLI" DoD line names (ADR-0015
research D3). `pnpm audit --audit-level=high` is also unaffected. Only the
supply-chain-specific signal Socket added (install-time script behavior,
typosquatting) is gone.

## Consequences

The blueprint's "pnpm audit, Dependabot/Renovate, Socket all wired into
CI" Security DoD line (`docs/blueprint.html` §16) is no longer fully true
as written — two of its three named mechanisms (Dependabot, Socket) are
now disabled, `osv-scan` is the one that remains. `docs/blueprint.html` is
not edited (same reasoning ADR-0016 gives: it records original planning
intent, the ADR sequence records what actually happened). Re-enabling
Socket later is a matter of restoring the job and configuring the secret
— nothing about this removal makes that harder.

## Related

`docs/decisions/0015-docs-security-closed.md` — the decision this ADR
partially supersedes. `docs/decisions/0016-dependabot-disabled.md` — the
same reasoning, applied first, to Dependabot.

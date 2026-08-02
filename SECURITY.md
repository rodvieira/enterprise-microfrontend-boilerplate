# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for a security vulnerability.

Instead, use GitHub's private vulnerability reporting: go to the **Security**
tab on this repository → **Report a vulnerability**. This opens a private
channel with the maintainer and avoids exposing the issue before a fix ships.

If you're unsure whether something qualifies, err on the side of reporting it
privately — it's easy to convert a private report into a public issue later if
it turns out not to be sensitive, but not the other way around.

## Scope

This project is a boilerplate, not a hosted service — there is no production
deployment holding real user data. Relevant vulnerability classes still worth
reporting:

- Anything that would let a compromised remote origin execute code inside the
  shell's origin beyond what the documented CSP/origin allow-list already
  restricts (see `docs/blueprint.html` §9).
- Dependency vulnerabilities with a real exploitation path in this project's
  usage (not just a CVE ID with no relevant attack surface here).
- Issues in the `packages/auth` stub that could mislead an adopter into
  thinking it's production-safe when it isn't (it explicitly is not — see
  `docs/decisions/0009-auth-contract-not-implementation.md`).

## Supported versions

This project does not yet have a stable release. Once tagged releases exist,
this section will list which versions receive security fixes.

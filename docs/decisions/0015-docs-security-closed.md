# 0015 — Sprint 8 (docs + security) closed: CSP mechanism, dependency scanning, and the ADR-coverage audit

**Status:** Accepted

## Context

`docs/blueprint.html` §8 names sprint 8 "docs + security," and the
Definition of Done's Security checklist names two still-open lines this
sprint closes: "Dependabot/Renovate, Socket all wired into CI" and "CSP
restricts remote script-src to known origins." Its Portfolio checklist also
says "ADRs committed for every decision in §2" — a claim never actually
checked until this sprint's audit (`specs/007-docs-security` research D4).

## Decisions

1. **CSP via `HtmlRspackPlugin`'s own `meta` option, not a hand-edited
   `index.html`.** `apps/shell/src/internal/federation/build-csp.ts`
   derives `script-src` from the exact same `allowedOrigins` array
   `origin-guard.ts` already enforces at the application level, read from
   the same resolved `remotes.<env>.json` `rspack.config.ts` already
   selects for `CopyRspackPlugin`. A `<meta http-equiv=
   "Content-Security-Policy">` tag, not an HTTP header — this project has
   no server of its own; `apps/shell`'s build output is static assets
   deployed to whatever host an adopter chooses, and a meta tag needs no
   host-specific configuration an HTTP header would. Verified in a real
   browser (Playwright): a script injected from an origin outside
   `allowedOrigins` is blocked, with the browser's own console reporting
   the CSP violation — not merely refused by `origin-guard.ts` before any
   fetch, a second, independent layer now backs that refusal up. See
   `specs/007-docs-security/research.md` D1.

   One cosmetic finding, not a defect: the built-in (native)
   `HtmlRspackPlugin`'s `meta` option always adds a redundant
   `name="Content-Security-Policy"` attribute alongside `http-equiv`,
   regardless of key casing (`'http-equiv'` vs. `httpEquiv` — the latter
   also breaks the attribute name itself, confirmed by inspecting the
   built `dist/index.html` both ways). Harmless: the HTML pragma-processing
   algorithm applies `http-equiv` regardless of an unrelated `name`
   attribute on the same element, and nothing in this project reads
   `meta[name="Content-Security-Policy"]`. Documented inline in
   `rspack.config.ts` rather than silently left for the next reader to
   rediscover.

2. **Dependabot, not Renovate**, via `.github/dependabot.yml` (`npm` —
   pnpm-lockfile-aware — plus `github-actions` ecosystems). Zero additional
   infrastructure: native to GitHub, activates from a single committed
   file, no external app-install step outside version control. See
   `research.md` D2.

3. **Two new CI jobs, distinct from `pnpm audit`**: `osv-scan` (OSV-Scanner,
   via its reusable workflow — no step-level Action exists for it) and
   `socket-security` (Socket's CLI-based integration). Neither inherits
   `pnpm audit`'s `continue-on-error: true` unexamined — `osv-scan` uses
   the tool's own native `fail-on-vuln: false` report-only switch, and
   `socket-security` uses `continue-on-error: true` for a distinct,
   *additional* reason: **it requires a `SOCKET_SECURITY_API_KEY`
   repository secret this project does not have.** Socket's CLI needs a
   real Socket.dev account's API key — external account setup no CI
   workflow file can create on its own, the same class of adopter-owned
   setup as `006-remote-generator`'s GitHub Packages publish credentials
   (research D5 there). The job is wired for real and will do real work
   the moment a maintainer adds that secret; `continue-on-error: true` is
   what keeps a missing key's failure from blocking every PR until then —
   not a statement that Socket's findings won't matter once configured.
   See `research.md` D3.

   The blueprint's own text names "OWASP CVE Lite CLI" for the scanning
   role OSV-Scanner fills here — no tool by that exact name was found
   (checked: no npm package, no GitHub Action, no OWASP-published project).
   Per this project's own established discipline
   (`006-remote-generator` research D1 rejected the blueprint's
   `federation.config.ts`/`remote.manifest.json` sketch for the same
   reason — neither existed in the real remotes it claimed to describe), a
   sprint is built against what's real. OSV-Scanner is the closest genuine
   match to the blueprint's intent and is real, maintained, and widely
   adopted.

## The §2 coverage audit (research D4)

Blueprint §2 names ten decisions. Before this sprint, eight had a
1:1-numbered ADR; `0004` (React 19 + TypeScript strict + Tailwind CSS) and
`0005` (pnpm workspaces + Turborepo) sat unwritten in the sequence's own
reserved gap. Both are backfilled by this sprint:
[0004-react-typescript-tailwind.md](0004-react-typescript-tailwind.md),
[0005-pnpm-turborepo.md](0005-pnpm-turborepo.md). `docs/decisions/` now
matches blueprint §2 exactly, ten for ten.

`CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` (DoD Portfolio checklist) were
both present and substantive — but confirming rather than assuming that
found a real, stale gap: `CONTRIBUTING.md`'s "Adding a new remote" section
still described the pre-generator, hand-copy-only state
(`006-remote-generator` had already shipped `pnpm turbo gen remote` by the
time this sprint started), and its security-reporting section still
hedged "until `SECURITY.md` exists," a file that already existed. Both
fixed in this sprint — exactly the outcome `FR-011`'s "confirm, don't
assume" was for.

## Consequences

Every Security DoD line this sprint targeted is now closed against real,
verified mechanism: a CSP proven to block an actual disallowed script in a
real browser, a Dependabot config GitHub itself will recognize, and two
scanner jobs wired for real (one immediately active, one inert until a
maintainer supplies a credential this repository was never going to invent
on its own). The §2-vs-ADR gap this project's own DoD line claimed was
closed is now actually closed, not merely assumed to be.

## Related

`specs/007-docs-security/` — spec, research (D1–D4), quickstart, and the
task breakdown this ADR closes out.
`docs/decisions/0009-auth-contract-not-implementation.md` (the precedent
for "real mechanism, external credential setup deliberately left to the
adopter"). `docs/decisions/0012-runtime-registry-fetch.md` (the
`allowedOrigins`/environment-file mechanism the CSP is derived from).
`docs/decisions/0014-generator-dual-mode.md` (the prior sprint's same
"real mechanism, no live external action" pattern for GitHub Packages).

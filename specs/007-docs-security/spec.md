# Feature Specification: Docs + Security

**Feature Branch**: `007-docs-security`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Sprint 8 — Docs + Security: per docs/blueprint.html §8 and the Definition of Done's Security checklist, this sprint closes out the boilerplate's documentation and security-scanning gaps before launch (sprint 9). Scope: (1) real, automated CVE/dependency scanning beyond pnpm audit's continue-on-error — Dependabot or Renovate, and a Socket/OWASP-style supply-chain check wired into CI. (2) CSP restricting remote script-src to known origins, verified against the shell's actual runtime origin allow-list. (3) docs/how-to-connect-sso.md and docs/how-to-add-a-remote.md, both already referenced as forthcoming. (4) Confirm CONTRIBUTING.md/CODE_OF_CONDUCT.md satisfy the DoD, and audit that every decision named in blueprint §2 has a corresponding ADR — rather than assume it. Out of scope: sprint 9's launch checklist."

## User Scenarios & Testing *(mandatory)*

The people served here are: a contributor who clones this repo and needs to
understand its architecture and decisions without asking the original author
(served by the ADR/how-to audit); an adopter who needs to replace the auth
stub with their own identity provider, or add a remote without reinventing
the generator's conventions (served by the two how-to docs); and whoever
reviews this project for security posture before recommending or adopting it
— a hiring manager, a security-conscious team lead, or an automated scanner
(served by real CVE scanning and CSP).

### User Story 1 - A security reviewer sees real, enforced dependency scanning (Priority: P1)

Someone evaluating this repo's security posture — not just reading
`pnpm audit`'s output once, but checking whether the project catches new
vulnerabilities automatically — finds a configured Dependabot or Renovate
setup and a supply-chain scanner wired into CI, not just the existing
`continue-on-error` `pnpm audit` step.

**Why this priority**: The blueprint's own Security DoD lists "Dependabot/
Renovate, Socket all wired into CI" as a top-level, still-open item — this is
the sprint that closes it. Without this, the project's own security claims in
`docs/blueprint.html` are false.

**Independent Test**: Inspect the repository for a Dependabot or Renovate
config file and confirm GitHub recognizes it (Insights → Dependency graph →
Dependabot, or an equivalent Renovate onboarding PR). Inspect `.github/
workflows/` for a supply-chain scan step and confirm it runs on the existing
CI triggers (push to `main`, pull request).

**Acceptance Scenarios**:

1. **Given** a Dependabot or Renovate configuration file committed to the
   repository, **When** GitHub processes it, **Then** the repository's
   dependency graph shows automated update monitoring is active.
2. **Given** a pull request that changes `package.json`, **When** CI runs,
   **Then** a supply-chain/CVE scan step runs alongside the existing
   `pnpm audit` step and reports its findings, without silently being skipped.
3. **Given** the existing `pnpm audit --audit-level=high` step's
   `continue-on-error: true` (needed so a new upstream advisory doesn't block
   an unrelated PR), **When** the new scan step is added, **Then** its
   reporting behavior (block vs. report-only) is a deliberate, documented
   choice — not an accidental copy of the same blanket `continue-on-error`.

---

### User Story 2 - The shell enforces a Content-Security-Policy matching its own origin allow-list (Priority: P1)

The shell already refuses to fetch a remote whose origin isn't on
`remotes.<env>.json`'s `allowedOrigins` list, at the application level
(`apps/shell/src/internal/federation/origin-guard.ts`). A browser-level
Content-Security-Policy now backs that same guarantee up: even if a bug in
the application-level check were bypassed, the browser itself refuses to
execute a script from an origin not already trusted.

**Why this priority**: The blueprint DoD explicitly lists "CSP restricts
remote script-src to known origins" as a still-open Security item, separate
from and in addition to the existing runtime origin allow-list (built in
`002-shell-host`). A security reviewer checking for defense-in-depth would
otherwise find only one layer where the project's own design implies two.

**Independent Test**: Load the shell in a real browser with dev tools open,
confirm a `Content-Security-Policy` header or `<meta>` tag is present,
confirm its `script-src` directive lists exactly the origins in the active
environment's `allowedOrigins` (plus `'self'`), and confirm a remote script
injected from an origin outside that list is blocked by the browser with a
CSP violation, not merely refused by `origin-guard.ts`.

**Acceptance Scenarios**:

1. **Given** the shell running in any environment, **When** its response
   headers or document `<head>` are inspected, **Then** a CSP is present
   whose `script-src` directive lists `'self'` plus exactly the origins in
   that environment's `remotes.<env>.json` `allowedOrigins`.
2. **Given** a change to `allowedOrigins` in a registry file, **When** the
   shell is rebuilt for that environment, **Then** the CSP's `script-src`
   reflects the new list automatically — the two are not two independently
   maintained places that can drift.
3. **Given** a remote entry whose origin is not in `allowedOrigins` (already
   refused by `origin-guard.ts` before any fetch), **When** the CSP is
   inspected, **Then** that origin is absent from `script-src` too — the
   browser-level and application-level refusals agree.

---

### User Story 3 - An adopter finds the two how-to docs the project already promises (Priority: P1)

`CLAUDE.md` already tells a reader asked to "add real login" to see
`docs/how-to-connect-sso.md` and `docs/auth-strategy.md`; `docs/blueprint.html`
names `docs/how-to-add-a-remote.md` as a sprint-8 deliverable. None of the
three exist yet. An adopter who hits either of `CLAUDE.md`'s pointers today
gets a broken promise, not a broken link a human would forgive — code and
docs agents alike treat a named-but-missing file as a bug.

**Why this priority**: These are the two concrete, load-bearing docs
gaps named by the project's own existing files (`CLAUDE.md`) and its own
blueprint. P1 because they're referenced, not aspirational — `CLAUDE.md`
already tells people to go read them.

**Independent Test**: Follow each pointer from `CLAUDE.md` and confirm the
target file exists and actually answers the question the pointer implies:
"how do I replace the auth stub with a real identity provider" and "how do I
add a remote, by hand or via the generator."

**Acceptance Scenarios**:

1. **Given** `CLAUDE.md`'s instruction to point a person asking for "real
   login" at `docs/how-to-connect-sso.md` and confirm they want to change
   ADR-0009's decision, **When** that file is opened, **Then** it explains
   `packages/auth`'s stub contract (`useAuth()`, `<ProtectedRoute>`,
   `<AuthProvider>`), what a real identity-provider integration needs to
   preserve, and links back to ADR-0009 for the "why a stub" reasoning.
2. **Given** `CLAUDE.md`'s reference to `docs/auth-strategy.md` alongside
   ADR-0009, **When** that file is opened, **Then** it exists and documents
   the auth contract's strategy at the level `CLAUDE.md` implies.
3. **Given** both `apps/dashboard`/`apps/admin` (hand-built) and the sprint-7
   generator (`pnpm turbo gen remote`) as two ways a remote comes to exist,
   **When** `docs/how-to-add-a-remote.md` is opened, **Then** it documents
   the generator as the default path and the hand-built convention it must
   still match if someone adds a remote without it.

---

### User Story 4 - Every named decision has a real ADR, confirmed by audit, not assumption (Priority: P2)

`docs/blueprint.html` §2 lists ten numbered decisions. The Definition of
Done says "ADRs committed for every decision in §2." Whether that is
actually true right now has never been checked — it has only ever been
assumed true because most of the ten obviously have a matching
`docs/decisions/000N-*.md` file.

**Why this priority**: P2 because it's a documentation-completeness check,
not new capability — but per CLAUDE.md's own rule ("if a decision changes
something already logged in docs/decisions/, add a new ADR" — the corollary
is a decision that was never logged in the first place is a real gap, not a
future problem), this sprint is the one whose own DoD line names it
explicitly.

**Independent Test**: List `docs/decisions/*.md`, list blueprint §2's ten
decisions by number and title, and match them one-to-one. Report the result
plainly rather than asserting completeness without having checked.

**Acceptance Scenarios**:

1. **Given** blueprint §2's ten decisions, **When** `docs/decisions/` is
   audited against them, **Then** every decision either has a matching ADR
   file or gets one written in this sprint — no decision is left
   silently undocumented.
2. **Given** `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` already exist in the
   repository root, **When** they're checked against the DoD's Portfolio
   checklist line naming them, **Then** the result (already satisfied, or
   what's missing) is confirmed, not assumed.

---

### Edge Cases

- What happens if a decision named in blueprint §2 turns out to already have
  an ADR under a title or number that doesn't obviously match (e.g., folded
  into a broader ADR written for a later sprint)? The audit MUST record that
  match explicitly rather than writing a duplicate ADR for a decision
  already covered.
- What happens to the CSP in local development, where the shell, dashboard,
  and admin all run on `http://localhost` (not HTTPS)? The CSP MUST still
  apply and list the loopback origins already present in
  `remotes.dev.json`'s `allowedOrigins` — `origin-guard.ts` already carves
  out an HTTPS exception for loopback hosts (research already established in
  `002-shell-host`), and the CSP must not be stricter than that existing,
  intentional exception in a way that breaks `pnpm dev`.
- What happens when the chosen supply-chain scanner (Socket, OWASP
  Dependency-Check, or equivalent) flags something in an existing,
  already-accepted dependency (e.g., the same `undici` advisory already
  known and accepted via `pnpm audit`'s `continue-on-error`)? The new scan
  step's own failure/report policy (Acceptance Scenario 3 of User Story 1)
  is what governs this — it must not silently duplicate a decision already
  made for `pnpm audit` without saying so.
- What happens if Dependabot/Renovate's first automated PR arrives before a
  maintainer is ready to review dependency bumps? Out of scope for this
  sprint to pre-approve or auto-merge anything — configuring the bot to open
  PRs is the deliverable; triaging its first PR is ordinary, ongoing
  maintenance work, not part of this sprint's automated scope.

## Requirements *(mandatory)*

### Functional Requirements

**Dependency / CVE scanning**

- **FR-001**: The repository MUST have a Dependabot or Renovate
  configuration file that GitHub (or Renovate's own onboarding) recognizes
  and activates for this repository's package ecosystem (pnpm/npm) and
  GitHub Actions.
- **FR-002**: CI (`.github/workflows/`) MUST run a supply-chain/CVE scan
  (Socket, OWASP Dependency-Check, or an equivalent tool) on the same
  triggers `ci.yml`'s `quality` job already uses (push to `main`, pull
  request), in addition to — not instead of — the existing `pnpm audit`
  step.
- **FR-003**: The new scan step's failure policy (block the workflow vs.
  report-only) MUST be a deliberate, stated choice, not copied unexamined
  from `pnpm audit`'s existing `continue-on-error: true`.

**Content-Security-Policy**

- **FR-004**: The shell MUST serve a Content-Security-Policy whose
  `script-src` directive is derived from the same `allowedOrigins` list
  `origin-guard.ts` already enforces at the application level for the active
  environment — never a separately hand-maintained list that could drift
  from it.
- **FR-005**: The CSP MUST be present for every environment the shell
  already supports (dev, staging, production) and MUST NOT break `pnpm dev`
  (loopback origins, already exempted from the HTTPS requirement by
  `origin-guard.ts`, must remain loadable).
- **FR-006**: A remote origin refused by `origin-guard.ts` (not on
  `allowedOrigins`) MUST also be absent from the CSP's `script-src` — the
  browser-level and application-level refusals MUST agree, never
  contradict each other.

**Documentation**

- **FR-007**: `docs/how-to-connect-sso.md` MUST exist and document how an
  adopter replaces `packages/auth`'s stub with a real identity provider,
  what the `useAuth()`/`<ProtectedRoute>`/`<AuthProvider>` contract requires
  of a real implementation, and MUST link to ADR-0009 for why a stub ships
  by default.
- **FR-008**: `docs/auth-strategy.md` MUST exist, since `CLAUDE.md` already
  references it alongside ADR-0009 as the auth strategy's documentation.
- **FR-009**: `docs/how-to-add-a-remote.md` MUST exist and document both
  paths to a new remote: `pnpm turbo gen remote` (the default, sprint-7
  generator) and the manual convention a hand-built remote must still match
  if added without it.
- **FR-010**: This sprint MUST audit `docs/decisions/*.md` against
  `docs/blueprint.html` §2's ten named decisions and either confirm each has
  a matching ADR or write the missing one(s) — the audit's result MUST be
  recorded (in the closing ADR or an equivalent record), not left implicit.
- **FR-011**: This sprint MUST confirm `CONTRIBUTING.md` and
  `CODE_OF_CONDUCT.md` satisfy the DoD's Portfolio checklist line naming
  them, updating either file only if the confirmation finds a real gap.

### Key Entities

- **Dependabot/Renovate config**: A committed configuration file
  (`.github/dependabot.yml` or `renovate.json`) that governs automated
  dependency-update PRs for this repository. Infrastructure, not
  per-feature output.
- **Supply-chain scan CI step**: A new step in an existing or new GitHub
  Actions workflow, running the chosen scanner against the dependency tree
  on every push/PR.
- **Content-Security-Policy**: A header or `<meta>` tag the shell serves,
  whose `script-src` is derived at build or serve time from the active
  environment's `remotes.<env>.json` `allowedOrigins` — not a separate,
  independently-authored value.
- **How-to docs**: `docs/how-to-connect-sso.md`, `docs/auth-strategy.md`,
  `docs/how-to-add-a-remote.md` — adopter-facing documentation, distinct
  from the architecture reference (`docs/architecture.md`) and the ADRs
  (`docs/decisions/`).
- **ADR coverage audit**: A one-time comparison between blueprint §2's ten
  decisions and `docs/decisions/*.md`, whose result is recorded rather than
  assumed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: GitHub's dependency graph shows Dependabot (or a Renovate
  onboarding PR/dashboard) active for this repository, verifiable without
  reading any code.
- **SC-002**: Every CI run on `push`/`pull_request` includes a supply-chain
  scan step whose pass/fail or report status is visible in the workflow run,
  alongside the existing `pnpm audit` step.
- **SC-003**: Opening the shell (any environment) and inspecting its
  response headers or `<head>` shows a `Content-Security-Policy` whose
  `script-src` exactly matches `'self'` plus that environment's
  `allowedOrigins` — confirmed by inspection, not just by reading the
  generating code.
- **SC-004**: A reviewer following any of the three pointers this sprint
  closes (`docs/how-to-connect-sso.md`, `docs/auth-strategy.md`,
  `docs/how-to-add-a-remote.md`) from `CLAUDE.md` or `docs/blueprint.html`
  finds a real, substantive file — zero broken promises remain.
- **SC-005**: A reviewer comparing blueprint §2's ten decisions against
  `docs/decisions/*.md` finds a 1:1 match (or a written record of any
  deliberate exception) — zero silently-undocumented decisions remain.

## Assumptions

- **Dependabot is the default choice over Renovate** unless a reason to
  prefer Renovate surfaces during planning — Dependabot requires zero
  additional infrastructure (native to GitHub, this project's host) and the
  blueprint DoD lists both as acceptable ("Dependabot/Renovate"). This can
  be revisited in planning if the config surface doesn't fit the project's
  actual needs (e.g., pnpm workspace protocol handling).
- **The CSP is generated at build time**, derived from the same
  `remotes.<env>.json` file the shell already reads for `allowedOrigins` —
  consistent with ADR-0012's "one build serves all three environments"
  design (the registry file, not a code branch, is the environment).
- **The supply-chain scanner runs report-only in CI initially** (visible,
  not blocking), matching this project's existing posture for `pnpm audit`
  (`continue-on-error: true`, "reviewed rather than enforced") — planning
  may revisit this default if the chosen tool's own norms differ, but it is
  not assumed to block merges from day one without that being a deliberate,
  stated choice (FR-003).
- **This sprint does not add a real identity-provider integration** —
  `docs/how-to-connect-sso.md` documents how an adopter would do it, per
  ADR-0009's existing "stub is deliberate, not unfinished" decision. Writing
  the doc is this sprint's job; wiring a real SSO provider is explicitly out
  of scope, the same boundary ADR-0009 already drew.

### Dependencies

- `apps/shell/src/internal/federation/origin-guard.ts` and
  `remotes.<env>.json` (`002-shell-host`, ADR-0012) — the existing
  application-level origin allow-list the CSP must derive from and agree
  with.
- `packages/auth` and ADR-0009 (`001-shared-packages-foundation` era) — the
  stub contract `docs/how-to-connect-sso.md`/`docs/auth-strategy.md` must
  document accurately.
- `apps/dashboard`, `apps/admin`, and the sprint-7 generator
  (`006-remote-generator`) — both remote-creation paths
  `docs/how-to-add-a-remote.md` must cover.
- `.github/workflows/ci.yml` — the existing `pnpm audit` step and CI
  triggers the new supply-chain scan step must sit alongside, not replace.
- `docs/blueprint.html` §2 and §16 (Definition of Done) — the decision
  catalog and checklist items this sprint audits against and closes.

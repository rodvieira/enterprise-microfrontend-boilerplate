# Feature Specification: Launch Prep

**Feature Branch**: `008-launch-prep`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Sprint 9 — Launch prep (README, technical post draft, deploy documentation): prepares every launch artifact that lives in version control and can be authored without external infrastructure access — README rewrite, a full draft of the technical blog post about the exposed/internal boundary decision, and deploy documentation. Explicitly deferred to the maintainer as real, separate, external actions: the actual production deploy, recording the demo GIF, pinning the repo, and publishing the blog post externally."

## User Scenarios & Testing *(mandatory)*

The people served here are: a visitor landing on the repository for the
first time (served by the README rewrite), the maintainer about to actually
launch — deploy, record, pin, publish — who needs every artifact that
*can* be prepared in advance already done so the remaining, genuinely
external actions are the only things left (served by all three
deliverables), and a reader of the eventual published technical post who
has no context on this project (served by the post being self-contained).

### User Story 1 - A first-time visitor understands the project without reading the blueprint (Priority: P1)

Someone lands on the repository's README — not `docs/blueprint.html`, not
`docs/decisions/` — and within it finds what the project is, why it exists,
how the architecture works at a glance, how to run it locally, and where to
go for more depth. The README no longer says "under active development."

**Why this priority**: The README is the first thing anyone sees. A stub
README undersells eight sprints of real, working architecture — this is
the single highest-leverage artifact in the whole launch checklist.

**Independent Test**: Read only `README.md`, with no other file open.
Confirm it answers "what is this," "why does it exist," "how do I run it,"
and "where do I learn more" without requiring `docs/blueprint.html` to
understand any of those four questions (the blueprint may still be linked
for full depth).

**Acceptance Scenarios**:

1. **Given** the rewritten README, **When** a visitor reads only the
   opening section, **Then** they understand this is a micro-frontend
   boilerplate (Module Federation 2.0, Rspack), what problem it solves,
   and that it ships two real, composed example remotes plus a
   dual-mode generator — not an abstract technology demo.
2. **Given** the rewritten README, **When** a visitor follows the quick
   start, **Then** `pnpm install && pnpm dev` is the complete, correct
   path to a running local instance (matching every prior sprint's actual
   quick-start commands).
3. **Given** the rewritten README, **When** a visitor looks for where the
   demo GIF and live deployed links should be, **Then** they find one
   clearly marked, self-contained section — not scattered placeholders —
   with a comment or note stating what belongs there and why it isn't
   filled in yet.
4. **Given** the rewritten README, **When** a visitor wants architectural
   depth, **Then** they find direct links to `docs/blueprint.html`,
   `docs/architecture.md`, and `docs/decisions/`, not a restatement of
   their content.

---

### User Story 2 - The technical post exists as a complete, publishable draft (Priority: P1)

The blueprint names exactly one technical post to write: about the
exposed/internal boundary decision. That post exists in the repository as
a complete markdown draft — not an outline, not a stub — substantive
enough that the maintainer's remaining work before publishing it
externally is picking a platform and hitting publish, not writing it.

**Why this priority**: This is the one specific piece of content the
blueprint's own Portfolio checklist names by subject. Everything else in
this sprint supports discoverability; this is content that has to actually
be written, and writing it is exactly the kind of work this sprint can do
in full.

**Independent Test**: Read the draft with no other context. Confirm it
explains the problem (Module Federation prescribes no folder structure),
the decision (`exposed/`/`internal/`, ADR-0006), how it's enforced
(`dependency-cruiser`, ADR-0007), and at least one concrete, real detail
from this project's own history that a generic "how we structured our
monorepo" post wouldn't have (e.g., the dependency-cruiser rule that was
initially wrong until a real second app existed to catch it, or the
Tailwind CSS chunk-loading gotcha found building `apps/dashboard`).

**Acceptance Scenarios**:

1. **Given** the draft, **When** read start to finish, **Then** it stands
   alone — a reader needs no other file open to follow the argument.
2. **Given** the draft's claims about this project's own architecture,
   **When** checked against the real code and ADRs, **Then** every claim
   is accurate (no invented detail, no claim the actual implementation
   contradicts).
3. **Given** the draft is unpublished, **When** it's read, **Then** it
   contains no placeholder text, no "TODO," and no section left
   deliberately thin — it is complete, not an outline dressed as a draft.

---

### User Story 3 - A maintainer knows exactly how to deploy this project (Priority: P2)

`ADR-0007` commits this project to "monorepo convenience, separate-repo
discipline" — each remote independently deployable. `ADR-0012` commits to
"one build serves all environments" via `FEDERATION_ENV`. Neither ADR
documents the actual deploy mechanics a maintainer would follow to turn a
local build into a real, running, publicly reachable instance.

**Why this priority**: P2, not P1 — the actual deploy is explicitly the
maintainer's own action this sprint doesn't perform, so this documentation
supports that action without being blocking to launch-readiness the way
the README and the post are. But without it, the maintainer's first real
deploy attempt has to reconstruct the `FEDERATION_ENV`/registry mechanism
from source rather than from a written guide.

**Independent Test**: Follow the guide's steps for building the shell and
one remote for `production`, with no other file open, and confirm every
command and file it references matches what the real `rspack.config.ts`
files and `package.json` scripts actually do.

**Acceptance Scenarios**:

1. **Given** the deploy guide, **When** followed for the shell, **Then**
   it correctly describes building with `FEDERATION_ENV=production`,
   what gets copied to `remotes.json`, and that each app's build output is
   static assets deployable to any static host.
2. **Given** the deploy guide, **When** followed for a remote (dashboard
   or admin), **Then** it correctly describes that a remote is
   independently deployable and what URL the shell's `remotes.production.json`
   needs to point at once it's live.
3. **Given** the guide, **When** read, **Then** it explicitly states that
   this repository's `remotes.production.json`/`remotes.staging.json`
   currently contain empty `remotes` arrays (real, but not yet pointed at
   any live deployment) — not silently implying a production instance
   already exists.

---

### User Story 4 - Every already-closed Portfolio checklist item is confirmed, not assumed (Priority: P3)

`docs/blueprint.html`'s Portfolio DoD lists `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, issue/PR templates, and "ADRs for every decision in
§2" as launch requirements. Prior sprints already closed all four — this
sprint re-confirms that's still true, the same "confirm, don't assume"
discipline `007-docs-security` established (which found two real, stale
gaps in `CONTRIBUTING.md` by actually checking instead of assuming).

**Why this priority**: P3 — lowest risk of the four stories, since these
items were already verified once. Re-confirming is cheap insurance against
drift, not new discovery work.

**Independent Test**: Re-run the same checks `007-docs-security` used —
list `docs/decisions/*.md` against blueprint §2, confirm
`CONTRIBUTING.md`/`CODE_OF_CONDUCT.md`/`.github/ISSUE_TEMPLATE/`/
`.github/PULL_REQUEST_TEMPLATE.md` are present and current.

**Acceptance Scenarios**:

1. **Given** `docs/decisions/`, **When** listed against blueprint §2's ten
   items, **Then** the 1:1 match `007-docs-security` established still
   holds (no new decision has been made without an ADR since).
2. **Given** `CONTRIBUTING.md`, **When** read, **Then** it reflects this
   sprint's own new artifacts (the deploy guide, if relevant) rather than
   going stale the way it did before `007-docs-security`'s fix.

---

### Edge Cases

- What happens if the maintainer deploys before recording the demo GIF, or
  records it before the README section exists? The README's placeholder
  section must work correctly regardless of ordering — it names what goes
  there without assuming either step happened first.
- What happens if the technical post's claims about the codebase drift
  after this sprint (a later change alters the exposed/internal
  mechanism)? Out of scope for this sprint to prevent — the post is a
  point-in-time technical account, the same as any of this project's own
  ADRs, not a living document this sprint commits to keeping in sync
  forever.
- What happens if a maintainer wants to deploy to a host with server-side
  header support (real HTTP CSP headers, not the `<meta>` tag
  `007-docs-security` shipped)? The deploy guide notes this as a possible
  upgrade a specific host enables, without requiring it — the `<meta>`
  tag approach must keep working as the documented default regardless of
  host choice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `README.md` MUST replace its "under active development" stub
  with real content: what the project is, why it exists, an architecture
  summary, a working quick start, and links to `docs/blueprint.html`,
  `docs/architecture.md`, and `docs/decisions/`.
- **FR-002**: `README.md` MUST contain exactly one clearly-marked section
  for the demo GIF and live URLs, with an inline note stating both are
  pending a real deployment and recording — not silently absent, not
  scattered across multiple placeholders.
- **FR-003**: A complete, substantive markdown draft of the technical post
  on the exposed/internal boundary decision MUST exist in the repository,
  covering the problem, the decision (ADR-0006), its enforcement
  (`dependency-cruiser`, ADR-0007), and at least one concrete detail from
  this project's own real history.
- **FR-004**: Every factual claim in the technical post about this
  project's own architecture or history MUST be accurate against the real
  code, ADRs, and `docs/architecture.md` — verified during this sprint,
  not asserted from memory.
- **FR-005**: `docs/how-to-deploy.md` MUST exist and document the real
  build/deploy mechanics for the shell and for an independently-deployed
  remote, including the `FEDERATION_ENV` mechanism and what a maintainer
  must update (`remotes.<env>.json`) once a remote has a real URL.
- **FR-006**: `docs/how-to-deploy.md` MUST state plainly that
  `remotes.staging.json`/`remotes.production.json` currently have empty
  `remotes` arrays — a real, current fact, not an implied live deployment.
- **FR-007**: This sprint MUST re-confirm (not assume) that
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/`,
  `.github/PULL_REQUEST_TEMPLATE.md`, and full `docs/decisions/` coverage
  of blueprint §2 are all still true as of this sprint, editing only if a
  real gap is found.
- **FR-008**: This sprint MUST NOT perform a real production deploy,
  MUST NOT record or embed an actual demo GIF, MUST NOT pin the
  repository, and MUST NOT publish the technical post to any external
  platform — all four remain a maintainer's own, separate, deliberate
  action.

### Key Entities

- **README.md**: The repository's front door — rewritten in this sprint,
  distinct from `docs/blueprint.html` (the full technical spec) and
  `docs/architecture.md` (the contributor-facing reference).
- **Technical post draft**: A new markdown file, not part of `docs/decisions/`
  (which records decisions, not prose aimed at an external reader) —
  content written for publication elsewhere, staged here first.
- **`docs/how-to-deploy.md`**: A new how-to doc, matching the pattern
  `007-docs-security` established with `docs/how-to-connect-sso.md` and
  `docs/how-to-add-a-remote.md`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time reader of `README.md` alone (no other file
  open) can correctly state what the project is, why it exists, and how
  to run it locally.
- **SC-002**: The technical post draft requires no additional writing
  before a maintainer could publish it — reading it start to finish
  produces a complete, coherent technical argument with zero placeholder
  content.
- **SC-003**: Following `docs/how-to-deploy.md`'s steps for building the
  shell and one remote for `production` produces output matching what the
  real `rspack.config.ts`/`package.json` scripts actually do, verified by
  actually running the documented commands.
- **SC-004**: Re-running `007-docs-security`'s blueprint-§2-vs-ADR audit
  and Portfolio-checklist confirmation after this sprint shows zero new
  gaps.
- **SC-005**: Zero real external actions (production deploy, GIF
  recording, repo pin, external publish) occur as a side effect of this
  sprint's own work.

## Assumptions

- **The demo GIF and live URLs are explicitly out of scope for this
  sprint's own automated work** — the same "real mechanism, external
  action deliberately left to the adopter" pattern ADR-0009 (auth),
  ADR-0014 (GitHub Packages publish), and ADR-0015 (Socket API key)
  already established across this project. README.md gets one correctly
  placed, clearly marked section; filling it in is the maintainer's next
  action, not this sprint's.
- **The technical post is written for an external, general technical
  audience** (a blog readership, not this repository's own contributors)
  — distinct in voice and audience from `docs/architecture.md` (written
  for a contributor already inside the codebase) and the ADRs (written as
  an internal decision record).
- **No specific static host is assumed for the deploy guide.** This
  project's build output is host-agnostic static assets (confirmed by
  `007-docs-security` research D1's reasoning for why the CSP is a
  `<meta>` tag, not a header) — the guide documents the mechanism
  (`FEDERATION_ENV`, per-app independent builds, registry file updates),
  not a specific provider's dashboard steps.
- **Repository pinning is a GitHub profile-level action** with no
  in-repository artifact to produce — this sprint has nothing to prepare
  for it beyond confirming the repository itself is in the state a
  maintainer would want to present (which stories 1–4 already ensure).

### Dependencies

- `docs/blueprint.html` §9 and §16 (Definition of Done, Portfolio
  checklist) — what this sprint's scope is drawn from.
- `docs/decisions/0006-exposed-internal-boundary.md` and
  `0007-monorepo-and-standalone-parity.md` — the technical post's subject
  matter.
- `docs/decisions/0012-runtime-registry-fetch.md` — the
  `FEDERATION_ENV`/registry mechanism `docs/how-to-deploy.md` documents.
- `apps/shell/src/internal/federation/remotes.staging.json` and
  `remotes.production.json` — their current (empty) state, which
  `docs/how-to-deploy.md` must describe accurately.
- `007-docs-security` — the "confirm, don't assume" precedent this
  sprint's User Story 4 repeats, and the how-to-doc pattern
  `docs/how-to-deploy.md` follows.

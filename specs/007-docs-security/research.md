# Phase 0 Research: Docs + Security

## D1 — CSP mechanism: `HtmlRspackPlugin`'s own `meta` option, not a hand-edited `index.html`

**Decision**: Compute the CSP value in `apps/shell/rspack.config.ts` from the
same `allowedOrigins` array the build already resolves for
`CopyRspackPlugin` (via `resolveRegistrySourcePath` / reading the resolved
`remotes.<env>.json`), and pass it to `HtmlRspackPlugin`'s `meta` option:

```ts
meta: {
  'Content-Security-Policy': {
    'http-equiv': 'Content-Security-Policy',
    content: buildCsp(allowedOrigins),
  },
}
```

`apps/shell/index.html` itself is untouched — no template placeholder, no
second build-time templating mechanism alongside the existing
`CopyRspackPlugin` one.

**Rationale**: Confirmed directly against the installed `@rspack/core`
(`node_modules/@rspack/core/dist/builtin-plugin/html-plugin/options.d.ts`):
`HtmlRspackPluginOptions.meta` is `Record<string, string | Record<string,
string>>`, documented as "Allows to inject meta-tags" — the nested-object
form is exactly for tags needing an attribute other than `name` (here,
`http-equiv`), the same convention `html-webpack-plugin` (which this API
mirrors) uses. This is simpler than adding template-parameter interpolation
to `index.html`: one new pure function
(`apps/shell/src/internal/federation/build-csp.ts`), no new templating
syntax introduced into a file that has none today.

**A `<meta>` CSP, not an HTTP header**: this project has no server of its
own — `apps/shell`'s build output is static assets, deployed to whatever
static host an adopter chooses (unspecified, per `docs/architecture.md`).
An HTTP `Content-Security-Policy` header requires host-level configuration
this repository cannot control or verify. A `<meta http-equiv=
"Content-Security-Policy">` tag is embedded directly in the built HTML,
requires no hosting-specific configuration, and is honored by every
browser for the directives this sprint needs (`script-src`). `frame-
ancestors` and `report-uri` are not supported in a `<meta>` CSP — out of
scope here, since neither is named by the blueprint DoD's "CSP restricts
remote script-src to known origins" line.

**Alternatives considered**:
- A `templateParameters` function + `<%= %>` placeholder in `index.html` —
  rejected: `meta` already covers this exact case with less surface area
  (no new templating convention introduced into a previously static file).
- An HTTP header set via a hosting-platform config (`vercel.json`,
  `netlify.toml`, ...) — rejected: this project has never committed to a
  specific static host (unlike, say, a framework with a canonical deploy
  target), so a header-based CSP would either pick a host this project
  doesn't otherwise depend on, or require every adopter to hand-translate
  it to their own host's config — the `<meta>` tag needs no translation.

## D2 — Dependabot over Renovate

**Decision**: `.github/dependabot.yml` with two `package-ecosystem`
entries: `npm` (root directory `/`, which Dependabot's npm ecosystem
already understands as pnpm-workspace-aware — it reads `pnpm-lock.yaml`
directly, GA support confirmed as of Dependabot's 2023 pnpm rollout) and
`github-actions` (so the workflow files' own pinned Action versions, e.g.
`actions/checkout@v4`, get automated update PRs too).

**Rationale**: Zero additional infrastructure — Dependabot is native to
GitHub, this project's host, activates from a single committed YAML file
with no separate account/dashboard/app-install step a reader would have to
trust was actually done. The blueprint DoD names "Dependabot/Renovate"
as an either-or; Dependabot is the lower-friction choice for a project with
no existing Renovate setup and no cross-host portability requirement.

**Alternatives considered**:
- Renovate — rejected for this project specifically: requires installing
  the Renovate GitHub App (an external action a repository owner takes
  outside version control, unverifiable by reading the repo alone) or a
  self-hosted runner; Dependabot's config-file-only activation is simpler
  and matches this project's "everything real is committed and verifiable
  by reading the repo" posture (the same reasoning `research D5` in
  `006-remote-generator` applied to why a live publish stays a deliberate,
  separate action).

## D3 — Two scanners, distinct from `pnpm audit`: OSV-Scanner and Socket

**Decision**: Add two new **jobs** to `ci.yml` (not steps inside the
existing `quality` job — both integrate as their own job, confirmed against
each tool's real, current documentation), both running on the same
`push`/`pull_request` triggers `ci.yml` already declares:

1. **OSV-Scanner**, via its reusable workflow (confirmed against
   `google.github.io/osv-scanner/github-action/` — there is no step-level
   action, only this reusable-workflow form):
   ```yaml
   osv-scan:
     permissions:
       actions: read
       security-events: write
       contents: read
     uses: "google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@v2.5.0"
     with:
       scan-args: |-
         --recursive
         ./
       fail-on-vuln: false
   ```
   `fail-on-vuln: false` is the tool's own native report-only switch —
   used instead of a bolted-on `continue-on-error`, and stated explicitly
   as a deliberate choice matching this project's existing `pnpm audit`
   posture ("a new upstream advisory must not block an unrelated PR;
   reviewed rather than enforced") — arrived at independently for the same
   underlying reason, not copied unexamined.
2. **Socket**, via its CLI-based Action integration (confirmed against
   `docs.socket.dev/docs/socket-for-github-actions` — the CLI-driven job
   below, not the GitHub App, since the App requires an org-level install
   outside what a committed workflow file can do):
   ```yaml
   socket-security:
     permissions:
       issues: write
       contents: read
       pull-requests: write
     runs-on: ubuntu-latest
     continue-on-error: true
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-python@v5
         with: { python-version: '3.12' }
       - run: pip install socketsecurity --upgrade
       - env:
           SOCKET_SECURITY_API_KEY: ${{ secrets.SOCKET_SECURITY_API_KEY }}
           GH_API_TOKEN: ${{ secrets.GITHUB_TOKEN }}
         run: socketcli --target-path "$GITHUB_WORKSPACE" --scm github ...
   ```
   **This step requires a `SOCKET_SECURITY_API_KEY` repository secret this
   project does not have** — Socket's CLI needs a real API key from a real
   Socket.dev account, which is external account setup no CI workflow file
   can create on its own (the same class of external, adopter-owned setup
   as sprint 7's GitHub Packages publish credentials, research D5). The job
   is wired for real and will do real work the moment a maintainer adds
   that secret; until then it fails fast on an empty/invalid key.
   `continue-on-error: true` is what keeps that failure from blocking every
   PR in the meantime — not a statement that Socket's own findings don't
   matter once configured.

**Rationale**: distinct signal from CVE/advisory scanning: install-time
script behavior, typosquatting, and supply-chain risk in newly-added
dependencies, which neither `pnpm audit` nor OSV-Scanner's advisory-database
matching catches.

**Rationale, and why "OWASP CVE Lite CLI" isn't used verbatim**: The
blueprint text names "OWASP CVE Lite CLI" — no tool by that exact name
exists (checked: no npm package, no GitHub Action, no OWASP-published
project under that name). Per this project's own established discipline
(`006-remote-generator` research D1 rejected the blueprint's
`federation.config.ts`/`remote.manifest.json` sketch because neither
existed in the real remotes it was supposed to be extracted from) — a
sprint is built against what's real, not against an aspirational document's
exact wording. OSV-Scanner is the closest real match to the blueprint's
intent (a lightweight, fast, CLI-based CVE scanner, backed by a database —
OSV.dev — that both OWASP-adjacent tooling and Google's own security team
treat as a standard aggregation point for NVD/CVE data) and is genuinely
maintained, real, and already widely adopted as a GitHub Action. Socket is
named verbatim in the blueprint and is used as specified.

**Alternatives considered**:
- Trivy (Aqua Security) instead of OSV-Scanner — also real and widely
  used, but broader in scope (container/IaC scanning this project has no
  use for); OSV-Scanner's narrower dependency-lockfile focus matches this
  sprint's actual need with less unused surface area.
- Making either new scanner blocking (no `continue-on-error`) from day
  one — rejected per FR-003's explicit requirement that this be a stated
  choice, not a default: this project has exactly one data point so far on
  how it handles a scanner flagging an already-accepted dependency
  (`pnpm audit`'s `undici` advisory, accepted and documented inline) — the
  same report-first posture is applied consistently rather than guessed
  differently per tool with no evidence either way.

## D4 — ADR coverage audit result (FR-010)

Comparing `docs/blueprint.html` §2's ten numbered decisions against
`docs/decisions/*.md` directly (not assumed):

| § | Decision | ADR |
|---|---|---|
| 01 | Project name | `0001-project-name.md` ✅ |
| 02 | Rspack, not Vite | `0002-rspack-over-vite.md` ✅ |
| 03 | Module Federation 2.0 | `0003-module-federation-2.md` ✅ |
| 04 | React 19 + TypeScript strict + Tailwind CSS | **missing** |
| 05 | pnpm workspaces + Turborepo | **missing** |
| 06 | exposed/ vs internal/ boundary | `0006-exposed-internal-boundary.md` ✅ |
| 07 | Dual-repo readiness | `0007-monorepo-and-standalone-parity.md` ✅ |
| 08 | Generator after two real remotes | `0008-generator-after-two-remotes.md` ✅ |
| 09 | Auth: contract and stub | `0009-auth-contract-not-implementation.md` ✅ |
| 10 | Two remotes: dashboard + admin | `0010-remote-examples.md` ✅ |

**Finding**: 8/10 already covered — and the two gaps are exactly the ADR
numbers already reserved for them (`0004`/`0005` sit unused between
`0003` and `0006`, matching the existing files' own 1:1 numbering against
§2's 01–10). **Decision**: write `docs/decisions/0004-react-typescript-tailwind.md`
and `docs/decisions/0005-pnpm-turborepo.md` in this sprint, filling exactly
those two numbers rather than appending them after `0014`. This sprint's own
new decisions (D1–D3 above) become `0015`, continuing the sequence after the
most recent ADR.

**Alternatives considered**: Numbering the two backfilled ADRs `0015`/`0016`
(chronological-by-sprint-written instead of matching §2's order) —
rejected: every existing ADR 0001–0003 and 0006–0010 already numbers
1:1 with its §2 item, so `0004`/`0005` are the numbers a reader would
expect there, not a gap to skip past.

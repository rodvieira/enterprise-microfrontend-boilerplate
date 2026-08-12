# 0018 — GitHub Pages as the reference deployment; the shell made subpath-deployable

**Status:** Accepted

## Context

`docs/how-to-deploy.md` (ADR-0007, ADR-0012) always described the deploy
mechanism as host-agnostic and left choosing a real host to "a maintainer's
own, separate action." `remotes.staging.json` and `remotes.production.json`
shipped with empty `remotes` arrays as a result — correct, not broken, but
meant no one had ever actually exercised the mechanism end to end.

Picking a real host to close that gap surfaced an assumption the shell had
never had to justify: every environment so far (`dev`, and the untested
`staging`/`production` placeholders) implicitly assumed the shell is served
from its origin's root (`/`). GitHub Pages, chosen here because a `gh`
session was already authenticated and it needs no new account, serves a
project page under `/<repo>/`, not `/`. Under that subpath, two things in
the shell broke:

- `apps/shell/src/internal/federation/manifest.ts` fetched a root-absolute
  `/remotes.json` — 404 under `/<repo>/`.
- `apps/shell/src/exposed/App.tsx`'s `createBrowserRouter` had no
  `basename` — it would try to match `/<repo>/dashboard` as if `/dashboard`
  were the whole path.

`output.publicPath: 'auto'` (all three apps, unchanged) already resolves
script/asset URLs relative to wherever they're loaded from, so neither
needed a fix — only the shell's own two root-absolute assumptions did.

## Decision

1. Deploy `apps/dashboard` and `apps/admin` as independent static builds
   under `/dashboard/` and `/admin/` on the same GitHub Pages site as the
   shell, and populate `remotes.production.json` with their real URLs —
   closing the placeholder ADR-0012 always expected a maintainer to close.
2. Add an optional `basePath` field to the registry JSON
   (`remotes.<env>.json`), read by `apps/shell/rspack.config.ts` the same
   way it already reads `allowedOrigins` for the CSP: one file, already
   fetched at build time, stays the single source of truth for
   everything specific to an environment — no second, independently
   maintained build flag (`DefinePlugin` or an extra env var), consistent
   with ADR-0012's reasoning for why the registry is a file at all.
3. Inject that `basePath` as `<base href>` via `HtmlRspackPlugin`'s
   already-used `base` option (the same plugin instance that already
   injects the CSP `meta` tag). `<base href>` is what lets both fixes
   share one source instead of two:
   - `manifest.ts`'s `REGISTRY_URL` becomes relative (`'remotes.json'`),
     resolving against `<base href>` regardless of the current URL.
   - `App.tsx` reads `new URL(document.baseURI).pathname` for the
     router's `basename`.
4. `remotes.dev.json`/`remotes.staging.json` are untouched — an absent
   `basePath` defaults to `'/'`, so `dev` and every previously-working
   deployment keep behaving exactly as before.
5. `.github/workflows/deploy.yml` builds all three apps and publishes
   them to one Pages site (`push` to `main`, plus `workflow_dispatch` for
   a manual run).

## Consequences

- `docs/how-to-deploy.md`'s claim that `remotes.staging.json`/
  `remotes.production.json` "currently ship with empty `remotes` arrays"
  is now true only for `staging`. The doc is updated to say so and to
  point at this ADR and the live URL, without becoming a GitHub-Pages-
  specific walkthrough — it still documents the host-agnostic mechanism;
  this ADR documents the one host actually exercised.
- Any future environment served from a non-root path (a different host,
  a different project-page-style URL) reuses the same `basePath` field —
  no new mechanism needed, only a new `remotes.<env>.json` entry.
- `staging` remains an unexercised placeholder. Nothing here changes
  that.

## Alternatives considered

- **`DefinePlugin`-inlined base path** — rejected for the same reason
  ADR-0012 rejected build-time registry injection: it would make the
  base path a second, independently-maintained value instead of living
  in the one file that already governs everything else per-environment.
- **A CI-templated `remotes.production.json`** (owner/repo interpolated
  at deploy time) — rejected as unnecessary indirection: this repository
  has one real GitHub Pages destination, so the real URLs are committed
  directly, the same way `remotes.dev.json`'s `localhost` URLs already
  are.

## Related

`docs/decisions/0007-monorepo-and-standalone-parity.md`,
`docs/decisions/0012-runtime-registry-fetch.md` — the registry-as-file
principle this decision extends. `docs/how-to-deploy.md` — updated
alongside this ADR.

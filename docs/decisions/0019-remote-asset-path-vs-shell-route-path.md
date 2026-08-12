# 0019 — Remote asset-hosting paths must not collide with the shell's own route paths

**Status:** Accepted

**Amends:** [ADR-0018](0018-github-pages-reference-deploy.md)

## Context

ADR-0018's deploy assembled one GitHub Pages site with the shell at the
root and each remote's static build under a subpath named after the
remote — `/dashboard/`, `/admin/`. Those are the exact same strings as
`routePath` in `remotes.production.json`, the path the shell's own React
Router owns client-side (`apps/shell/src/exposed/App.tsx`,
`discoverRemoteRoutes`).

That collision is invisible for client-side navigation (a link click never
issues a real HTTP request — the router just swaps `RemoteRegion` in). It
breaks on a hard navigation: loading `https://…/enterprise-microfrontend-
boilerplate/dashboard/` directly hits GitHub Pages' static file server,
which finds a real `index.html` at that path — the dashboard's own
standalone build (ADR-0007's standalone-parity build, correctly present
for exactly this reason) — and serves it. The shell's JavaScript never
runs. Confirmed live: the deployed `/dashboard/` returned the dashboard's
own `<title>dashboard — enterprise-microfrontend-boilerplate</title>`,
not the shell's.

A second, related gap: GitHub Pages does no server-side rewriting. A hard
navigation to a shell-owned route with no matching static file (e.g.
`/admin` before this fix, or any future shell route) gets GitHub's generic
404, not the shell's `index.html` — unlike `pnpm dev`'s
`devServer.historyApiFallback: true`, which this deploy has no equivalent
of.

## Decision

1. Remote static builds are hosted under a namespace that cannot collide
   with any shell route: `/remotes/<name>/` (`/remotes/dashboard/`,
   `/remotes/admin/`), not `/<name>/`. `remotes.production.json`'s
   `entry` URLs are updated to match. The shell's `routePath`s
   (`/dashboard`, `/admin`) keep their names — only where the remote's
   *files* live changes, never the client-side route the shell composes
   them under.
2. `_site/404.html` is a copy of the shell's own `dist/index.html`
   (`.github/workflows/deploy.yml`). GitHub Pages serves it (still with
   an HTTP 404 status, which does not stop a browser from running its
   scripts) for any path with no matching file — the shell boots, its
   router reads the real URL from `location`, and
   `patchRoutesOnNavigation` composes the right remote exactly as it
   already does for `pnpm dev`'s `historyApiFallback`. This works with no
   redirect/`sessionStorage` trick (the common GitHub Pages SPA
   workaround) because `<base href>` (ADR-0018) is already an absolute
   path, not relative to whichever URL 404.html happened to be served
   under.

## Consequences

- Any future remote added via `pnpm turbo gen remote` and deployed here
  must keep following this same `/remotes/<name>/` convention — asset
  path and route path are two different, deliberately non-overlapping
  namespaces, not two names for the same thing.
- `apps/dashboard` and `apps/admin` remain independently visitable at
  their own URLs (`/remotes/dashboard/`, `/remotes/admin/`) as standalone
  apps — ADR-0007's standalone parity guarantee, unaffected by this fix.
- This is not a GitHub Pages limitation specifically — any static host
  with no server-side rewrite rule (S3 without a redirect rule, a plain
  nginx `try_files` that isn't configured for SPA fallback) needs the
  same `404.html`-as-`index.html` treatment. A host that does support
  rewrites (Netlify, Vercel) doesn't strictly need it, but the
  `/remotes/<name>/` path separation is still correct regardless of host.

## Related

`docs/decisions/0018-github-pages-reference-deploy.md` — the deploy this
amends. `docs/decisions/0007-monorepo-and-standalone-parity.md` — why a
remote's own `index.html` exists to collide with in the first place.

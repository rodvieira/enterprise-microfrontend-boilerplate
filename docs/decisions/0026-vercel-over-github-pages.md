# 0026 — Vercel replaces GitHub Pages as the reference deployment

**Status:** Accepted

**Supersedes:** [ADR-0018](0018-github-pages-reference-deploy.md)

## Context

ADR-0018 chose GitHub Pages because a `gh` session was already
authenticated and it needed no new account. It worked, and the site was
live. But a browser check of production surfaced something the earlier
`curl` smoke tests had not:

```
GET /dashboard  ->  404   (page renders correctly)
GET /admin      ->  404   (page renders correctly)
```

That is ADR-0019's fallback behaving exactly as designed. GitHub Pages
does no server-side rewriting, so a client-side route with no matching
file gets `404.html` — which is a copy of `index.html`, so the browser
runs the shell's scripts and the page renders. A human sees the right
thing.

Nothing that reads status codes does. Crawlers treat both routes as
missing, uptime monitors report the app as down, and anything doing
link-checking or prerendering sees a broken site. For a boilerplate whose
whole argument is "this is what production-grade looks like", shipping a
reference deployment where every remote's route returns 404 undercuts the
claim.

There is no fix inside GitHub Pages. Rewrites are the missing capability,
and Pages does not have them.

## Decision

Deploy to Vercel, as a **single project**, and remove the Pages workflow.

`vercel.json` is four lines of consequence:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Vercel checks the filesystem before applying rewrites, so built assets and
each remote's `mf-manifest.json` are still served directly; only paths with
no file — the shell's own client-side routes — fall through to
`index.html`, now with **200**.

The site layout is unchanged from ADR-0019: shell at the root, each
remote's static build under `/remotes/<name>/`, never at the route path
its router owns. That decision was about a path collision, not about
Pages, and it survives the move intact.

### Single project, not one per remote

One Vercel project keeps everything same-origin. The alternative — a
project per app, each on its own domain — is closer to the architecture
this repository argues for, and would exercise `origin-guard.ts` and the
derived CSP against real cross-origin loads for the first time. It was
considered and deliberately deferred: it triples the setup an evaluator
must do before seeing anything, and the demo's job is to be looked at.
The mechanism supports it whenever someone wants it — that is what the
registry's `allowedOrigins` is for.

### The assemble moved into a script

`scripts/build-site.ts` now builds all three apps and composes `_site/`.
It used to be a sequence of steps inside the Pages workflow. Vercel's
build is a single command, and expressing the same layout twice — once in
CI, once in `vercel.json` — is two places to drift.

## Consequences

- `basePath` is gone from `remotes.production.json`. It existed because a
  Pages *project page* serves from `/<repo>/`; a Vercel project serves
  from the domain root, so the build emits `<base href="/">`.
- **A genuinely unknown URL now returns 200**, not 404 — the shell renders
  and its router decides. That is inherent to SPA fallback anywhere, and
  the opposite trade from the one Pages forced.
- **Preview deployments load production's remotes.** The registry names
  absolute URLs, and a preview build gets the production file. Correct
  under ADR-0012 (a registry is per environment, not per deployment) but
  worth knowing before reading a preview as a full integration test.
- `_site/` is added to Biome's ignore list. Without it, `pnpm lint` after
  a `pnpm build:site` walks every generated bundle and hangs — found by
  hanging.
- The published site URL changes. README, `docs/how-to-deploy.md`, and the
  production registry all move to the Vercel domain.

## Related

`docs/decisions/0018-github-pages-reference-deploy.md` — superseded.
`docs/decisions/0019-remote-asset-path-vs-shell-route-path.md` — the
`/remotes/<name>/` layout, which this keeps.
`docs/decisions/0012-runtime-registry-fetch.md`.

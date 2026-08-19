# enterprise-microfrontend-boilerplate

[![CI](https://github.com/rodvieira/enterprise-microfrontend-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/rodvieira/enterprise-microfrontend-boilerplate/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-brightgreen)](https://enterprise-microfrontend-boilerplat.vercel.app/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220)](https://pnpm.io/)

A production-grade starting point for large, scalable React applications
built on micro-frontend architecture — [Module Federation
2.0](https://module-federation.io/), via [Rspack](https://rspack.rs/).
The shell is an **orchestrator**: you give it the URLs of micro-frontends that
live in other repositories, built and deployed by other teams, and it composes
them into one application. Ships two real, working remotes — a dashboard and an
admin panel — that talk to each other and share a session **without importing a
single package from here**. A scaffolding generator
(`pnpm turbo gen remote`) produces a third, either inside this monorepo or as a
standalone repository that depends on nothing of ours.

## Why this exists

Every existing micro-frontend starter in the ecosystem is either a full
framework you adopt wholesale, a mature-but-dated router with no real
domain example, or a set of generators locked inside one specific monorepo
tool's ecosystem — usually with toy demos (a shop, a cart, a list of
characters) that prove the mechanics but never the operational concerns a
real second team hits: shared auth, dependency version drift, import
boundary violations, or what actually happens the day a second remote gets
built by people who didn't write the first one.

This project ships two working remotes instead of one, specifically
because the second one is what proves a convention actually generalizes
rather than merely happening to work once. Both consume the orchestrator
purely through props — the same position a team in another repository is in,
rather than the easier one a monorepo would let them get away with. It is not a full framework (no
proprietary vocabulary, no hosted cloud service), not locked to one
monorepo tool (every remote is independently deployable), and it does not
implement real authentication — it ships a stable contract instead of a
login flow, deliberately.

## What's actually running

- **`apps/shell`** — the host. Reads a per-environment remote registry
  and composes federated regions into one application; exposes nothing of
  its own over federation.
- **`apps/dashboard`** — KPI cards, an activity chart, and a recent
  activity feed, exposed over Module Federation as `./App`.
- **`apps/admin`** — a paginated user table and an invite/edit modal.
  Changing a user's role there publishes an event on the bus the shell passes
  in, which `apps/dashboard` subscribes to, updating its "active users" KPI
  live — no reload, no shared module, no direct import between the two
  remotes. This is this project's headline proof that the architecture
  works end-to-end, not just that two apps can be loaded side by side.
- **`pnpm turbo gen remote`** — a generator extracted from what
  `apps/dashboard` and `apps/admin` actually share (not designed ahead of
  them), producing a third remote either inside this monorepo or as a
  fully independent, standalone project — the latter consuming
  `packages/*` from whichever registry you publish your own scope to.
- **Guard rails in CI** that catch the two bugs that actually break
  micro-frontend architectures in production: `pnpm check:shared-deps`
  (dependency version drift across the shell and every remote) and
  `pnpm check:boundaries` (`dependency-cruiser`, the `exposed/`/`internal/`
  import boundary) — plus real dependency/CVE scanning and a
  Content-Security-Policy derived from the shell's own runtime origin
  allow-list.

## Demo & live URLs

![Changing a user's role in the admin remote, in one tab, moving the dashboard remote's active-users KPI in another](docs/assets/cross-remote-kpi.gif)

Two browser tabs. Changing a role in **admin** moves **dashboard**'s
"active users" KPI — across a tab boundary, with no reload, no shared
global, and no import between the two remotes. The update travels only
through the bus the shell owns and hands each remote as a prop.

Live: <https://enterprise-microfrontend-boilerplat.vercel.app/> — the
shell composing the real `apps/dashboard` and `apps/admin` remotes,
deployed to Vercel. [Deploying](docs/USAGE.md#deploying) covers putting it
on your own host.

## Quick start

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` — the shell composes both remotes
automatically. `/dashboard` and `/admin` are both live; switch users'
roles in admin and watch dashboard's "active users" KPI update in the
other tab, live.

## Adopting this for your own company

`dashboard` and `admin` exist to prove the conventions generalize — they
are examples, not something you ship. When you are ready to make this
repository yours:

```bash
pnpm eject --scope @acme --first-remote payments
```

That renames the `@enterprise-mfe` scope to yours, scaffolds your first
real remote in place of the two examples, and removes the artifacts of
*this* project's own working notes. It runs once, then deletes itself, and writes `EJECT-TODO.md` listing what a
script should not decide for you — mostly prose that still describes the
example remotes.

Run it on a clean working tree: `git reset --hard` is the undo, and the
command refuses to start without one.

## Stack

| Layer | Choice |
|---|---|
| Bundler | Rspack |
| Federation | Module Federation 2.0 |
| UI | React 19 + TypeScript + Tailwind 4 |
| Monorepo | pnpm workspaces + Turborepo |
| Routing | React Router |
| Lint / format | Biome |
| Tests | Vitest + Testing Library, Playwright for e2e |

Every app builds to static assets — no SSR, no runtime backend — so this
deploys anywhere that serves files. See
[Deploying](docs/USAGE.md#deploying) for Vercel, Netlify, Cloudflare,
S3 + CloudFront, Azure, and nginx.

## Learn more

- **[docs/USAGE.md](docs/USAGE.md)** — commands, a step-by-step from clone to
  your own platform, the shared packages and their APIs, adding a remote,
  deploying, and connecting real auth or telemetry.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — how to propose a change.

## License

MIT — see [LICENSE](LICENSE).

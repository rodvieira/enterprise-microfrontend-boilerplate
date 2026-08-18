# Usage

Everything you need to run, extend, and ship this project. If you only read
one page, read this one.

- [Step by step: from clone to your own platform](#step-by-step-from-clone-to-your-own-platform)
- [Commands](#commands)
- [How the pieces fit](#how-the-pieces-fit)
- [Shared packages](#shared-packages)
- [Adding a remote](#adding-a-remote)
- [Deploying](#deploying)
- [Connecting real authentication](#connecting-real-authentication)
- [Connecting telemetry](#connecting-telemetry)

---

## Step by step: from clone to your own platform

### 1. Run it

```bash
pnpm install
pnpm dev
```

| App | URL |
|---|---|
| shell (the host) | <http://localhost:3000> |
| dashboard remote | <http://localhost:3001> |
| admin remote | <http://localhost:3002> |

Open <http://localhost:3000>. The shell composes both remotes; `/dashboard`
and `/admin` are live.

Each remote also runs on its own — open `:3001` directly and the dashboard
renders standalone, with no shell. That is the property that lets a remote
move to its own repository later.

### 2. See the cross-remote update

Open `/admin` in one tab and `/dashboard` in another. In admin, **Invite or
edit user → Change an existing user's role → Submit**. The dashboard's
"active users" KPI moves in the other tab — no reload, no shared global, no
import between the two remotes. The update travels through
`@enterprise-mfe/event-bus`.

You need to be signed in for the admin form to appear (**Sign in**, top
right — it is a stub, any click signs you in as an admin).

### 3. Check it the way CI does

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm check:boundaries
pnpm check:shared-deps
```

### 4. Add your own remote

```bash
pnpm gen remote
```

Answers a few questions and writes `apps/<name>`, registers it in the dev
registry, and picks the next free port. See
[Adding a remote](#adding-a-remote).

### 5. Put your own name on it

```bash
pnpm rename --scope @acme --name acme-platform
```

Renames the npm scope (`@enterprise-mfe` → `@acme`) and the project name
across the whole checkout. The project name is not cosmetic: it is the root
package name, the shell's `<title>`, and the text in the shell's own
header — until you replace it, this boilerplate is visibly branding
whatever you ship.

`--name` is optional and defaults to the scope without its `@`.

**Nothing is deleted.** Both example remotes, the docs, and the command
itself all stay, so you can rename on day one and keep learning from the
examples. Run `pnpm install` afterwards — the lockfile still names the old
scope.

### 6. Later: drop the examples

```bash
pnpm eject --scope @acme --first-remote payments
```

`dashboard` and `admin` exist to prove the conventions generalise. When you
no longer need them, eject replaces both with your first real remote, does
the same renaming, and removes this project's own working notes. It runs
**once** and deletes itself, leaving `EJECT-TODO.md` with anything a script
should not decide for you.

Both commands run on a clean working tree only — `git reset --hard` is the
undo, and that only works from one.

---

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the shell and every remote together |
| `pnpm build` | Builds every app and package |
| `pnpm build:site` | Builds and assembles `_site/` — one deployable directory |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm e2e` | End-to-end tests (Playwright), shell composing real remotes |
| `pnpm lint` / `pnpm lint:fix` | Biome check / autofix |
| `pnpm typecheck` | TypeScript across every package and app |
| `pnpm check:boundaries` | Fails on a cross-app relative import, or anything reaching into another app's `internal/` |
| `pnpm check:shared-deps` | Fails when a shared dependency drifts between apps |
| `pnpm check:package-exports` | Packs each package and verifies its published exports resolve |
| `pnpm gen remote` | Scaffolds a new remote |
| `pnpm rename` | Renames the npm scope and project name — deletes nothing |
| `pnpm eject` | One-time: swaps the examples for your first real remote, then removes itself |

### The two checks worth understanding

Both exist because they catch failures that **do not fail the build** —
they fail silently at runtime, far from their cause.

- **`check:shared-deps`** — React, ReactDOM, `react-router`, `auth`,
  `event-bus`, `telemetry`, and Tailwind must resolve to one version across
  every app. Two copies of React, or two auth contexts, is a bug that
  surfaces nowhere near the version mismatch that caused it.
- **`check:boundaries`** — `src/exposed/` is an app's public surface;
  `src/internal/` is private, even across federation. Without enforcement,
  a remote's implementation detail quietly becomes another team's
  dependency.

---

## How the pieces fit

```
apps/shell        the host. Owns routing, the remote registry, and origin control.
apps/dashboard    a remote. Exposes ./App over Module Federation.
apps/admin        a second remote. Proves the conventions generalise.
packages/*        contracts shared by all of them.
```

### The remote registry

The shell does not hardcode where remotes live. At build time it copies one
of `apps/shell/src/internal/federation/remotes.<env>.json` to
`dist/remotes.json`, chosen by `FEDERATION_ENV`; at startup it fetches that
file and composes whatever it lists.

```jsonc
{
  "environment": "production",
  "allowedOrigins": ["https://your-domain.example"],
  "remotes": [
    {
      "name": "dashboard",
      "entry": "https://your-domain.example/remotes/dashboard/mf-manifest.json",
      "routePath": "/dashboard",
      "label": "Dashboard",
      "version": "1.4.2"        // optional
    }
  ]
}
```

**One build serves every environment.** Switching environments is switching
a file, never recompiling.

`allowedOrigins` is the security boundary: the shell refuses to load a
remote from an origin not on the list, and the same list generates the
shell's Content-Security-Policy — so the browser enforces it too.

`version` is optional, never resolved by the host, and exists so a failure
says `dashboard@1.4.2` instead of `dashboard`. See
[Deploying](#deploying) for how it makes rollback a one-line edit.

### Two failure surfaces, kept apart

A remote can fail to **load** (network, refused origin, timeout, bad
export) or fail while **rendering** (it loaded, then threw). They have
different causes and different owners, so the shell handles and reports
them separately — `useRemote` for the first, `RemoteBoundary` for the
second. Either way the failure is contained: the rest of the shell stays
navigable.

---

## Shared packages

Everything under `packages/` is consumed through workspace links —
`import { Button } from '@enterprise-mfe/ui'` works with no build step, and
editing a package hot-reloads into every running app.

### `@enterprise-mfe/ui`

The design system. Every component takes a required, programmatically
associated label where one applies, and carries its own focus, error, and
loading states.

```tsx
import { Button, Card, Input, Layout, Modal, Nav, Select, Table, ToastProvider, useToast } from '@enterprise-mfe/ui';

<Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
  <option value="admin">admin</option>
  <option value="viewer">viewer</option>
</Select>;
```

| Export | Purpose |
|---|---|
| `Button` | `variant`: primary / secondary / ghost / danger · `size`: sm / md / lg |
| `Card` | Surface with an optional `trend` indicator — the KPI tiles |
| `Input` / `Select` | Labelled form controls with `error` and `hint` wiring |
| `Modal` | Focus-trapped dialog, closes on Escape and backdrop click |
| `Table` | Typed columns, empty state, optional caption |
| `Nav` | Roving-tabindex navigation — one Tab stop, arrows move within |
| `Layout` | Header / sidebar / footer frame |
| `ToastProvider` + `useToast` | Transient notifications |
| `cx` | Class-name joiner |

Import the tokens once, in your app's CSS:

```css
@import "tailwindcss";
@import "@enterprise-mfe/ui/styles.css";
```

### `@enterprise-mfe/auth`

The session **contract**, backed by an in-memory stub. Not real
authentication — see [Connecting real
authentication](#connecting-real-authentication).

```tsx
import { AuthProvider, ProtectedRoute, useAuth } from '@enterprise-mfe/auth';

const { user, status, isAuthenticated, login, logout } = useAuth();
```

`status` is `'unknown' | 'authenticated' | 'unauthenticated'` — three
states, not a boolean, so a protected screen does not flash its signed-out
view on first paint.

The shell mounts the one `AuthProvider`; remotes inherit it through the
shared singleton, and only need their own when running standalone.

### `@enterprise-mfe/event-bus`

Typed publish/subscribe for cross-remote communication, including across
browser tabs.

```tsx
import { publish, subscribe, useEventSubscription } from '@enterprise-mfe/event-bus';

publish('user:role-changed', { userId, newRole });
useEventSubscription('user:role-changed', (payload) => { /* … */ });
```

Topics are a closed set (`EventMap`), so a typo fails to compile. Adding
one means adding its type **and** its runtime validator — payloads arriving
from another tab are validated at the receiving edge, because two tabs can
be running independently-deployed builds whose idea of a payload differs.

### `@enterprise-mfe/telemetry`

The observability contract, with a console sink by default. See
[Connecting telemetry](#connecting-telemetry).

### `@enterprise-mfe/shared-types`

`User`, `Role`, `Permission`, `ROLE_PERMISSIONS`, `permissionsForRole`,
plus the prop types a remote's exposed root receives. Deliberately small —
resist making it "types for everything".

### `@enterprise-mfe/federation-utils`

`useRemote()` and `RemoteBoundary` — remote loading and error containment.
Bundler- and federation-agnostic on purpose: it takes a loader function, so
it is testable with a plain promise.

---

## Adding a remote

```bash
pnpm gen remote
```

You are asked for a name, a route path, a label, and a mode:

- **Monorepo** — writes `apps/<name>`, links `packages/*` through the
  workspace, registers the remote in `remotes.dev.json`, and assigns the
  next free port.
- **Standalone** — writes an independent project outside this repository
  that depends on `@enterprise-mfe/*` as published packages.

> **Standalone mode needs a registry.** This repository does not publish its
> packages, so a standalone project's `pnpm install` cannot resolve them
> until you publish your own scope (`@acme/*`) to your own registry. The
> packaging is ready for that — `pnpm check:package-exports` verifies each
> package's published shape — but the publish itself is your decision.
> Inside the monorepo, nothing needs publishing.

Whatever mode you pick, the generated app follows the same rule as every
other: only `src/exposed/` may be imported from outside it.

Staging and production registries are **not** touched — pointing a remote
at a real URL is a deployment decision, not a scaffolding one.

---

## Deploying

Every app builds to **static assets** — no SSR, no runtime backend. That
means this deploys anywhere that serves files, and the differences between
clouds come down to two questions:

1. **Can it rewrite unmatched paths to `index.html`?** The shell's routes
   (`/dashboard`, `/admin`) have no file behind them.
2. **Where do the remotes' files live?** They must not sit at the path the
   shell routes them to.

### One command, one directory

```bash
pnpm build:site      # builds everything, assembles _site/
```

```text
_site/
├── index.html            the shell
├── remotes.json          which remotes to compose, and from which origins
├── 404.html              copy of index.html, for hosts without rewrites
└── remotes/
    ├── dashboard/        the dashboard remote's own build
    └── admin/
```

> **Never host a remote at the path the shell routes it to.** The shell's
> router owns `/dashboard`; the remote's build lives at
> `/remotes/dashboard/`. Put the remote's `index.html` at `/dashboard` and a
> hard navigation there is served that file directly, never reaching the
> shell — the page looks almost right, which is what makes it expensive to
> diagnose.

### Before you deploy: the registry

Deployment is the one thing the registry has to know about. In
`apps/shell/src/internal/federation/remotes.production.json`:

```jsonc
{
  "environment": "production",
  "allowedOrigins": ["https://acme.example"],
  "remotes": [
    {
      "name": "dashboard",
      "entry": "https://acme.example/remotes/dashboard/mf-manifest.json",
      "routePath": "/dashboard",
      "label": "Dashboard"
    }
  ]
}
```

`allowedOrigins` is enforced twice: the shell refuses to load a remote from
an origin not listed, and the same list generates the shell's
Content-Security-Policy, so the browser refuses too. **A missing origin
here looks exactly like a broken remote** — check it first.

Add `"basePath": "/your-subpath/"` only if the shell is served from a
subpath rather than a domain root.

Then build for that environment:

```bash
FEDERATION_ENV=production pnpm build:site
```

### Per-cloud setup

Everything below deploys the same `_site/`. The only real difference is how
each one expresses "rewrite unmatched paths to `index.html`".

#### Vercel — `vercel.json`

What this repository uses.

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build:site",
  "outputDirectory": "_site",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vercel checks the filesystem before applying rewrites, so assets and each
remote's `mf-manifest.json` keep serving directly. Import the repo and it
reads this file — nothing to configure in the dashboard.

#### Netlify — `netlify.toml`

```toml
[build]
  command = "pnpm build:site"
  publish = "_site"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

`status = 200` is the load-bearing part. The default (`301`) would redirect
the URL instead of serving the shell at it.

#### Cloudflare Pages — `_redirects`

Build command `pnpm build:site`, output `_site`, and commit a `_redirects`
file into the output:

```text
/*    /index.html   200
```

Add it by having `build:site` copy a `public/_redirects`, or write it in
the build command:

```bash
pnpm build:site && printf '/*    /index.html   200\n' > _site/_redirects
```

#### AWS S3 + CloudFront

S3 alone has no rewrite. Two options, in order of preference:

- **CloudFront Function** on viewer-request: if the URI has no file
  extension, set `request.uri = '/index.html'`. Precise, and keeps real
  404s as 404s.
- **Custom error response**: map 403 and 404 to `/index.html` with response
  code **200**. Simpler, but every genuinely missing asset also returns the
  shell.

Upload with `aws s3 sync _site/ s3://your-bucket --delete`, and invalidate
`/index.html` and `/remotes.json` on each deploy — those two must never be
served stale, or the shell composes yesterday's remotes.

#### Azure Static Web Apps — `staticwebapp.config.json`

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/remotes/*", "*.{css,js,json,png,svg,gif}"]
  }
}
```

The `exclude` matters: without it the fallback swallows requests for the
remotes' own manifests.

#### nginx / any container

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Serve `_site` as the root. This is also what a plain Docker image with
`nginx:alpine` needs — copy `_site` to `/usr/share/nginx/html` and drop in
that config.

#### GitHub Pages — works, with a caveat worth knowing

Pages has **no rewrite capability**. It serves `404.html` for unmatched
paths, which `build:site` emits as a copy of `index.html`, so the shell
boots and the page renders correctly — but the response status is **404**.

Humans see the right page. Crawlers, uptime monitors, and link checkers see
a broken site. Fine for an internal demo; prefer a host with rewrites for
anything public.

A Pages *project page* also serves from `/<repo>/`, so set
`"basePath": "/<repo>/"` in the production registry.

### Deploying remotes independently

Everything above puts the shell and its remotes on one origin, which is the
simplest thing that works. The architecture does not require it — and the
point of micro-frontends is that it should not.

To give each remote its own deployment, deploy each app's own `dist/`
separately and point the registry at real, separate origins:

```jsonc
{
  "allowedOrigins": [
    "https://shell.acme.example",
    "https://dashboard.acme.example"
  ],
  "remotes": [
    {
      "name": "dashboard",
      "entry": "https://dashboard.acme.example/mf-manifest.json",
      "routePath": "/dashboard"
    }
  ]
}
```

Each remote then ships on its own schedule, and only the shell's registry
changes when one moves. This is also the first configuration that genuinely
exercises `origin-guard.ts` and the derived CSP — same-origin hosting never
puts either to the test.

Each remote's own `dist/` still needs the SPA rewrite if you want its
standalone URL to be navigable.

### Rollback

Publish each remote to an **immutable, versioned path**:

```text
https://cdn.acme.example/dashboard/1.4.1/mf-manifest.json
https://cdn.acme.example/dashboard/1.4.2/mf-manifest.json   ← current
```

Then rolling back is editing `entry` and `version` in the registry and
redeploying that JSON. No remote is rebuilt, because 1.4.1 was never
overwritten. Canary and blue/green work the same way: two environments'
registries pointing at different versions of one remote.

```jsonc
{ "name": "dashboard", "entry": ".../1.4.1/mf-manifest.json", "version": "1.4.1" }
```

`version` is optional and the host never resolves or compares it — `entry`
alone decides what loads. It exists so a failure reads `dashboard@1.4.2`
instead of `dashboard`. A remote on a mutable path should omit it rather
than state a version it cannot guarantee.

### When a deployed remote does not load

In order of how often it is the cause:

1. **Its origin is missing from `allowedOrigins`** — the shell refuses
   before fetching anything, and logs the refusal with the origin it
   rejected.
2. **The shell was built for the wrong environment** — check
   `FEDERATION_ENV`, then open `/remotes.json` on the deployed site and
   confirm it is the file you expected.
3. **`entry` 404s** — open it directly. It must be the remote's
   `mf-manifest.json`, not its `index.html`.
4. **The remote is hosted at the shell's route path** — see the warning at
   the top of this section.

## Connecting real authentication

`@enterprise-mfe/auth` ships a stub — an in-memory fake user behind a stable
contract. That is deliberate: every organisation brings its own identity
provider, and a login flow baked into a boilerplate is one you would have to
remove.

To connect a real provider, replace the three stub calls in
`packages/auth/src/context.tsx` (`stubSignIn`, `stubSignOut`,
`stubRestore`) with your OIDC client. Any OIDC-compliant provider — Okta,
Entra ID, Auth0, Keycloak, Google Workspace — fits the same three
variables:

```bash
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_REDIRECT_URI=http://localhost:3000/callback
```

**Nothing else changes.** `useAuth()`, `<ProtectedRoute>`, and every
consumer keep working, because the contract does not change — which is the
whole point of shipping one.

Keep tokens out of the shared package's public surface: consumers need
`user`, `status`, and the two actions, not credentials.

---

## Connecting telemetry

`@enterprise-mfe/telemetry` ships an interface and a console sink, not a
vendor integration — same reasoning as auth.

Implement four methods and pass your adapter in:

```tsx
import type { Telemetry } from '@enterprise-mfe/telemetry';

const sentryTelemetry: Telemetry = {
  remoteLoadStarted() {},
  remoteLoadSucceeded(remote, durationMs) { /* metric */ },
  remoteLoadFailed(remote, error, durationMs) { /* captureException */ },
  remoteRenderCrashed(remote, error) { /* captureException */ },
};

<TelemetryProvider telemetry={sentryTelemetry}>
```

Every event carries `{ name, version?, routePath? }`. Tag your spans with
`version` and a regression points at a specific release instead of a remote.

Two guarantees you do not implement yourself: a throwing adapter is
swallowed (telemetry must never break what it observes), and
`useTelemetry()` falls back to the console outside a provider, so a remote
rendered standalone still works.

Omit the provider entirely and events print to the console — useful for
watching the instrumentation work before wiring a vendor.

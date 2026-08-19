# Usage

Everything you need to run, extend, and ship this project. If you only read
one page, read this one.

- [Step by step: from clone to your own platform](#step-by-step-from-clone-to-your-own-platform)
- [Commands](#commands)
- [How the pieces fit](#how-the-pieces-fit)
- [What a remote needs from the orchestrator](#what-a-remote-needs-from-the-orchestrator)
- [Packages that are still shared](#packages-that-are-still-shared)
- [A worked example: a remote that uses the contract](#a-worked-example-a-remote-that-uses-the-contract)
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
import between the two remotes. The update travels through the bus the shell
owns and hands to both as a prop.

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

- **`check:shared-deps`** — React, ReactDOM, `react-router`, `telemetry`, and
  Tailwind must resolve to one version across every app. Two copies of React
  is a bug that surfaces nowhere near the version mismatch that caused it.
  Note how short that list is: nothing a remote needs from the shell is a
  shared module, so a remote in another repository negotiates none of this.
- **`check:boundaries`** — `src/exposed/` is an app's public surface;
  `src/internal/` is private, even across federation. Without enforcement,
  a remote's implementation detail quietly becomes another team's
  dependency.

---

## How the pieces fit

```
apps/shell        the orchestrator. Owns routing, the remote registry, origin
                  control, the session, and the cross-remote bus.
apps/dashboard    a remote. Exposes ./App over Module Federation.
apps/admin        a second remote. Proves the conventions generalise.
packages/*        the host's own building blocks, plus the props contract.
```

The arrow only points one way. The shell reaches remotes over the network,
by URL, and hands each one `basePath`, `session`, and `bus` as props. A
remote reaches back for nothing — which is what lets it live in another
repository, on another team's release schedule.

The two examples here happen to sit in this monorepo because they have to
live somewhere. Treat that as an accident of packaging, not a requirement:
they consume the shell exactly the way a remote three repositories away
would.

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

### Styling across independently built apps

Each app compiles its own Tailwind bundle, and a remote's stylesheet loads
**after** the host's. Tailwind utilities are global single-class selectors, so
whichever stylesheet comes last wins any tie — and a remote only emits the
utilities its own source uses.

That produces a failure worth knowing about before it finds you. If the host's
frame relies on a responsive variant the remote never emits, the remote's plain
`.flex-col` outranks the host's `@media ... .md\:flex-row`, and the host's
sidebar collapses to a stacked layout. Nothing throws, nothing logs, and every
test that only asserts "the nav is visible" still passes.

The fix here is `apps/shell/src/internal/chrome/frame.css`: the frame's
structural rules are **plain CSS, outside any `@layer`**. Unlayered CSS
outranks every layer, and Tailwind puts all of its output in layers — so the
frame is immune to whatever any remote ships, including a remote redeployed
next year by a team you have never met.

Appearance is different: a remote emitting the same `border-b` declares the
same thing, so utilities are fine there. Only structure the host depends on
needs to leave the utility layer.

`apps/shell/e2e/chrome-isolation.spec.ts` asserts the resulting geometry rather
than visibility, because geometry is the only thing that catches this.

If you give a remote a stylesheet of its own, the same reasoning applies in
reverse: anything it must not lose to the host's bundle belongs outside a layer
too.

### Two failure surfaces, kept apart

A remote can fail to **load** (network, refused origin, timeout, bad
export) or fail while **rendering** (it loaded, then threw). They have
different causes and different owners, so the shell handles and reports
them separately — `useRemote` for the first, `RemoteBoundary` for the
second. Either way the failure is contained: the rest of the shell stays
navigable.

---

## What a remote needs from the orchestrator

**Nothing it has to install.**

That is the whole design. In a large organisation the micro-frontends live in
other repositories, are built by other teams, and are deployed to other URLs.
They cannot `pnpm install` anything from here — this project publishes no
packages, and even a private registry would couple every team's release to
this one's.

So everything crossing the boundary is a **prop**. The shell mounts a remote's
exposed root and hands it three things:

```ts
interface RemoteAppProps {
  /** The route the orchestrator mounted this remote at. */
  readonly basePath: string;
  /** Who is signed in, already resolved by the orchestrator. */
  readonly session: RemoteSession;
  /** Messaging between remotes, owned by the orchestrator. */
  readonly bus: RemoteBus;
}

interface RemoteSession {
  /** Non-null exactly when `isAuthenticated` is true. */
  readonly user: User | null;
  readonly isAuthenticated: boolean;
}

interface RemoteBus {
  publish(topic: string, payload: unknown): void;
  /** Returns an unsubscribe function. */
  subscribe(topic: string, handler: (payload: unknown) => void): () => void;
}
```

The definitive copy is `packages/shared-types/src/component.ts`. A remote in
another repository copies those few lines into its own source — a type cannot
cross a Module Federation boundary anyway, because the host and the remote are
separate builds. What actually holds them together is the shape of the props
at runtime, and that is deliberately small enough to keep in sync by hand.

### Why `payload` is `unknown`

The publisher is a different build, possibly a different framework, released
on a different day. A shared payload type would be a guarantee no compiler can
enforce across that boundary. **Validate what you receive**, in the subscriber:

```ts
bus.subscribe('user:role-changed', (payload) => {
  if (typeof payload !== 'object' || payload === null) return;
  const event = payload as { userId?: unknown; newRole?: unknown };
  if (typeof event.userId !== 'string' || typeof event.newRole !== 'string') return;
  // …now it is safe to use.
});
```

`apps/dashboard/src/exposed/App.tsx` does exactly this, and its tests fire
malformed payloads at it on purpose.

### What the orchestrator keeps to itself

These live in `apps/shell/src/internal/` and are **not** part of any remote's
contract:

| Module | Its job |
|---|---|
| `session/` | Resolves who is signed in and exposes it via `useSession()`. Backed by an in-memory stub — see [Connecting real authentication](#connecting-real-authentication). |
| `bus/` | Owns the pub/sub instance and relays it across browser tabs over `BroadcastChannel`, validating messages at the receiving edge. |
| `chrome/` | The frame: header, nav, footer, and the shell's own design tokens. |
| `routes/` | Reads the registry, mounts each remote, and passes the props above. |

A remote never imports any of it. It receives the *results*.

---

## Packages that are still shared

Only four remain, and none of them is something a remote installs:

### `@enterprise-mfe/shared-types`

`User`, `Role`, `Permission`, `ROLE_PERMISSIONS`, `permissionsForRole`, and the
contract above. Used by the shell and by the example remotes because they
happen to live in this workspace. A remote outside it declares the same shapes
itself. Deliberately small — resist making it "types for everything".

### `@enterprise-mfe/federation-utils`

`useRemote()` and `RemoteBoundary` — remote loading and error containment. A
**host** concern; a remote never loads itself. Bundler- and
federation-agnostic on purpose: it takes a loader function, so it is testable
with a plain promise.

### `@enterprise-mfe/telemetry`

The observability contract, with a console sink by default. Installed by the
shell, reporting on remotes: load timings and failures. See
[Connecting telemetry](#connecting-telemetry).

### `@enterprise-mfe/config-typescript` and `@enterprise-mfe/config-biome`

Shared tool configuration for this workspace. Not runtime code.

### What is deliberately *not* here

There is no `ui` package, and no `auth` or `event-bus` package. Every large
organisation already has a design system, and would not adopt one from a
boilerplate; session and messaging are the orchestrator's job, delivered as
props. Removing them is what makes the "install nothing" claim true rather
than aspirational.

Matching the orchestrator's look across teams is then a matter of agreeing on
**token values** — `--color-brand-600`, `--radius-control` — which a remote
copies into its own stylesheet. That is a contract a team in another repo can
actually honour.

---

## A worked example: a remote that uses the contract

A billing panel that lists invoices, gates an action behind a permission, and
tells the rest of the platform when an invoice is paid — using only props.

Note what is absent: no import from this project, no provider to wrap it in,
no design-system dependency. This file compiles in a repository that has never
heard of the orchestrator.

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { RemoteAppProps } from './contract'; // your own copy of the contract

interface Invoice {
  id: string;
  customer: string;
  amountCents: number;
  paid: boolean;
}

/** The subscriber's own validator: the publisher is a separate build. */
function readInvoicePaid(payload: unknown): { amountCents: number } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const candidate = payload as { invoiceId?: unknown; amountCents?: unknown };
  if (typeof candidate.invoiceId !== 'string' || candidate.invoiceId.length === 0) return null;
  if (!Number.isInteger(candidate.amountCents)) return null;
  return { amountCents: candidate.amountCents as number };
}

export function BillingPanel({ basePath, session, bus }: RemoteAppProps) {
  const { user, isAuthenticated } = session;
  const canSettle = user?.permissions.includes('users:write') ?? false;

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'inv-1', customer: 'Acme', amountCents: 1200, paid: false },
  ]);
  const [settledCents, setSettledCents] = useState(0);

  // Reacts to the event regardless of who published it — another remote,
  // or this same one open in another tab.
  useEffect(
    () =>
      bus.subscribe('invoice:paid', (payload) => {
        const event = readInvoicePaid(payload);
        if (!event) return;
        setSettledCents((total) => total + event.amountCents);
      }),
    [bus],
  );

  function settle(invoice: Invoice) {
    setInvoices((all) => all.map((i) => (i.id === invoice.id ? { ...i, paid: true } : i)));
    // Published only after the change actually succeeded — never optimistically.
    bus.publish('invoice:paid', { invoiceId: invoice.id, amountCents: invoice.amountCents });
  }

  const total = useMemo(() => (settledCents / 100).toFixed(2), [settledCents]);

  return (
    <section data-base-path={basePath}>
      <p>{isAuthenticated && user ? `Signed in as ${user.name}` : 'Not signed in'}</p>
      <p>Settled today: ${total}</p>
      <table>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.customer}</td>
              <td>${(invoice.amountCents / 100).toFixed(2)}</td>
              <td>
                {invoice.paid ? (
                  'Paid'
                ) : (
                  <button type="button" disabled={!canSettle} onClick={() => settle(invoice)}>
                    Mark paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default BillingPanel;
```

Three details are load-bearing:

1. **`session` is read, never fetched.** The orchestrator already resolved it.
   A remote deciding for itself who is signed in is how two parts of one page
   end up disagreeing.
2. **`publish` happens after the change succeeded**, not optimistically. Other
   remotes treat the event as a fact.
3. **`bus.subscribe` returns its own unsubscribe**, so returning it straight
   from `useEffect` is the whole cleanup.

### The same pattern, in working code

This example is deliberately not in the repository — it would be a third
example to delete. The identical pattern is already running:

| Step | Real file |
|---|---|
| Publishes after a successful change | `apps/admin/src/internal/users/use-user-list.ts` |
| Subscribes, validates, updates a KPI | `apps/dashboard/src/exposed/App.tsx` |
| Permission-gated action | `apps/admin/src/internal/permissions/use-can-write-users.ts` |
| Session arriving as a prop | `apps/admin/src/exposed/App.tsx` |
| Standing in for the host in dev | `apps/dashboard/src/internal/standalone-host.ts` |

Open `/admin` and `/dashboard` in two tabs and change a role: that is this
example, already wired — and the event crosses a `BroadcastChannel` relay the
shell owns, not a package both apps import.

---

## Adding a remote

```bash
pnpm gen remote
```

You are asked for a name, a route path, a label, and a mode:

- **Monorepo** — writes `apps/<name>`, registers the remote in
  `remotes.dev.json`, and assigns the next free port. It imports
  `RemoteAppProps` from `@enterprise-mfe/shared-types`, since it lives in
  this workspace.
- **Standalone** — writes an independent project outside this repository.
  It depends on **no package from here**: it carries its own copy of the
  contract in `src/internal/contract.ts`, so `pnpm install` works from the
  public registry with no token and no private registry. Move the directory
  into its own repository and it keeps building.

Whatever mode you pick, the generated app follows the same rule as every
other: only `src/exposed/` may be imported from outside it. Both modes render
standalone too — with no host present, `src/internal/standalone-host.ts`
supplies the props a shell would.

Staging and production registries are **not** touched — pointing a remote
at a real URL is a deployment decision, not a scaffolding one.

### Adding a remote you host elsewhere

Most of the time the remote already exists, built by another team in another
repository, and there is nothing to generate. Composing it takes two edits to
the shell:

1. Add its entry to `apps/shell/remotes.<env>.json`:

   ```jsonc
   {
     "name": "payments",
     "entry": "https://payments.acme.example/mf-manifest.json",
     "routePath": "/payments",
     "label": "Payments"
   }
   ```

2. Add its origin to that file's `allowedOrigins`. The shell refuses to load
   a remote from an origin not listed there, and the same list generates the
   Content-Security-Policy — so a missing entry fails closed, twice.

The remote itself needs to do exactly three things: expose `./App` over
Module Federation, accept `RemoteAppProps`, and serve its manifest with
`Access-Control-Allow-Origin` set for the shell's origin. It can be built by
anyone, with any toolchain, on any release cadence.

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

### Same-origin remotes: use a relative entry

If a remote is served from the same origin as the shell — which is what the
single-project deployments above do — write its entry **root-relative** and
leave `allowedOrigins` empty:

```jsonc
{
  "environment": "production",
  "allowedOrigins": [],
  "remotes": [
    { "name": "dashboard", "entry": "/remotes/dashboard/mf-manifest.json", "routePath": "/dashboard" }
  ]
}
```

This is what this repository's own production registry does, and it is the
better default whenever it applies:

- **It cannot drift.** An absolute URL has to be kept in step with wherever
  the shell actually got deployed. When the two disagree — a host that
  truncates the project name, a domain change — the shell fetches from
  somewhere that does not resolve, and the failure looks like a broken
  remote rather than a wrong string.
- **Preview deployments work.** Every Vercel/Netlify preview has a URL
  nobody wrote down. An absolute entry sends those previews to production's
  remotes; a relative one loads the preview's own.
- **The CSP gets tighter.** With nothing on the allow-list the generated
  policy is just `script-src 'self'`.

Same-origin is allowed without an allow-list entry on purpose: it is the
origin already executing the shell's own code, so requiring it to be listed
would be a check that cannot meaningfully fail.

Two things it does **not** cover, deliberately: an entry must be
*root*-relative (`/remotes/…`), because a bare `remotes/…` resolves against
whatever route the person is on; and `//host/path` is protocol-relative,
which names another origin while looking relative, so it is judged as the
third-party URL it really is.

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

Everything above puts the shell and its remotes on one origin, because that
is the simplest thing that works and it keeps this repository's own demo to
a single deploy.

**This section is the one most adopters actually want.** If your
micro-frontends are built by other teams in other repositories, they are not
in this repo's `pnpm build` at all — the shell only ever learns their URLs.

Deploy each remote's own `dist/` wherever that team deploys, and point the
registry at real, separate origins:

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

Two things a cross-origin remote must get right, both of which same-origin
hosting hides:

- **CORS.** The browser fetches the manifest and `remoteEntry.js` from the
  shell's origin, so the remote's host must send
  `Access-Control-Allow-Origin` for it. Rspack's dev server already does;
  your production host is a separate setting.
- **`allowedOrigins`.** The shell refuses an origin that is not listed, and
  the same list generates the CSP. A remote that is deployed, reachable, and
  simply not listed fails closed — which is the intended behaviour, and the
  first thing to check when a new remote does not appear.

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

The shell ships a stub session — an in-memory fake user behind a stable
contract. That is deliberate: every organisation brings its own identity
provider, and a login flow baked into a boilerplate is one you would have to
remove.

Authentication is the **orchestrator's** job here, which is why it lives in
`apps/shell/src/internal/session/` rather than in a package. Remotes never
implement it; they receive the resolved `session` as a prop, so connecting a
real provider is a change in exactly one application.

To connect one, replace the three stub calls in
`apps/shell/src/internal/session/context.tsx` (`stubSignIn`, `stubSignOut`,
`stubRestore`) with your OIDC client. Any OIDC-compliant provider — Okta,
Entra ID, Auth0, Keycloak, Google Workspace — fits the same three
variables:

```bash
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_REDIRECT_URI=http://localhost:3000/callback
```

**Nothing else changes.** `useSession()`, `<ProtectedRoute>`, and every remote
keep working, because neither contract changes — not the shell's internal one,
and not the `session` prop remotes see.

Keep tokens out of what crosses the boundary: a remote needs `user` and
`isAuthenticated`, never credentials. `RemoteSession` is shaped that way on
purpose — widening it to carry an access token would hand every remote,
including ones built by other teams, something it has no business holding.

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

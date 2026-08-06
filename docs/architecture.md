# Architecture

This is our convention layered on top of Module Federation, not a requirement
of the technology — see `CLAUDE.md` and `.specify/memory/constitution.md`
Principle IV. Module Federation itself defines Host, Remote, Manifest, and
shared-deps; everything else here (the `exposed/`/`internal/` split, the
registry format, the folder layout) is this project's own design.

## The shell

`apps/shell` is the host: it reads a per-environment remote registry and
composes federated regions into one application. It exposes nothing of its
own over federation — its `ModuleFederationPlugin` config has an empty
`exposes` map, deliberately, because a host composes, it doesn't get composed
into. Structure and rationale: [apps/shell/README.md](../apps/shell/README.md).

## The remote registry

The shell's only configuration input, and the mechanism behind "switching
environment is switching a file, never recompiling". Full format, validation
rules, and how to add a remote: see
[specs/002-shell-host/contracts/registry-contract.md](../specs/002-shell-host/contracts/registry-contract.md)
— summarized here.

Three source files live in `apps/shell/src/internal/federation/`:
`remotes.dev.json`, `remotes.staging.json`, `remotes.production.json`. The
build copies exactly one — selected by `FEDERATION_ENV`, defaulting to `dev`
— to `remotes.json` beside the built assets. **One build serves all three
environments**: the deployed registry file *is* the environment, not a value
baked into the JavaScript bundle. See
[docs/decisions/0012-runtime-registry-fetch.md](decisions/0012-runtime-registry-fetch.md)
for why this was chosen over build-time injection.

At startup, the shell fetches `/remotes.json`, validates it (malformed,
duplicate remote names, and route collisions all fail loudly, naming the file
and the environment), then checks every registered remote's origin against
the registry's own `allowedOrigins` list before any remote code is fetched.
An origin that isn't allow-listed, or that uses an insecure transport outside
local development, is refused — refusal is contained exactly like a load
failure, so one bad entry never takes the rest of the application down with
it.

## Remote loading

`packages/federation-utils` provides `useRemote()` and `RemoteBoundary`: a
load-state machine (idle → loading → loaded | failed) plus an error boundary
for a throw during the remote's own render. Both are driven by a plain loader
function, not `React.lazy`/Suspense or a direct Module Federation dependency
— see [research D5](../specs/002-shell-host/research.md) for why. The
federation-specific loader that bridges this to the real MF runtime
(`loadRemote()` from `@module-federation/enhanced/runtime`) lives in
`apps/shell/src/internal/federation/loader.ts`, the only file in the repo
that imports it directly.

A registered, allowed remote is turned into an actual route via react-router
8's `patchRoutesOnNavigation` (`apps/shell/src/exposed/App.tsx`) — chosen
over the simpler imperative `router.patchRoutes` because a *hard* navigation
straight to a remote's path needs the route to exist before the router
decides there's no match, not after. This mechanism (built in
`003-dashboard-remote`, against `apps/dashboard`) is a one-time addition to
the shell; registering a further remote afterward touches only its registry
entry, exactly as the registry contract promises.

## Remotes

`apps/dashboard` (sprint 4) is the first real remote, proving the shell's
composition mechanism end to end. `apps/admin` (sprint 5) is the second — and
proved the mechanism actually generalizes: registering it required editing
only the registry file, no further change to
`apps/shell/src/exposed/App.tsx`'s route-patching. The scaffolding generator
(ADR-0008) is extracted from what the two turn out to share, now that both
exist.

**A remote's `src/exposed/` entry must import its own stylesheet directly —
not only its standalone `bootstrap.tsx`.** When the shell loads a remote via
federation, it fetches only the chunks reachable from the exposed module's
own dependency graph; a standalone entry's chunk is never requested. A remote
whose Tailwind classes are wired up only through `bootstrap.tsx` renders with
no CSS at all once composed — found while building `apps/dashboard`'s
activity chart, which silently collapsed to a 0×0 container. `apps/admin`
applied this pattern from its first commit rather than rediscovering it. See
`apps/dashboard/src/exposed/App.tsx` for the pattern every future remote
should copy.

## Cross-remote communication

`packages/event-bus` is how one remote reacts to something that happened in
another without either importing the other — `apps/admin` publishes a role
change, `apps/dashboard` subscribes and updates its "active users" KPI live.
Same-tab delivery is a plain in-memory registry; cross-tab delivery (two
separate browser tabs, both composed by the same shell) goes through a
same-origin `BroadcastChannel` relay, since separate tabs share no
JavaScript memory to deliver into directly. See
[packages/event-bus/README.md](../packages/event-bus/README.md) and
[specs/004-admin-remote/research.md D2](../specs/004-admin-remote/research.md)
for the full design, including why an in-memory-only bus was rejected mid-design
— it couldn't satisfy the spec's own cross-tab scenario.

The event set is a closed, typed union
(`packages/event-bus/src/event-map.ts`) — a topic not listed there fails to
type-check at both `publish()` and `subscribe()`, the same discipline
`Role` and `Permission` already use in `packages/shared-types`.

## Boundary enforcement

`dependency-cruiser` (`pnpm check:boundaries`) enforces two structural rules
across the whole workspace:

1. No app may import another app via a relative path — federation or a
   shared package are the only legal ways to cross that boundary.
2. Nothing outside an app's own `src/internal/` may reach into it — only
   `src/exposed/` is a valid import target from outside that app. Code
   anywhere *inside* the same app (its own `exposed/`, `tests/`,
   `bootstrap.tsx`, `rspack.config.ts`) may still reach its own `internal/`
   freely; only a *different* app or a package/script may not.

See `.dependency-cruiser.js` for the exact rules and their rationale.

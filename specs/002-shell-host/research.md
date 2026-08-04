# Phase 0 Research: Shell Host

**Feature**: `002-shell-host` | **Date**: 2026-08-03

Versions below were read from the registry on 2026-08-03, not recalled.

---

## D1 — Rspack with `@module-federation/enhanced` as the host

**Decision**: `@rspack/core` and `@rspack/cli` `2.1.7`, with
`ModuleFederationPlugin` from `@module-federation/enhanced/rspack` `2.8.1`
configured as a host that exposes nothing.

**Rationale**: ADR-0002 fixed the bundler and ADR-0003 the federation layer.
`@module-federation/enhanced` on Rspack is the combination ADR-0002 recorded as
the fastest path to complete MF2 support, and MF2's Federation Runtime is what
makes D3 possible at all.

**Consequences**: `react`, `react-dom`, `@enterprise-mfe/auth`, and
`react-router` are declared as MF `shared` singletons, so a remote loading later
attaches to the host's instances rather than bringing its own.

---

## D2 — Tailwind v4 through PostCSS, scanning the design system by path

**Decision**: `tailwindcss` and `@tailwindcss/postcss` `4.3.3`, wired through
`postcss-loader` `8.2.1` in the Rspack CSS pipeline. The shell's stylesheet
imports the design system's tokens and declares an explicit `@source` pointing at
the design system's source directory.

**Rationale**: This is the open question in issue #4 — `tokens.css` has never been
compiled by anything. Tailwind v4 only generates the utility classes it can find,
and the classes live inside `packages/ui/src`, not in the shell. Without an
explicit `@source`, the host builds and every component renders unstyled: a
silent failure, exactly the one the spec's last edge case says must surface at
build time.

**The symlink question**: under the hoisted layout (ADR-0011),
`node_modules/@enterprise-mfe/ui` is a symlink to `packages/ui`. Tailwind's
scanner must follow it. **Resolving this is the first task of the sprint, not an
assumption** — the `@source` path is written against the real workspace path
(`../../packages/ui/src`) rather than the `node_modules` path, which sidesteps
symlink traversal entirely in the monorepo. Standalone mode will need the
`node_modules` form, and that is where the symlink behavior actually has to be
proved.

**Fallback**: if v4 cannot be made to work under Rspack, the fallback is a v3
shared preset, contained to `tokens.css` and the shell's CSS entry — components
only ever reference utility class names. Per Principle VII that fallback requires
a **new ADR**; ADR-0002 decided the bundler, not the Tailwind major, so nothing
is superseded.

---

## D3 — The registry is fetched at runtime, not compiled in

**Decision**: all three registry files live in the shell's source. The build
copies the one matching the selected environment to `remotes.json` beside the
built assets. At startup the shell fetches `/remotes.json`, validates it, and
registers the remotes through MF2's Federation Runtime `registerRemotes()`.

**Rationale**: the architectural claim is that switching environment is switching
a file, not recompiling. Compiling remote locations in — the obvious approach,
injecting them at build time — makes that claim false: staging and production
would be different builds of identical source, and the artifact you tested is not
the artifact you ship. Fetching at runtime means **one build, three deployments**,
and `SC-002` ("zero host source files edited") becomes trivially true rather than
technically true.

**Consequences**: there is a network round trip before any remote can load, so
the host must render its own frame without waiting for it — which the spec
already requires (`FR-001`, and US1 scenario 2: an empty registry is valid).
A malformed or missing registry is a startup-time failure with a named file
(`FR-009`), not a silent fallback.

**Alternatives considered**: build-time injection via `DefinePlugin` (rejected:
breaks the one-build claim). A registry served from an API (rejected: adds a
backend this project deliberately does not have).

---

## D4 — Origin allow-list travels with the registry

**Decision**: the registry file carries both `allowedOrigins` and `remotes`.
Validation runs after fetch and before `registerRemotes()`: every remote's origin
must appear in `allowedOrigins`, and the transport must be secure unless the
origin is a loopback address.

**Rationale**: `FR-019` requires that reviewing what the host may execute is one
place rather than a search. It also puts the check where it is enforceable —
before any remote code is fetched, let alone evaluated. Validating after
registration would be theatre.

**Consequences**: a refused remote is dropped from the registry with a reported
reason, and the rest of the application is unaffected — a refusal is contained
exactly like a load failure (`FR-018`).

**Alternatives considered**: a Content-Security-Policy header alone (rejected as
the *only* control: it is a deployment concern this repository cannot enforce,
and it gives no in-application diagnostic). CSP remains the right complement and
is documented as a deployment step, not implemented here.

---

## D5 — `federation-utils` takes a loader function and knows nothing about federation

**Decision**: `useRemote()` accepts a function returning a promise of a module.
The package depends on React only — not on Rspack, not on the MF runtime. The
shell supplies the federation-specific loader.

**Rationale**: this is what makes US3 testable in this sprint. No remote exists,
so every failure mode — unreachable, invalid, never-resolving, refused — has to
be simulated, and a package that takes a loader function can be handed a
rejecting promise in a unit test. A package that imported the MF runtime could
only be tested with a real bundler and a real remote, which is next sprint.

**Consequences**: the package stays useful outside this project, and the
federation-specific part stays in the shell where it belongs. The error boundary
inside it is a class component, because React has no hook equivalent.

---

## D6 — `react-router` in the shell, shared as a singleton

**Decision**: `react-router` `8.3.0`, declared by the shell only — never by a
package — and listed as an MF `shared` singleton alongside React.

**Rationale**: the host's whole job is mapping a URL to a federated region.
Hand-rolling history handling, nested routes, and navigation blocking is the
wheel Principle IX exists to avoid re-cutting; the principle requires
justification, not abstinence. Keeping it in the app rather than a package means
an adopter who prefers a different router replaces it in one place.

**Consequences**: router context crosses the federation boundary once remotes
exist, so two copies would produce two histories — the same class of bug as two
Reacts. It is therefore added to `SINGLETONS` in `scripts/check-shared-deps.ts`
in this sprint, which is exactly what the constitution requires of anything that
holds state and is consumed by more than one app (Principle III).

**Alternatives considered**: a hand-rolled History API router (~40 lines, zero
dependencies — rejected: the remotes in sprints 4-5 need real routing, and
building it twice is worse than depending on it once). Hash routing (rejected:
worse URLs for no benefit here).

**TanStack Router, reconsidered mid-sprint.** Investigated on request before
implementation started, because it is a real contender on developer experience —
fully type-safe routes, first-class search-param validation, and loaders. The
disqualifying issue is architectural, not a preference: D3 requires remote routes
to be *discovered at runtime* from `remotes.json`, fetched after the host has
already started, and that is not an edge case here — it is the entire mechanism
sprint 2's environment-as-a-file promise depends on. TanStack Router's own
maintainers confirm the file-based (and code-based) route tree is fixed before
the router is created; their documented workaround for "genuinely dynamic"
routes is a splat segment (`/remote/$`) paired with a hand-written component
registry — which reimplements, by hand, the exact mechanism `react-router`
ships as a stable, named API: `patchRoutesOnNavigation` (confirmed stable, no
`unstable_` prefix, in the `8.3.0` already selected). A real-world report of
TanStack Router under Module Federation was also found; its difficulty was
sharing the router itself as a federation singleton, not routing mechanics —
an added cost with no offsetting benefit here, since TanStack's type-safety
advantage cannot reach remote routes anyway: they arrive as untyped JSON at
runtime, from a registry no code generator has ever seen. **Decision
reaffirmed: `react-router`.** Sources: [TanStack Router discussion #7117](https://github.com/TanStack/router/discussions/7117),
[TanStack Router code-based routing docs](https://tanstack.com/router/latest/docs/routing/code-based-routing),
[react-router `patchRoutesOnNavigation` / lazy route discovery](https://reactrouter.com/api/data-routers/createBrowserRouter),
[Module Federation + TanStack Router discussion #4309](https://github.com/module-federation/module-federation-examples/discussions/4309).

---

## D7 — Playwright and end-to-end tests are deferred to sprint 4

**Decision**: no Playwright in this sprint. Every requirement is verified with
Vitest against simulated remotes.

**Rationale**: an end-to-end test earns its cost by exercising what unit tests
cannot — the shell composing a real remote across a real network boundary. With
zero remotes, an e2e run would assert only what the unit tests already assert,
while adding browser downloads to CI. The blueprint places e2e with the remotes
for this reason.

**Consequences**: `pnpm e2e` remains an unimplemented script for one more sprint.
The spec is explicit that US3 and US4 are proved against simulated remotes here
(Assumptions), so this defers no promised coverage.

---

## D8 — `exposed/` and `internal/` in a host that exposes nothing

**Decision**: `apps/shell/src` splits into `exposed/` and `internal/` exactly as
a remote does. `exposed/App.tsx` is what the bootstrap mounts; everything else —
federation wiring, routes, chrome — is `internal/`.

**Rationale**: Principle I is unconditional and says so. It also has a practical
payoff: the shell is the structural template the first remote is copied from next
sprint, and a host with a different shape teaches the wrong pattern on day one.

**Consequences**: the host's `exposes` map is empty today. That is worth a comment
in the federation config, because an empty map in a file whose purpose is
exposing things reads like an oversight otherwise.

---

## D9 — Route ownership stays with the host

**Decision**: the host declares which route mounts which remote. A remote does
not register routes into the host.

**Rationale**: carried from the spec's Assumptions, restated here because it is
the contract sprint 4 is built against. The alternative requires the host to
execute remote code to discover its routes — before the origin check in D4 has
decided whether that code may run at all. That inverts the security boundary.

**Consequences**: adding a remote means one registry entry plus one route
mapping. Both live outside the host's component code, so `SC-003` still holds.

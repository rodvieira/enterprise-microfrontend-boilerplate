# Phase 0 Research: Dashboard Remote

**Feature**: `003-dashboard-remote` | **Date**: 2026-08-06

Versions below were read from the registry on 2026-08-06, not recalled.

---

## D1 — Rspack + `@module-federation/enhanced`, configured as a remote, mirroring the shell's config shape

**Decision**: `@rspack/core` and `@rspack/cli` pinned to shell's exact `2.1.7`
(registry currently offers `2.1.8`; not bumped here — see Consequences),
`@module-federation/enhanced` pinned to shell's exact `2.8.1`. Federation
config is inline in `rspack.config.ts`, the same place the shell keeps it —
there is no separate `federation.config.ts` anywhere in this repository today,
so introducing one for the first remote would be a second convention where one
already exists. `ModuleFederationPlugin` is configured with `name: 'dashboard'`
and `exposes: { './App': './src/exposed/App.tsx' }`.

**Rationale**: ADR-0002 and ADR-0003 fixed bundler and federation layer
project-wide; this is the same combination the shell already proved, applied
in the opposite role (remote instead of host). `entry` in the registry
contract's example is already `http://localhost:3001/mf-manifest.json` with
`"name": "dashboard"` — the manifest-based entry format `@module-federation/enhanced`
produces by default, requiring no extra plugin configuration to satisfy `FR-004`.

**Consequences**: `@rspack/core`, `@rspack/cli`, and `@module-federation/enhanced`
are pinned to the same patch versions the shell currently uses, not the latest
available. Bumping shared build tooling across both apps is a separate, later
decision — doing it silently as a side effect of adding the first remote would
be an unjustified, unreviewed version change. `react`, `react-dom`, and
`react-router` — the actual `MF shared` **singletons** — are the one place
version match is not optional: they're pinned to shell's exact `19.2.8` /
`19.2.8` / `8.3.0`, satisfying `FR-015` by construction rather than by a
follow-up check.

---

## D2 — Port `3001`, already reserved

**Decision**: The dashboard dev server runs on port `3001`.

**Rationale**: `apps/shell/src/internal/federation/remotes.dev.json`'s
`allowedOrigins` already lists `http://localhost:3001` and `:3002`, and the
registry contract's own worked example uses `3001` for a remote named
`"dashboard"`. Both were written in sprint 3, before this remote existed,
anticipating exactly this. Using `3002` or any other port would contradict a
decision already on record for no reason.

**Consequences**: `apps/admin` (sprint 5) takes `3002`, following the same
document.

---

## D3 — Recharts for the activity chart

**Decision**: `recharts` (current: `3.10.1`), a peer-dependency-only chart
library that renders to inline SVG.

**Rationale**: The spec's proof point (`FR-010`, `US3`) is isolation — the
chart must not leak style or script into the shell or any other region.
`recharts` renders every chart as SVG markup returned from ordinary React
components; it injects no global stylesheet and registers no canvas or global
mutable state, which is what makes "no leakage" something this sprint can
actually demonstrate rather than assert. It has first-class React 19 support
(`peerDependencies: react/react-dom ^16–^19`) and needs no separate CSS import.

**Alternatives considered**:
- **Chart.js + `react-chartjs-2`**: canvas-based, registers chart types on a
  global `Chart` registry shared process-wide — a worse story for the
  isolation proof point this sprint exists to make, and canvas content is
  harder to assert against in a component test than SVG DOM nodes.
- **`visx`**: lower-level (primitives, not a chart component), which would
  mean building the chart's interaction and axis logic by hand — more surface
  area than a single activity-over-time chart justifies.

**Consequences**: One new dependency, `recharts`, justified in the pull
request per Principle IX. No new dependency for icons or trend indicators —
the KPI cards' trend arrow is plain markup, not an icon library.

---

## D4 — A `Card` component joins the design system

**Decision**: `packages/ui` gains one new component, `Card`, used by the KPI
cards.

**Rationale**: `FR-002` requires the dashboard to use the shared design system
for any element an equivalent already exists for. No card-shaped primitive
exists among the seven components sprint 2 shipped (`Button`, `Input`,
`Modal`, `Table`, `Toast`, `Layout`, `Nav`) — KPI cards are the first place
this project needs one. Built in `packages/ui` rather than inside
`apps/dashboard/src/internal`, because a labeled-value-with-trend surface is
exactly the kind of primitive `apps/admin` (sprint 5) is likely to reuse, and
the whole point of the shared design system is not re-deriving it per remote.

**Alternatives considered**: building it as a dashboard-internal component.
Rejected — nothing about a card layout is dashboard-specific, and the
constitution's own rationale for the design system package is to avoid this
exact kind of duplication.

**Consequences**: Commit scope `ui` for this piece, `dashboard` for the
remote's own code — two commits, not one, per Principle VIII's one-scope-per-commit
convention already followed in sprints 2 and 3.

---

## D5 — Dashboard data is a self-contained async fixture, not a real fetch

**Decision**: `apps/dashboard/src/internal/data/fetch-overview.ts` exports one
async function returning KPI metrics, chart points, and feed items, backed by
an in-module fixture and an artificial delay — no network call, no backend.

**Rationale**: The constitution places Backend-For-Frontend explicitly out of
scope, and no backend exists anywhere in this project. `FR-007`'s requirement
— "fetched asynchronously... independent of the shell" — is about proving the
*mechanism* (a remote managing its own async lifecycle, with real loading and
error states) works in isolation, not about proving a particular data source.
This mirrors how sprint 3 proved remote-loading failure modes against
simulated remotes before a real one existed (research D5 in `002-shell-host`).

**Consequences**: The fixture module exposes a way to force the failure path
(an injectable flag or a rejecting variant), the same shape `federation-utils`
already uses for `RemoteLoader` in tests — so `FR-008`'s error state is
exercised by an automated test, not only observed by hand. Swapping the
fixture for a real data source later touches only this one file.

---

## D6 — Playwright becomes a real dependency this sprint

**Decision**: `@playwright/test` (current: `1.62.1`) is added as a real
project dependency for the first time, scoped to `apps/shell`. Specs live in
`apps/shell/e2e/`; `apps/shell/package.json` gains an `"e2e": "playwright test"`
script.

**Rationale**: `002-shell-host`'s research D7 deferred Playwright by name to
"sprint 4," reasoning that an end-to-end run against zero remotes would only
re-assert what unit tests already covered. That condition is gone: this
sprint is the first time a real remote crosses a real network boundary into
the shell, which is precisely what an end-to-end test earns its cost by
exercising. `turbo.json`'s `e2e` task already exists, targeting
`playwright-report/**` output — written in sprint 3 anticipating this, never
until now matched by any package declaring the script it depends on.

**Why `apps/shell` and not a new top-level `e2e/` package**: the test's
subject is the shell composing a remote, not the dashboard in isolation
(the dashboard's own behavior is covered by its Vitest suite, D5 and
elsewhere). Keeping it inside the app that owns composition avoids inventing
a fourth kind of workspace member (app / package / config / e2e-only) for one
directory.

**Consequences**: `pnpm e2e` stops being a no-op for the first time.
`apps/dashboard` must build and be served for the e2e run — `turbo.json`'s
existing `"e2e": { "dependsOn": ["build"] }` already expresses this, since
`build` already depends on `^build` (every workspace dependency).

---

## D7 — `apps/dashboard` joins the root Vitest project list explicitly

**Decision**: `vitest.config.mts`'s `projects` array gains one entry,
`browserProject('dashboard', './apps/dashboard')`, alongside `shell` and the
three `packages/*` browser projects already there.

**Rationale**: The root config's own comment states why projects are listed
explicitly rather than globbed — a glob-created project silently loses
`environment: 'jsdom'` and `setupFiles`, which would leave every dashboard
component test without a DOM. This is a file every future remote also edits;
it is not a violation of "registering a remote touches only registry files"
(`FR-017`), because that promise is scoped to the shell's own registry files,
not the workspace's test runner configuration.

**Consequences**: None beyond the one-line addition — no other file in
`vitest.config.mts` changes.

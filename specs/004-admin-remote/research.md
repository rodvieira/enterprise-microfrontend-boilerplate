# Phase 0 Research: Admin Remote

**Feature**: `004-admin-remote` | **Date**: 2026-08-06

---

## D1 — `apps/admin` mirrors `apps/dashboard`'s scaffold exactly, port `3002`

**Decision**: Same shape as `apps/dashboard` (`003-dashboard-remote` D1): Rspack
+ `@module-federation/enhanced`, `ModuleFederationPlugin` configured as a
remote with `name: 'admin'`, `exposes: { './App': './src/exposed/App.tsx' }`,
dev server port `3002`, `shared` singletons matching every other manifest.
`exposed/App.tsx` imports its own `styles.css` directly (`003-dashboard-remote`'s
CSS-federation finding) and has a default export (`003-dashboard-remote`'s
`createFederationLoader` finding) from the start — both are now documented
project conventions (`docs/architecture.md` "Remotes" section), not
rediscovered.

**Rationale**: `remotes.dev.json`'s `allowedOrigins` has listed
`http://localhost:3002` since sprint 3, anticipating exactly this. Nothing
about a second remote's scaffold should differ from the first's — divergence
here would itself be a smell.

**Consequences**: `pnpm dev` now starts three dev servers (shell, dashboard,
admin) when all three are registered. No new build-tooling dependency —
every package `apps/admin/package.json` needs is already in the project.

---

## D2 — `packages/event-bus`: a plain typed pub/sub, relayed across tabs via `BroadcastChannel`

**Decision**: Module-scope `publish`/`subscribe` functions over a typed event
map, plus a `useEventSubscription` hook for convenience inside components.
No `EventBusProvider` — unlike `packages/auth`, there is no per-app-tree
state to establish; the registry of subscribers is process-wide module
state, which is exactly why it must be an MF singleton (`FR-012`,
constitution Principle III already names it).

`publish` delivers to same-tab subscribers directly (a plain in-memory
`Map<topic, Set<handler>>`) **and** posts to a same-origin
[`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel),
so a subscriber in a *different* browser tab or window — the scenario
`spec.md` User Story 4 actually describes — also receives it. `subscribe`
listens on both. This needed correcting mid-research: the first draft of
this decision was in-memory only, which cannot cross a tab boundary at all
(separate tabs are separate JS realms with no shared memory) — a real gap
between the spec's own wording and what an in-memory-only bus could ever
demonstrate, caught by checking the two against each other before writing
any code.

```ts
export interface EventMap {
  'user:role-changed': RoleChangedEvent;
}
export function publish<K extends keyof EventMap>(topic: K, payload: EventMap[K]): void;
export function subscribe<K extends keyof EventMap>(
  topic: K,
  handler: (payload: EventMap[K]) => void,
): () => void; // returns unsubscribe
export function useEventSubscription<K extends keyof EventMap>(
  topic: K,
  handler: (payload: EventMap[K]) => void,
): void;
```

**Rationale**: `packages/federation-utils`'s precedent (research D5 in
`002-shell-host`) already established this project's preference for plain
functions over a context/provider wrapper when there's no per-tree state to
carry. A `Map<topic, Set<handler>>` closed over at module scope is the
entire implementation — no dependency, matching Principle IX by not needing
one (a `mitt`/`nanoevents`-shaped library would be one more dependency for
~20 lines of code this project can own and keep test-simple).

**Alternatives considered**: a React Context-based bus (rejected — forces
every publisher and subscriber inside a `<Provider>` tree, which the shell
and two independent remotes don't share); in-memory only, no
`BroadcastChannel` (rejected — see above, it cannot satisfy the spec's own
scenario); a server/WebSocket relay (rejected — this project has no
backend by design, and `BroadcastChannel` needs none).

**Consequences**: `EventMap` is a closed, explicit union — a topic not
listed fails type-checking, the same discipline `Permission` and `Role`
already use in `shared-types`. Adding a second event later is a type
addition to `EventMap`, not an API change. `BroadcastChannel` is
same-origin only, which is exactly right here — both the shell's dev
server and its production deployment serve every remote's composed page
from one origin from the browser's point of view.

---

## D3 — The role-changed payload and the dashboard's reaction, kept deliberately simple

**Decision**:

```ts
export interface RoleChangedEvent {
  userId: string;
  newRole: Role; // from @enterprise-mfe/shared-types
}
```

On receipt, the dashboard's "active users" KPI increments by 1 against
whatever value its own fetch last resolved — it does not recompute from
admin's user list (the two remotes' fixture data are intentionally
unrelated; see `003-dashboard-remote` research D5) and does not refetch.

**Rationale**: `ADR-0010`'s proof point is that cross-remote pub/sub works
in practice, not a realistic business rule connecting "a role changed" to
"the active-user count." Modeling a believable causal relationship between
two independent fixture datasets would add real complexity for no
architectural payoff — the spec's own `FR-013` asks only for "enough
information for a subscriber to update a user-count-derived value," not a
specific business meaning.

**Consequences**: `FR-016`'s "no replay" requirement is satisfied for free —
an increment applied only while mounted has nothing to replay; a dashboard
that mounts later starts from its own fresh fetch, exactly as the edge case
requires.

---

## D4 — Permission gating: a local check, not a `ProtectedRoute` contract change

**Decision**: `apps/admin` checks `user.permissions.includes('users:write')`
itself (via `useAuth()`), rather than extending `packages/auth`'s
`ProtectedRoute` with a `requiredPermission` prop.

**Rationale**: `ProtectedRoute`'s existing contract
(`specs/001-shared-packages-foundation` era) is authentication-only —
signed in or not — and `ADR-0009`/constitution Principle VI describe
`packages/auth` as shipping "a stable contract." Extending that shared,
singleton contract mid-sprint for one consumer's need is a bigger, riskier
change than doing the one-line check locally where it's needed. If a second
remote later needs the same permission-gating pattern, extracting it into
`packages/auth` is the moment that decision earns its keep — the same
"wait for the second real case" discipline `ADR-0008` applies to the
generator, applied here to a much smaller extraction.

**Alternatives considered**: adding `requiredPermission` to
`ProtectedRoute`. Not rejected outright — flagged as the natural next step
*if* `apps/admin` turns out to need more than one permission-gated surface,
or a future remote needs the same pattern. Out of scope for this sprint.

**Consequences**: `packages/auth` is untouched by this sprint. The
permission check lives in `apps/admin/src/internal/` and is unit-tested
directly against a mocked `useAuth()` return value — see D5.

---

## D5 — Testing "permission denied" without a multi-identity stub

**Decision**: The denied path (`FR-008`, `SC-004`) is proven by a component
test that renders the admin surface with a mocked `useAuth()` hook returning
a user with only `viewer`-level permissions, not by signing in through the
real stub (which always returns `STUB_USER`, role `admin`, every
permission).

**Rationale**: Recorded in `spec.md` Assumptions already — the stub's fixed
identity is a deliberate constraint of `ADR-0009`, not a gap to work around
by giving the stub multiple identities (which would start to resemble
building real auth). Mocking `useAuth()` at the module boundary for one test
file is the narrower, correctly-scoped tool.

**Consequences**: `apps/admin/tests/` mocks `@enterprise-mfe/auth`'s
`useAuth` export directly for the denied-path test only; every other test
uses the real `AuthProvider` + stub, exactly like `apps/dashboard`'s
existing tests.

---

## D6 — Pagination/sort controls stay inside `apps/admin`, not extracted to `packages/ui`

**Decision**: Built in `apps/admin/src/internal/users/`, composed from the
existing `Table` and `Button` components — no new `packages/ui` component
this sprint.

**Rationale**: Unlike `Card` (`003-dashboard-remote` D4, extracted because
nothing about it was dashboard-specific), pagination/sort controls have
exactly one consumer right now. Extracting a shared `Pagination` primitive
before a second consumer exists risks guessing the wrong shape — the same
reasoning `ADR-0008` applies to the generator, at component scale.

**Alternatives considered**: adding `Table` pagination/sorting props
directly. Rejected for the same reason — `Table` stays a rendering
primitive; owning pagination state is a decision to make once a second
consumer's needs are known, not before.

**Consequences**: If a later remote needs the same pattern, extracting it
becomes a small, well-motivated `packages/ui` change — not blocked by
anything built here.

---

## D7 — `scripts/check-shared-deps.ts`'s stale comment, corrected

**Decision**: `@enterprise-mfe/event-bus` is uncommented and added to
`SINGLETONS` in this sprint. The comment guessing "sprint 6" is removed.

**Rationale**: `spec.md` Dependencies already flags this — the comment was
a guess made in sprint 3, before this sprint's actual scope existed to
check it against. `docs/blueprint.html` §15 and `ADR-0010`'s own proof
point are the authoritative sources, and both place event-bus here.

**Consequences**: None beyond the one-line change — `check-shared-deps.ts`
already handles an arbitrary singleton list; no logic changes.

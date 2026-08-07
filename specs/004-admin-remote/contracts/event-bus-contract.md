# Public Contract: `@enterprise-mfe/event-bus`

**Feature**: `004-admin-remote` | **Date**: 2026-08-06

Typed publish/subscribe for cross-remote communication without direct
coupling (`FR-012`) — the mechanism behind the admin → dashboard live-update
demo (`FR-013`–`FR-016`).

## Exports

```ts
export function publish<K extends keyof EventMap>(topic: K, payload: EventMap[K]): void;
export function subscribe<K extends keyof EventMap>(
  topic: K,
  handler: (payload: EventMap[K]) => void,
): () => void; // call the return value to unsubscribe
export function useEventSubscription<K extends keyof EventMap>(
  topic: K,
  handler: (payload: EventMap[K]) => void,
): void;
export type { EventMap, RoleChangedEvent };
```

## `publish` / `subscribe`

| Guarantee | Requirement |
|---|---|
| A topic not present in `EventMap` fails to type-check at both call sites | closed-union discipline, research D2 |
| Every currently-subscribed handler for a topic is called, in subscription order | ordinary pub/sub |
| A handler that throws does not prevent other handlers for the same event from running | one bad subscriber can't break another remote's reaction |
| `subscribe` returns a function that, when called, removes exactly that handler and no others | standard unsubscribe semantics |
| An event published with zero subscribers is not queued or replayed to a later subscriber | `FR-016` |
| The registry of subscribers is module-scope state, present exactly once at runtime | this is *why* the package is an MF singleton (Principle III) — two copies in the same tab would mean a publisher and subscriber never actually meet |
| A `publish` call also reaches subscribers in other same-origin tabs/windows, via `BroadcastChannel` | `FR-013`–`FR-014`, `spec.md` User Story 4 — research D2 |

## `useEventSubscription`

A thin React convenience wrapper: subscribes in a `useEffect` on mount,
unsubscribes on unmount or when `topic`/`handler` identity changes. Exists
so no consuming component hand-rolls the subscribe/cleanup pair — the same
motivation `packages/federation-utils` has for existing at all
(`002-shell-host` research D5).

```ts
useEventSubscription('user:role-changed', (event) => {
  // event: RoleChangedEvent
});
```

## What this contract deliberately does not do

- **No event history or replay.** A subscriber that mounts after an event
  was published never sees it — `FR-016`. This project has no requirement
  for eventual consistency across a remote that wasn't there; each remote's
  own fetch is its source of truth on (re)mount.
- **No request/response.** This is fire-and-forget pub/sub, not a way for
  one remote to ask another a question and wait for an answer — the
  live-update demo is the only shape this sprint needs, and a richer
  mechanism would be speculative until a second use case exists.
- **No cross-origin delivery.** Cross-*tab*/cross-*window* delivery on the
  same origin **is** supported, via `BroadcastChannel` (research D2) — that
  is what makes `spec.md` User Story 4's "different browser tab or window"
  scenario real rather than aspirational. What this contract does not do is
  reach a different origin; the shell composing every remote from one page
  means this was never needed.

# @enterprise-mfe/event-bus

Typed publish/subscribe for cross-remote communication without direct
coupling. It's the mechanism behind `004-admin-remote`'s headline proof:
`apps/admin` publishes a role change, `apps/dashboard` subscribes to it and
updates its "active users" KPI live — neither remote imports the other.

## Usage

```tsx
import { publish, useEventSubscription } from '@enterprise-mfe/event-bus';

// Publisher (apps/admin)
publish('user:role-changed', { userId, newRole });

// Subscriber (apps/dashboard)
useEventSubscription('user:role-changed', (event) => {
  // event: RoleChangedEvent
});
```

## Same-tab delivery plus a `BroadcastChannel` relay

Same-tab subscribers are called directly, from a plain
`Map<topic, Set<handler>>`. `publish` also posts to a same-origin
`BroadcastChannel`, so a subscriber in a *different browser tab or window*
receives it too — proven directly in `tests/bus.test.ts` by opening a second
channel instance with the same name and confirming it receives the message,
standing in for a genuinely separate tab.

This wasn't the first draft. An in-memory-only bus cannot cross a tab
boundary at all — separate tabs share no JavaScript memory — which is a real
gap between what the spec's own scenario describes and what such a design
could ever demonstrate. `BroadcastChannel` closes it without a backend,
same-origin, matching exactly how the shell composes every remote from one
page. See [research.md D2](../../specs/004-admin-remote/research.md).

## No event history, no request/response, no cross-origin delivery

- A subscriber that mounts after an event was published never sees it. Each
  remote's own fetch is its source of truth on (re)mount — there is no
  requirement for eventual consistency across a remote that wasn't there.
- Fire-and-forget only. Not a way to ask another remote a question and wait
  for an answer — a richer mechanism would be speculative until a second use
  case exists.
- `BroadcastChannel` is same-origin by design. The shell composes every
  remote from one page, so this was never a limitation in practice.

See [contracts/event-bus-contract.md](../../specs/004-admin-remote/contracts/event-bus-contract.md)
for the full contract.

## The event set is a closed union

```ts
export interface EventMap {
  'user:role-changed': RoleChangedEvent;
}
```

A topic not listed here fails to type-check at both `publish()` and
`subscribe()` call sites — the same discipline `Permission` and `Role`
already use in `@enterprise-mfe/shared-types`. Adding a second event later is
a type addition here, not an API change.

## Cross-tab validation

Same-tab delivery is guaranteed by the compiler: publisher and subscriber
are one build. Cross-tab delivery is not — two tabs can be running two
independently-deployed builds of the same remote, so an older tab can post
the payload shape *its* `EventMap` described.

So payloads arriving over `BroadcastChannel` are checked against a
type-guard per topic before delivery. Anything that fails — an unknown
topic, a mismatched payload, a message that is not a bus message — is
dropped with a `console.warn`, never thrown: a newer tab publishing a
topic this build has not heard of is expected during a rollout.

Adding a topic to `EventMap` requires adding its validator; `EventValidators`
is a mapped type over `EventMap`, so omitting one is a type error. See
[ADR-0025](../../docs/decisions/0025-cross-tab-payload-validation.md).

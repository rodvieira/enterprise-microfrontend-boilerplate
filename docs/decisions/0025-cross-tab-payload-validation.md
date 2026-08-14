# 0025 — Cross-tab event payloads are validated at the receiving edge

**Status:** Accepted

## Context

`packages/event-bus` delivers to subscribers in two ways: an in-memory
`Map` for the current tab, and a same-origin `BroadcastChannel` relay for
other tabs. Until now both delivered whatever arrived, and `EventMap` —
a TypeScript type — was the only thing describing a payload's shape.

For same-tab delivery that is sufficient and complete: publisher and
subscriber are the same bundle, compiled together, checked by the same
compiler. There is nothing a runtime check could catch that the build did
not.

Across tabs it is not sufficient, and the reason is specific to this
architecture rather than generic paranoia. **Two tabs can be running two
independently-deployed builds of the same remote.** That is the premise of
the whole project — remotes ship on their own schedules. So a tab left
open on last week's admin can post exactly the payload last week's
`EventMap` described, and today's dashboard, in another tab, will hand it
to a subscriber typed as valid. The subscriber then reads a field that is
missing, or a role that no longer exists, with the type system asserting
throughout that this cannot happen.

The security framing is the weaker one and worth naming as such:
`BroadcastChannel` is same-origin, and any script that can post to it can
already do considerably worse. Version skew is the real reason.

## Decision

Validate at the receiving edge of the channel, and only there.

`event-map.ts` gains one type-guard per topic (`eventValidators`), and
`bus.ts`'s channel listener drops anything that fails: an unrecognised
topic, a payload that does not match, or a message that is not a bus
message at all. Same-tab `publish()` is unchanged and unvalidated,
because the compiler already guarantees it.

Failures are **dropped with a `console.warn`, never thrown.** A newer tab
publishing a topic this build has never heard of is the expected state
during a rollout, not an error — and there is no caller to catch a throw
inside an event listener anyway.

The validators are hand-written, not a schema library. There is one topic
and the check is ten lines; adding a dependency for that would fail this
project's own bar for adding one. The shape chosen — one predicate per
topic, keyed by the same `EventMap` — is what a validator library would
slot into when the map grows past a handful of topics.

`isRoleChangedEvent` reads `ROLE_PERMISSIONS` from
`@enterprise-mfe/shared-types` rather than repeating the role list, so
the runtime check and the type it guards cannot drift apart.

## Consequences

- A payload that fails validation is not delivered anywhere, and the
  subscriber cannot tell it existed. That is the intent: a partially-valid
  event delivered to some handlers is worse than none.
- Adding a topic to `EventMap` now also requires adding its validator —
  `EventValidators` is a mapped type over `EventMap`, so omitting one is a
  type error rather than a silently unvalidated topic.
- Nothing changes for same-tab publishes, which is the overwhelmingly
  common path and stays a plain function call.

## Alternatives considered

- **Validate `publish()` too** — rejected: it is compile-time-checked by
  construction, and paying a runtime check on the hot path to re-assert
  what the compiler proved is cost with no failure mode behind it.
- **Valibot or Zod** — rejected for now on this project's
  one-line-justification-per-dependency rule. One topic does not justify
  a schema runtime crossing the federation boundary.
- **Versioning the envelope** (`{ v: 2, topic, payload }`) — rejected as
  premature: it addresses evolving one topic's shape over time, which has
  not happened yet, and the validators already reject what a mismatched
  version would produce.

## Related

`docs/decisions/0010-remote-examples.md` — the admin → dashboard event
this bus was built for. `packages/event-bus/src/event-map.ts`.

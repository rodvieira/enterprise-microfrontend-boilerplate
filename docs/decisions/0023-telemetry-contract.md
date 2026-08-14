# 0023 — Telemetry is a contract with a console default, not a vendor integration

**Status:** Accepted

## Context

`RemoteBoundary` has exposed an `onError` callback since sprint 1,
deliberately so the package would not depend on any telemetry vendor. Two
years of good intentions later, nothing consumed it: the only caller was
its own test. `useRemote` tracked load state but timed nothing. The shell
logged origin refusals to the console and otherwise reported nothing at
all.

That leaves the operational questions a host is uniquely positioned to
answer unanswerable — which remote failed, how long loads take, how often
they fail, and, once ADR-0022 put a `version` in the registry, **which
build introduced a regression**. A micro-frontend host that cannot answer
those is exactly the "works on my machine, mysterious in production"
architecture this project exists to argue against.

## Decision

Ship `@enterprise-mfe/telemetry`: an interface, a console-backed default,
and instrumentation in the shell. Do **not** ship a vendor integration.

This is the same decision ADR-0009 made about identity, for the same
reason: enterprises bring their own backend, and picking one would be
wrong for everybody else while dragging that SDK across the federation
boundary into every remote.

Four events, and the split between them is the point:

| Event | Surface |
|---|---|
| `remoteLoadStarted` | code started downloading |
| `remoteLoadSucceeded` | module resolved, with duration |
| `remoteLoadFailed` | never loaded — network, origin refusal, timeout, bad export |
| `remoteRenderCrashed` | loaded, then threw while rendering |

Load failure and render crash have different causes and different owners.
Collapsing them into one "remote error" is what makes a dashboard useless
during an incident, so the contract keeps them apart — mirroring the split
`useRemote` and `RemoteBoundary` already made in the code.

Every event carries a `RemoteContext` of `name`, optional `version`, and
`routePath`. The version is the whole reason ADR-0022 added that registry
field: "which remote failed" is answerable from the name; "which build
introduced this" is not.

### Where the instrumentation lives

In the shell's `RemoteRegion`, by wrapping the loader it hands to
`useRemote` — not inside `@enterprise-mfe/federation-utils`. That package
depends on nothing on purpose (its `useRemote` is testable with a plain
rejecting promise, before any real remote exists); making it depend on the
telemetry contract would push that dependency onto every consumer.
Wrapping the loader puts the instrumentation where the context already
is.

### Two guarantees the provider enforces

- **A throwing implementation cannot break the app.**
  `TelemetryProvider` wraps every method in a try/catch. Telemetry is the
  one dependency that must not be able to break the thing it observes: a
  vendor SDK failing during an outage would otherwise take down the remote
  it was reporting on. Enforced centrally because the implementations are
  written by adopters.
- **`useTelemetry()` does not throw outside a provider.** Unlike
  `useAuth`, it falls back to the console sink — a remote rendered
  standalone (ADR-0007) has no host to inherit a provider from, and
  refusing to render because nothing is watching would make telemetry a
  hard dependency of running the app.

### Console, not no-op

The default prints rather than discarding, so the instrumentation is
visible on a fresh clone — the same reasoning behind `packages/auth`'s
visible stub. Successes go to `console.debug` and failures to
`console.error`, so it informs during development without being noise in a
deployed app nobody has swapped it out of yet.

## Consequences

- `@enterprise-mfe/telemetry` joins `scripts/check-shared-deps.ts`'s
  singleton list and the shell's Module Federation `shared` config, as
  constitution Principle III requires of any package holding a React
  context consumed across apps. Two copies would mean a remote reporting
  into its own console default while the host believes everything reaches
  its real vendor — a monitoring gap that looks exactly like healthy
  silence.
- No remote consumes the contract yet. The host's view of its remotes is
  what a *host* is uniquely able to observe; a remote's own business
  events are its team's concern, and the singleton sharing means a remote
  that wants the host's sink already receives it.
- `docs/how-to-connect-telemetry.md` documents the swap, mirroring
  `how-to-connect-sso.md`.

## Alternatives considered

- **Depend on OpenTelemetry directly** — rejected: it is a heavy
  dependency with its own configuration surface, and it is still one
  vendor choice among several. An adapter against this interface is a
  dozen lines.
- **A single `record(event)` method** — rejected as the primary shape:
  named methods with typed payloads are more discoverable, and an
  implementation that wants one funnel can trivially forward all four.
- **Instrument inside `federation-utils`** — rejected, see above.

## Related

`docs/decisions/0009-auth-contract-not-implementation.md` — the same
decision about identity. `docs/decisions/0022-registry-version-and-rollback.md`
— where `version` comes from. `docs/how-to-connect-telemetry.md`.

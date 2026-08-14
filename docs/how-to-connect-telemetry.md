# How to connect telemetry

`@enterprise-mfe/telemetry` ships a **contract and a console sink**, not a
vendor integration — the same decision `packages/auth` makes about
identity ([ADR-0023](decisions/0023-telemetry-contract.md),
[ADR-0009](decisions/0009-auth-contract-not-implementation.md)). Every
enterprise brings its own backend, and a boilerplate that picked one
would drag that vendor's SDK across the federation boundary into every
remote.

Connecting a real backend is implementing one interface and passing it in.

## The interface

```ts
interface Telemetry {
  remoteLoadStarted(remote: RemoteContext): void;
  remoteLoadSucceeded(remote: RemoteContext, durationMs: number): void;
  remoteLoadFailed(remote: RemoteContext, error: Error, durationMs: number): void;
  remoteRenderCrashed(remote: RemoteContext, error: Error): void;
}

interface RemoteContext {
  name: string;
  version?: string;   // from the registry, when it states one (ADR-0022)
  routePath?: string;
}
```

## Example: Sentry

```ts
import * as Sentry from '@sentry/react';
import type { Telemetry } from '@enterprise-mfe/telemetry';

export const sentryTelemetry: Telemetry = {
  remoteLoadStarted() {},
  remoteLoadSucceeded(remote, durationMs) {
    Sentry.metrics.distribution('remote.load', durationMs, {
      tags: { remote: remote.name, version: remote.version ?? 'unversioned' },
    });
  },
  remoteLoadFailed(remote, error, durationMs) {
    Sentry.captureException(error, {
      tags: { remote: remote.name, version: remote.version ?? 'unversioned', phase: 'load' },
      extra: { durationMs, routePath: remote.routePath },
    });
  },
  remoteRenderCrashed(remote, error) {
    Sentry.captureException(error, {
      tags: { remote: remote.name, version: remote.version ?? 'unversioned', phase: 'render' },
    });
  },
};
```

Then, in `apps/shell/src/exposed/App.tsx`:

```tsx
<TelemetryProvider telemetry={sentryTelemetry}>
```

OpenTelemetry and Datadog are the same shape: a span or metric per event,
tagged with `remote.name` and `remote.version`.

## Why version matters here

`remote.version` is the reason ADR-0022 put an optional `version` in the
registry. "Which remote failed?" is answerable from the name alone;
**"which build introduced this?"** is not. Tag every event with it and a
regression points at a specific release, which is also what makes the
rollback in [how-to-deploy.md](how-to-deploy.md) actionable rather than
guesswork.

A remote served from a mutable path has no version to report and should
omit the registry field rather than state one it cannot guarantee — the
adapters above render that as `unversioned`.

## Two guarantees you do not have to implement

- **A throwing implementation cannot break the app.** `TelemetryProvider`
  wraps every method; a vendor outage is a monitoring gap, never a broken
  page.
- **A remote rendered standalone still works.** `useTelemetry()` falls
  back to the console sink outside a provider, so ADR-0007's
  standalone-parity guarantee holds with no host present.

## What is not instrumented

Only the host's view of its remotes. Business events inside a remote are
that remote's own concern — it can consume this same contract (the
package is a shared singleton, so it receives the host's sink), or use its
team's tooling directly.

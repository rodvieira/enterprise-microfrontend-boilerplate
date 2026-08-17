# @enterprise-mfe/federation-utils

`useRemote()` and `RemoteBoundary`, so no app hand-rolls the mechanics of
loading a federated module. It exists because the failure that actually breaks
micro-frontends in production isn't the happy path — it's what happens when a
remote is unreachable, slow, invalid, or throws mid-render, and this package
is where that handling lives once instead of once per app.

## Usage

```tsx
import { RemoteBoundary, useRemote } from '@enterprise-mfe/federation-utils';

function DashboardRegion() {
  const { Component, state, error, retry } = useRemote(loadDashboard);

  if (state === 'loading') return <Spinner />;
  if (state === 'failed') return <Failed error={error} onRetry={retry} />;

  return (
    <RemoteBoundary fallback={(err, retry) => <Failed error={err} onRetry={retry} />}>
      <Component />
    </RemoteBoundary>
  );
}
```

## No bundler or Module Federation dependency

`useRemote` takes a plain `RemoteLoader<T>` — a function returning
`Promise<{ default: ComponentType<T> }>`, the same shape `React.lazy` accepts.
This package has never imported Rspack, webpack, or the Module Federation
runtime, and it doesn't need to: a caller hands it a loader, whether that
loader wraps `loadRemote()` from `@module-federation/enhanced/runtime` (as
`apps/shell` does) or simply rejects a promise in a test.

That decoupling is what makes every failure mode — a loader that rejects,
never settles, resolves to something unusable, or whose resolved component
throws mid-render — testable with a fake promise, before a real remote exists.
See `docs/USAGE.md` for the full
rationale.

## `RemoteBoundary` has no `pending` prop

The interface used to include one; it never had a defined meaning. An error
boundary only ever reacts to a thrown error during render — it cannot observe
"not ready yet", because `useRemote` has already resolved loading and
load-failure before `RemoteBoundary` ever renders `Component`. If you need a
loading state, that's `useRemote`'s `state === 'loading'`, not this package.

# Public Contract: `@enterprise-mfe/federation-utils`

**Feature**: `002-shell-host` | **Date**: 2026-08-03

The shared loading utility, so neither the host nor any remote hand-rolls the
mechanics of loading a federated module (`FR-011`).

It knows nothing about Module Federation, Rspack, or any bundler. It takes a
function that returns a promise of a module (research D5). That is what lets
every failure mode in `FR-012`–`FR-015` be tested in this sprint, against
simulated remotes, before a real remote exists.

## Exports

```ts
export function useRemote<T>(loader: RemoteLoader<T>, options?: UseRemoteOptions): UseRemoteResult<T>;
export function RemoteBoundary(props: RemoteBoundaryProps): JSX.Element;
export type { RemoteLoader, RemoteLoadState, UseRemoteOptions, UseRemoteResult, RemoteBoundaryProps };
```

## `RemoteLoader`

```ts
type RemoteLoader<T> = () => Promise<{ default: ComponentType<T> }>;
```

The same shape `React.lazy` accepts, so a caller can pass a dynamic import
directly. The shell passes a loader that resolves through the federation runtime;
a test passes one that rejects.

## `useRemote`

```ts
interface UseRemoteOptions {
  /** Milliseconds before a load is treated as failed. Default 10000. */
  timeoutMs?: number;
}

interface UseRemoteResult<T> {
  Component: ComponentType<T> | null;
  state: RemoteLoadState;
  error: Error | null;
  retry: () => void;
}
```

| Guarantee | Requirement |
|---|---|
| `state` moves `idle → loading → loaded \| failed` and never skips | `FR-013` |
| A loader that never settles becomes `failed` after `timeoutMs` | spec edge case, US3 scenario 3 |
| A module without a usable default export is `failed`, not `loaded` | spec edge case 3 |
| `retry()` returns to `loading` without remounting the application | `FR-014` |
| `error` carries the underlying reason, never a generic message | `FR-015` |
| `Component` is non-null exactly when `state` is `loaded` | invariant |

## `RemoteBoundary`

```ts
interface RemoteBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, retry: () => void) => ReactNode;
  pending?: ReactNode;
  onError?: (error: Error) => void;
}
```

Contains a failure to the region it wraps (`FR-012`). A remote that throws during
render — not only during load — must not propagate past this boundary. Implemented
as a class component, because React provides no hook equivalent for error
boundaries.

`onError` exists so the shell can report the failure without this package taking
a dependency on any telemetry package.

## What this package does not do

- It does not fetch, parse, or validate the registry. That is the shell's, and
  only the shell's — a remote that could read the registry would know about its
  siblings.
- It does not decide whether an origin is permitted. Refusal happens before a
  loader is ever constructed.
- It does not retry automatically. Retrying is a person's decision, surfaced
  through `retry()`.

# Public Contract: `@enterprise-mfe/auth`

**Feature**: `001-shared-packages-foundation` | **Date**: 2026-08-02

This is the interface every app and remote will consume. It is the contract that
must survive being backed by a real identity provider later without any consumer
changing a line (FR-010). Types referenced here are defined in
[data-model.md](../data-model.md).

## Exports

```ts
export function useAuth(): AuthContextValue;
export function AuthProvider(props: AuthProviderProps): JSX.Element;
export function ProtectedRoute(props: ProtectedRouteProps): JSX.Element;
export type { AuthContextValue, AuthProviderProps, ProtectedRouteProps };
```

Nothing else is exported. The stub's internals are not reachable from outside the
package, so replacing them cannot break a consumer.

## `AuthContextValue`

```ts
interface AuthContextValue {
  user: User | null;
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
  login(): Promise<void>;
  logout(): Promise<void>;
}
```

| Member | Guarantee |
|---|---|
| `user` | Non-null exactly when `status === 'authenticated'`. |
| `status` | Starts at `unknown`; never returns to it after resolving. |
| `isAuthenticated` | Convenience for `status === 'authenticated'`. Never true while `user` is null. |
| `login` | Resolves once the session is authenticated. Takes no credentials — a real implementation redirects to its provider. |
| `logout` | Resolves once the session is cleared. Safe to call when already signed out. |

`login()` takes no arguments deliberately. Passing a username and password here
would bake a credential-based flow into the contract, and the documented upgrade
path (an OIDC redirect, or a Backend-For-Frontend) has no credentials to pass.

## `useAuth()`

Returns the current `AuthContextValue`. Every consumer within one application
receives the same object identity for the same state (FR-009).

**Throws** when called outside an `AuthProvider`, with a message naming the
missing provider. This is deliberate: a silent default would let a component tree
believe it is signed out forever, and it is also how a second, accidentally
mounted provider becomes observable rather than silently splitting state (spec
edge case 2).

## `AuthProvider`

```ts
interface AuthProviderProps {
  children: ReactNode;
}
```

Establishes exactly one session for the tree beneath it. Takes no configuration —
zero-config operation is the requirement (FR-008), not an oversight.

## `ProtectedRoute`

```ts
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  pending?: ReactNode;
}
```

| `status` | Renders |
|---|---|
| `authenticated` | `children` |
| `unauthenticated` | `fallback`, or a default sign-in prompt when omitted |
| `unknown` | `pending`, or nothing when omitted |

Children are never rendered — not mounted, not hidden with CSS — unless the
session is authenticated (FR-007, SC-003).

## Substitution rules

A replacement implementation MUST keep: the export names, the shape of
`AuthContextValue`, the three-state `status`, the throw-outside-provider
behavior, and the `user`/`status` invariant. It MAY change: what `login()` does
internally, how the session is restored, and how long `unknown` lasts.

## Stub behavior (default, not part of the contract)

Returns a fixed in-memory user with the `admin` role. No network, no storage, no
environment variable. The README states this in its first paragraph (FR-011,
SC-008) so no adopter mistakes it for working authentication.

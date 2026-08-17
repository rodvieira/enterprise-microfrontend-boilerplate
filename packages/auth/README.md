# @enterprise-mfe/auth

**This is a stub. It is not authentication.** It ships a fixed, in-memory fake
user and will sign in anyone who asks, with no password, no identity provider,
and no server. Do not put it in front of anything real. What this package
actually provides is the *contract* — `useAuth()`, `<AuthProvider>`,
`<ProtectedRoute>` — so that the shell and every remote can be built against a
stable session API today and have a real identity provider dropped in behind it
later without a single consumer changing. That decision is deliberate and
deliberate:
every enterprise adopting this boilerplate already runs Okta, Entra ID, Auth0, or
Keycloak, so shipping a real login flow means shipping code that gets deleted
during adoption.

## Usage

```tsx
import { AuthProvider, ProtectedRoute, useAuth } from '@enterprise-mfe/auth';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute fallback={<SignInPrompt />} pending={<Spinner />}>
        <Dashboard />
      </ProtectedRoute>
    </AuthProvider>
  );
}

function UserMenu() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return isAuthenticated ? <button onClick={logout}>{user?.name}</button> : <button onClick={login}>Sign in</button>;
}
```

## The three-state status

`status` is `'unknown' | 'authenticated' | 'unauthenticated'` — not a boolean.
`unknown` means "we have not determined this yet", which a boolean cannot
express. Without it every protected screen renders its signed-out fallback on
first paint and then corrects itself.

`user` is non-null exactly when `status` is `'authenticated'`. Any other
combination is a defect, and the invariant is covered by a test.

`useAuth()` throws outside an `AuthProvider` rather than returning a default.
A silent default would let a component tree believe it is signed out forever, and
it is also how a second, accidentally mounted provider becomes visible instead of
quietly splitting the session in two.

## Replacing the stub

Everything fake lives in `src/stub.ts` — three functions and one frozen user.
Nothing in it is exported from the package, so swapping it cannot break a
consumer. See [docs/USAGE.md](../../docs/USAGE.md) for
the integration path and `.env.example` for the variables a real provider needs.

The recommended production pattern is Backend-For-Frontend, where tokens never
reach the browser. That is documented as an upgrade path, not built here — this
project is frontend-only by choice.

## Singleton

This package holds shared state, so shell and every remote must resolve to one
instance of it. `pnpm check:shared-deps` enforces that
(see `pnpm check:shared-deps`).

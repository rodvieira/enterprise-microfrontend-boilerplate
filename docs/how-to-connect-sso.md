# How to connect a real identity provider

`packages/auth` ships a stub — an in-memory fake user, no network, no
password, no identity provider. It signs in anyone who asks. This is
deliberate, not unfinished: see
[ADR-0009](decisions/0009-auth-contract-not-implementation.md) for why. If
you got here because a person asked to "add real login," read that ADR
first and confirm they actually want to change this decision — it was made
for a specific reason (every enterprise adopting this boilerplate already
runs an identity provider of its own).

If the answer is still yes, this is the integration path.

## What the contract requires of a real implementation

Everything a consumer (the shell, any remote) touches is three exports from
`@enterprise-mfe/auth`'s single public entry point
(`packages/auth/src/index.ts`):

```ts
export { AuthProvider, useAuth } from './context';
export type { AuthContextValue, AuthProviderProps, AuthStatus } from './context';
export { ProtectedRoute } from './protected-route';
export type { ProtectedRouteProps } from './protected-route';
```

A real implementation must preserve this shape exactly, so that not one
consumer (`apps/shell`, `apps/dashboard`, `apps/admin`, or any generated
remote) changes a line:

- **`AuthContextValue`**: `{ user, status, isAuthenticated, login, logout }`.
  `status` is `'unknown' | 'authenticated' | 'unauthenticated'` — three
  states, not a boolean. `unknown` is what a real provider's session
  restoration needs: "we haven't determined this yet" is a real, distinct
  state from "determined and signed out." `user` must be non-null exactly
  when `status === 'authenticated'` — nothing else is a valid combination.
- **`useAuth()`** must keep throwing outside an `<AuthProvider>`, not
  returning a default. A silent default is how a second, accidentally
  mounted provider becomes invisible instead of an obvious bug.
- **`<AuthProvider>`** takes no configuration props today (the stub needs
  none). A real provider will need configuration — see the environment
  variables below — but that configuration should come from environment
  variables read where the provider is constructed, not from new props
  every consumer would have to start passing.
- **`<ProtectedRoute>`** must keep never rendering `children` while signed
  out — not mounted-and-hidden, not present in the tree at all. This is
  what makes it safe to put real UI, not just routes, behind it.

## Where the fake lives, and only the fake

Everything stub-specific is `packages/auth/src/stub.ts` — three functions
(`stubSignIn`, `stubSignOut`, `stubRestore`) and one frozen `STUB_USER`.
None of it is exported from the package's public entry point
(`packages/auth/src/index.ts`), so replacing `stub.ts`'s three functions
with real calls to your identity provider's SDK — inside
`packages/auth/src/context.tsx`, which is what actually calls them — is a
change no consumer needs to know happened.

## Environment variables already reserved

`.env.example` (repository root) already names the three variables any
OIDC-compliant provider needs — Okta, Entra ID, Auth0, Keycloak, Google
Workspace, or any other, through the same three variables, no per-provider
code:

```bash
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_REDIRECT_URI=http://localhost:3000/callback
```

These are not read anywhere yet — wiring them into `context.tsx`'s real
`stubSignIn`/`stubSignOut`/`stubRestore` replacements is exactly the work
this doc is describing, not something already half-done.

## The recommended production pattern: BFF, not implemented here

ADR-0009 names the Backend-For-Frontend (BFF) pattern — OAuth/OIDC tokens
never reach the browser; session lives in an `HttpOnly` cookie issued by a
lightweight backend — as the 2026 security consensus for SPA auth, and
explicitly does not implement it, because this project is frontend-only by
deliberate choice. If you're building the real integration, start there:
a token-in-the-browser implementation is easier to wire into `context.tsx`
directly, but a BFF is what production deployments should actually run.
This project does not ship that backend component; adding one is real,
separate infrastructure work outside `packages/auth` itself.

## Singleton — don't forget `check:shared-deps`

`packages/auth` is a singleton (constitution Principle III,
`scripts/check-shared-deps.ts`'s `SINGLETONS`) — the shell and every remote
must resolve to exactly one instance of it, real implementation or stub.
Nothing about that changes when you replace the stub; a real
`AuthProvider` still needs to be the one and only session source the whole
composed application shares.

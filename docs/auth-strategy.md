# Auth strategy

`packages/auth` is this project's shared session contract — `useAuth()`,
`<AuthProvider>`, `<ProtectedRoute>` — consumed identically by `apps/shell`
and every remote, backed by an in-memory stub by default. This is the
architecture reference for that contract; see
[ADR-0009](decisions/0009-auth-contract-not-implementation.md) for why a
stub ships instead of a real login flow, and
[how-to-connect-sso.md](how-to-connect-sso.md) for how to replace it.

## The contract, not the implementation

Every consumer imports only from `packages/auth/src/index.ts` — three
exports, `AuthProvider`, `useAuth`, `ProtectedRoute` — never from
`stub.ts`, which isn't exported at all. This split is what lets the stub be
replaced with a real identity-provider integration as a one-file change
inside `packages/auth` (`stub.ts`'s three functions, called from
`context.tsx`) with zero changes anywhere that consumes `useAuth()`.

## Three states, not a boolean

`AuthContextValue.status` is `'unknown' | 'authenticated' |
'unauthenticated'`. A boolean can't express "we haven't determined this
yet" — without the third state, every screen behind a `<ProtectedRoute>`
would flash its signed-out fallback on first paint before correcting
itself once the real session resolves. `user` is non-null exactly when
`status === 'authenticated'`; any other combination is a defect, covered by
a test in `packages/auth`'s own test suite.

`useAuth()` throws when called outside an `<AuthProvider>`, rather than
returning a default value. A silent default would let a component tree
believe it's permanently signed out, and — more subtly — is how a second,
accidentally-mounted `<AuthProvider>` becomes invisible instead of an
observable bug: two providers means two independent sessions, which is
exactly the class of bug singleton enforcement (below) exists to prevent.

## `<ProtectedRoute>` withholds, it doesn't hide

While the session is `'unauthenticated'`, `<ProtectedRoute>`'s `children`
are never mounted — not present in the DOM at all, not hidden with CSS.
This is what makes it safe to put real UI, not just route-level gating,
directly behind it: there's no window where protected content exists in
the tree for a moment before a check redirects away from it.

## Singleton, enforced

`@enterprise-mfe/auth` is one of the packages `scripts/check-shared-deps.ts`
verifies resolves to a single version across the shell and every remote
(constitution Principle III) — the same guarantee React and ReactDOM get.
This matters because `AuthContextValue` is React context: two copies of
`packages/auth` in the dependency graph means two independent contexts,
and a component reading `useAuth()` from the "wrong" copy sees a session
that silently doesn't match what the rest of the composed application
sees. `pnpm turbo gen remote` (the sprint-7 generator) declares this
singleton correctly in every generated remote's `package.json` by
construction — see
[how-to-add-a-remote.md](how-to-add-a-remote.md).

## What ships today vs. what's a deliberate gap

**Ships today**: the full contract above, backed by `packages/auth/src/stub.ts`
— a frozen fake user, no network call, no environment variable read,
verified by that package's own isolation test. `pnpm dev` works with zero
auth configuration.

**Deliberate gap, not an oversight**: no real OIDC/OAuth flow, no real
identity-provider SDK, no Backend-For-Frontend session backend. ADR-0009
records why — every enterprise adopting this boilerplate already runs
Okta, Entra ID, Auth0, or Keycloak, so shipping a real login flow means
shipping code nearly every adopter deletes on arrival. `.env.example`
(repository root) already reserves the three environment variables
(`AUTH_ISSUER_URL`, `AUTH_CLIENT_ID`, `AUTH_REDIRECT_URI`) a real,
OIDC-compliant integration needs, unread by any code today.

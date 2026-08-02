# 0009 — Authentication: contract and stub, not a real implementation

**Status:** Accepted

## Context

Every enterprise large enough to adopt a micro-frontend boilerplate already has
an identity provider (Okta, Entra ID, Auth0, Keycloak, etc.). Shipping a real
login flow means shipping code nearly every adopter will rip out and replace.

Separately: the 2026 consensus for SPA security is the Backend-For-Frontend
(BFF) pattern — OAuth/OIDC tokens never touch the browser, session lives in an
`HttpOnly` cookie issued by a lightweight backend. This project is
frontend-only by deliberate choice (see the project's original scope
decisions), which means implementing the "gold standard" pattern properly
would require adding a backend component.

## Decision

Ship `packages/auth` as a stable contract (`useAuth()`, `<ProtectedRoute>`,
`<AuthProvider>`) backed by an in-memory stub user by default. Do not implement
a real OIDC/OAuth flow. Document the integration path
(`docs/how-to-connect-sso.md`, `.env.example` with `AUTH_ISSUER_URL` /
`AUTH_CLIENT_ID` / `AUTH_REDIRECT_URI`) instead of code.

Document the BFF pattern as the recommended production upgrade path, explicitly
not implemented here.

## Consequences

- The demo works standalone with zero configuration (stub user, no identity
  provider required to `pnpm dev` and see the dashboard/admin flow).
- Adopting this boilerplate for production with real users requires the
  adopting team to do real integration work — this is by design, not a gap to
  apologize for.
- `packages/auth` is included in the singleton drift check
  (`scripts/check-shared-deps.ts`) — shell and every remote must resolve to the
  same auth context instance, stub or real.

/**
 * The only public entry point of @enterprise-mfe/auth.
 *
 * Nothing from `stub.ts` is exported: the fake is not part of the contract, so
 * replacing it cannot break a consumer.
 */

export { AuthProvider, useAuth } from './context';
export type { AuthContextValue, AuthProviderProps, AuthStatus } from './context';

export { ProtectedRoute } from './protected-route';
export type { ProtectedRouteProps } from './protected-route';

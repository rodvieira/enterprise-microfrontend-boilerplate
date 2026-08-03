import type { ReactNode } from 'react';
import { useAuth } from './context';

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Shown when the session is known and signed out. */
  fallback?: ReactNode;
  /** Shown while the session is still unknown. Nothing by default. */
  pending?: ReactNode;
}

/**
 * Withholds its children until the session is authenticated.
 *
 * Children are never rendered while signed out — not mounted and hidden, not
 * present in the tree at all.
 */
export function ProtectedRoute({ children, fallback, pending }: ProtectedRouteProps) {
  const { status } = useAuth();

  if (status === 'unknown') {
    return <>{pending ?? null}</>;
  }

  if (status === 'unauthenticated') {
    return <>{fallback ?? <output>You need to sign in to view this.</output>}</>;
  }

  return <>{children}</>;
}

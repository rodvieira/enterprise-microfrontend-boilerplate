import type { User } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { stubRestore, stubSignIn, stubSignOut } from './stub';

/**
 * Three states, not a boolean.
 *
 * `unknown` is what a boolean cannot express: "we have not determined this yet".
 * Without it, every protected screen renders its signed-out fallback on first
 * paint and then corrects itself.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export interface SessionContextValue {
  /** Non-null exactly when `status` is `authenticated`. */
  user: User | null;
  status: SessionStatus;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface SessionProviderProps {
  children: ReactNode;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Establishes exactly one session for the tree beneath it. Takes no configuration. */
export function SessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>('unknown');

  useEffect(() => {
    let cancelled = false;
    void stubRestore().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setStatus(restored ? 'authenticated' : 'unauthenticated');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async () => {
    const signedIn = await stubSignIn();
    setUser(signedIn);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await stubSignOut();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
    }),
    [user, status, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Reads the current session.
 *
 * Throws outside a provider on purpose: a silent default would let a component
 * tree believe it is signed out forever, and it is also how a second,
 * accidentally mounted provider becomes observable instead of quietly splitting
 * state in two.
 */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside a <SessionProvider>.');
  }
  return value;
}

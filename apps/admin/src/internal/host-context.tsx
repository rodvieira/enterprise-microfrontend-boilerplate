import type { RemoteBus, RemoteSession } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/**
 * What this remote received from its host, made available to the tree
 * without threading it through every component.
 *
 * A remote gets the session and the bus as props on its exposed root — it
 * imports nothing from the host, because it lives in its own repository.
 * This context is how those props reach the components that need them; it is
 * this app's own, not a shared package.
 */
export interface HostContextValue {
  readonly session: RemoteSession;
  readonly bus: RemoteBus;
}

const HostContext = createContext<HostContextValue | null>(null);

export function HostProvider({
  value,
  children,
}: {
  value: HostContextValue;
  children: ReactNode;
}) {
  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

/**
 * Throws outside a provider on purpose: reaching the host is not optional
 * for this app, and a silent default would let a component believe nobody is
 * signed in forever.
 */
export function useHost(): HostContextValue {
  const value = useContext(HostContext);
  if (!value) {
    throw new Error('useHost must be used inside the <HostProvider> that App establishes.');
  }
  return value;
}

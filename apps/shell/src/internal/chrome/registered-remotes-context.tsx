import { createContext, useContext } from 'react';
import type { RemoteRegistration } from '../federation/types';

/**
 * The remotes the nav renders links for — a subset of `App`'s own
 * `RegisteredRemotesProvider` state, itself populated from the same
 * `discoverRemoteRoutes()` promise `patchRoutesOnNavigation` already
 * resolves (App.tsx). `ShellLayout` reads this instead of a hardcoded
 * list so the nav never drifts from what the registry actually allowed.
 */
const RegisteredRemotesContext = createContext<readonly RemoteRegistration[]>([]);

export const RegisteredRemotesProvider = RegisteredRemotesContext.Provider;

export function useRegisteredRemotes(): readonly RemoteRegistration[] {
  return useContext(RegisteredRemotesContext);
}

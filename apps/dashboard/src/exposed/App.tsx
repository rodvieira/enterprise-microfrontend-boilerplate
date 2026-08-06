import { useAuth } from '@enterprise-mfe/auth';
import type { RemoteAppProps } from '@enterprise-mfe/shared-types';

/**
 * What the shell mounts at `/dashboard` (via RemoteRegion, "dashboard/App").
 * This app's public exposed surface — everything else lives in `internal/`.
 *
 * Deliberately no <AuthProvider> here: when composed inside the shell, this
 * component renders inside the shell's own <AuthProvider> (React context is
 * shared because @enterprise-mfe/auth is an MF singleton — FR-005). Only the
 * standalone dev entry (bootstrap.tsx) needs its own provider, since it has
 * no shell ancestor to supply one.
 */
export function App({ basePath }: RemoteAppProps) {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col gap-6 p-6" data-base-path={basePath}>
      <header>
        <h1 className="text-xl font-medium text-(--color-text)">Dashboard</h1>
        <p className="text-sm text-(--color-text-muted)">
          {isAuthenticated && user ? `Signed in as ${user.name}` : 'Not signed in'}
        </p>
      </header>
    </div>
  );
}

/**
 * `createFederationLoader` (apps/shell/src/internal/federation/loader.ts)
 * requires a default export — found by actually loading this remote in a
 * real browser, where a named-export-only module surfaced as "has no usable
 * default export" instead of rendering.
 */
export default App;

import { AuthProvider } from '@enterprise-mfe/auth';
import { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ShellLayout } from '../internal/chrome/layout';
import { fetchRegistry } from '../internal/federation/manifest';
import { registerAllowedRemotes } from '../internal/federation/register';
import { HomeRoute } from '../internal/routes/home';
import { HOST_OWNED_ROUTE_PATHS } from '../internal/routes/remote-routes';

/**
 * The host's own routes. Remote routes are not listed statically here — they
 * are discovered from the registry at runtime and patched in via
 * react-router's patchRoutesOnNavigation once a real remote exists (sprint 4;
 * see research D6's addendum on why TanStack Router was not used instead).
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ShellLayout>
        <HomeRoute />
      </ShellLayout>
    ),
  },
]);

/**
 * What bootstrap.tsx mounts. This is the shell's public entry, the same
 * exposed/ vs internal/ split every remote uses (constitution Principle I) —
 * even though the shell exposes nothing over federation today.
 */
export function App() {
  useEffect(() => {
    // Fire-and-forget: the frame renders immediately and never waits on this
    // (FR-001, research D3 consequences). registerAllowedRemotes runs origin
    // control (origin-guard.ts) before any remote code is fetched — a refused
    // remote never reaches the MF runtime, let alone a RemoteLoadState.
    // Patching the survivors into the router as real routes is sprint 4 work,
    // once a real remote exists to route to.
    fetchRegistry(HOST_OWNED_ROUTE_PATHS)
      .then((registry) => registerAllowedRemotes(registry))
      .catch((error: unknown) => {
        console.error(error);
      });
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

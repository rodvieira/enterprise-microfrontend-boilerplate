import { AuthProvider } from '@enterprise-mfe/auth';
import { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ShellLayout } from '../internal/chrome/layout';
import { fetchRegistry } from '../internal/federation/manifest';
import { registerAllowedRemotes } from '../internal/federation/register';
import { HomeRoute } from '../internal/routes/home';
import { RemoteRegion } from '../internal/routes/remote-region';
import { HOST_OWNED_ROUTE_PATHS } from '../internal/routes/remote-routes';

/**
 * The host's own routes. Remote routes are not listed statically here — they
 * are discovered from the registry at runtime and patched in once known (see
 * the effect below). Patched with react-router 8's imperative
 * `router.patchRoutes(routeId, children)` rather than `patchRoutesOnNavigation`
 * — the frame still renders before this resolves (FR-001), but the simpler
 * imperative API needs no lazy-discovery callback wired through every route.
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
    fetchRegistry(HOST_OWNED_ROUTE_PATHS)
      .then((registry) => registerAllowedRemotes(registry))
      .then(({ registered }) => {
        if (registered.length === 0) {
          return;
        }
        router.patchRoutes(
          null,
          registered.map((registration) => ({
            path: registration.routePath,
            element: (
              <ShellLayout>
                <RemoteRegion remoteName={registration.name} basePath={registration.routePath} />
              </ShellLayout>
            ),
          })),
        );
      })
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

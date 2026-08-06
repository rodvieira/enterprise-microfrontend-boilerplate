import { AuthProvider } from '@enterprise-mfe/auth';
import { useEffect, useState } from 'react';
import type { PatchRoutesOnNavigationFunctionArgs, RouteObject } from 'react-router';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ShellLayout } from '../internal/chrome/layout';
import { fetchRegistry } from '../internal/federation/manifest';
import { registerAllowedRemotes } from '../internal/federation/register';
import { HomeRoute } from '../internal/routes/home';
import { RemoteRegion } from '../internal/routes/remote-region';
import { HOST_OWNED_ROUTE_PATHS } from '../internal/routes/remote-routes';

/**
 * Built fresh per `<App>` mount (via `useState`'s lazy initializer below),
 * not at module scope — a module-level router would share its memoized
 * registry/route-discovery promises across every test in a file that
 * renders `<App>` more than once, each with its own `fetch` mock. In real
 * usage `App` mounts exactly once, so this runs once regardless.
 *
 * `patchRoutesOnNavigation`, not the simpler imperative `router.patchRoutes`,
 * because a *hard* navigation straight to a remote's path (a page load, not a
 * client-side link click — exactly what an e2e test's `page.goto('/dashboard')`
 * does) asks the router to match `/dashboard` before any effect has had a
 * chance to run. `patchRoutesOnNavigation` is invoked by the router itself
 * for exactly that "no match yet" moment, before it falls through to the 404
 * boundary — discovered by running a real Playwright test against this
 * exact scenario, which the first attempt (`router.patchRoutes` in a
 * `useEffect`) failed with a 404 every time.
 */
function createAppRouter() {
  let registryPromise: ReturnType<typeof fetchRegistry> | null = null;
  function getRegistry() {
    registryPromise ??= fetchRegistry(HOST_OWNED_ROUTE_PATHS);
    return registryPromise;
  }

  let remoteRoutesPromise: Promise<RouteObject[]> | null = null;
  function discoverRemoteRoutes(): Promise<RouteObject[]> {
    remoteRoutesPromise ??= getRegistry()
      .then((registry) => registerAllowedRemotes(registry))
      .then(({ registered }) =>
        registered.map((registration) => ({
          path: registration.routePath,
          element: (
            <ShellLayout>
              <RemoteRegion remoteName={registration.name} basePath={registration.routePath} />
            </ShellLayout>
          ),
        })),
      );
    return remoteRoutesPromise;
  }

  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: (
          <ShellLayout>
            <HomeRoute />
          </ShellLayout>
        ),
      },
    ],
    {
      async patchRoutesOnNavigation({ patch }: PatchRoutesOnNavigationFunctionArgs) {
        const routes = await discoverRemoteRoutes();
        patch(null, routes);
      },
    },
  );

  return { router, discoverRemoteRoutes };
}

/**
 * What bootstrap.tsx mounts. This is the shell's public entry, the same
 * exposed/ vs internal/ split every remote uses (constitution Principle I) —
 * even though the shell exposes nothing over federation today.
 */
export function App() {
  const [{ router, discoverRemoteRoutes }] = useState(createAppRouter);

  useEffect(() => {
    // Fire-and-forget: the frame renders immediately and never waits on this
    // (FR-001, research D3 consequences). Runs origin control and registers
    // every allowed remote with the MF runtime at startup (FR-016–FR-018),
    // even if the person never navigates to a remote's route — a refusal
    // must be decided and logged immediately, not deferred until someone
    // happens to visit that path. `discoverRemoteRoutes` is memoized per
    // router instance, so `patchRoutesOnNavigation` reuses this same result
    // instead of registering twice.
    discoverRemoteRoutes().catch((error: unknown) => {
      console.error(error);
    });
  }, [discoverRemoteRoutes]);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

import { AuthProvider } from '@enterprise-mfe/auth';
import { TelemetryProvider } from '@enterprise-mfe/telemetry';
import { useEffect, useState } from 'react';
import type { PatchRoutesOnNavigationFunctionArgs, RouteObject } from 'react-router';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ShellLayout } from '../internal/chrome/layout';
import { RegisteredRemotesProvider } from '../internal/chrome/registered-remotes-context';
import { fetchRegistry } from '../internal/federation/manifest';
import { registerAllowedRemotes } from '../internal/federation/register';
import type { RemoteRegistration } from '../internal/federation/types';
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

  interface DiscoveredRoutes {
    routes: RouteObject[];
    registered: readonly RemoteRegistration[];
  }

  let remoteRoutesPromise: Promise<DiscoveredRoutes> | null = null;
  function discoverRemoteRoutes(): Promise<DiscoveredRoutes> {
    remoteRoutesPromise ??= getRegistry()
      .then((registry) => registerAllowedRemotes(registry))
      .then(({ registered }) => ({
        registered,
        routes: registered.map((registration) => ({
          path: registration.routePath,
          element: (
            <ShellLayout>
              {/* Spread, not `version={registration.version}`: under
                  exactOptionalPropertyTypes an absent version and one
                  explicitly set to undefined are different things, and the
                  registry omitting the field is the former. */}
              <RemoteRegion
                remoteName={registration.name}
                basePath={registration.routePath}
                {...(registration.version ? { version: registration.version } : {})}
              />
            </ShellLayout>
          ),
        })),
      }));
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
      // Read from <base href> (set at build time from the registry's own
      // basePath — rspack.config.ts), not hardcoded '/': the same value
      // manifest.ts's relative REGISTRY_URL resolves against, so the router
      // and the registry fetch never disagree about where the app is
      // mounted.
      basename: new URL(document.baseURI).pathname,
      async patchRoutesOnNavigation({ patch }: PatchRoutesOnNavigationFunctionArgs) {
        const { routes } = await discoverRemoteRoutes();
        patch(null, routes);
      },
    },
  );

  return { router, discoverRemoteRoutes };
}

/**
 * What bootstrap.tsx mounts. This is the shell's public entry, the same
 * exposed/ vs internal/ split every remote uses —
 * even though the shell exposes nothing over federation today.
 */
export function App() {
  const [{ router, discoverRemoteRoutes }] = useState(createAppRouter);
  const [registeredRemotes, setRegisteredRemotes] = useState<readonly RemoteRegistration[]>([]);

  useEffect(() => {
    // Fire-and-forget: the frame renders immediately and never waits on
    // this. Runs origin control and registers every allowed remote with the
    // MF runtime at startup,
    // even if the person never navigates to a remote's route — a refusal
    // must be decided and logged immediately, not deferred until someone
    // happens to visit that path. `discoverRemoteRoutes` is memoized per
    // router instance, so `patchRoutesOnNavigation` reuses this same result
    // instead of registering twice. The nav (ShellLayout) reads the same
    // `registered` list through context, so it only ever links to a remote
    // that actually passed origin-guard.
    discoverRemoteRoutes()
      .then(({ registered }) => setRegisteredRemotes(registered))
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [discoverRemoteRoutes]);

  return (
    <TelemetryProvider>
      <AuthProvider>
        <RegisteredRemotesProvider value={registeredRemotes}>
          <RouterProvider router={router} />
        </RegisteredRemotesProvider>
      </AuthProvider>
    </TelemetryProvider>
  );
}

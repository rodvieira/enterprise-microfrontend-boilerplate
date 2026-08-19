import type { RemoteAppProps } from '@enterprise-mfe/shared-types';
import { useEffect, useMemo, useState } from 'react';
import { ActivityChart } from '../internal/chart/activity-chart';
import { shouldForceOverviewFailure } from '../internal/data/force-failure';
import { useDashboardOverview } from '../internal/data/use-dashboard-overview';
import { RecentActivity } from '../internal/feed/recent-activity';
import { KpiCards } from '../internal/kpi/kpi-cards';
import '../internal/styles.css';

/**
 * What the shell mounts at `/dashboard` (via RemoteRegion, "dashboard/App").
 * This app's public exposed surface — everything else lives in `internal/`.
 *
 * The styles.css import matters *here*, not only in bootstrap.tsx: when the
 * shell loads this module via federation, it fetches only the chunks in
 * `./App`'s own dependency graph — `main`'s chunk (which bootstrap.tsx
 * belongs to) is never requested. Without this import, every dashboard-owned
 * Tailwind class (this file's own `flex`, `gap-6`, `ActivityChart`'s `h-64`,
 * …) resolved to no generated CSS at all when composed, collapsing the chart
 * to a 0×0 container — found only by inspecting the composed page's actual
 * stylesheets in a real browser, not by a passing accessibility-tree assertion.
 *
 * Everything it needs from the host arrives as props — `session` and `bus`.
 * It imports nothing of the host's, which is what lets a remote live in its
 * own repository: there is no package to install.
 */
export function App({ basePath, session, bus }: RemoteAppProps) {
  const { user, isAuthenticated } = session;
  // One fetch, shared by every domain surface (data-model.md) — not three
  // independent ones.
  const overview = useDashboardOverview({ forceFailure: shouldForceOverviewFailure() });

  // The headline proof: a role change in admin bumps this count live, with
  // no reload and no coupling between the two remotes — it travels through
  // the host's bus. A simple increment against whatever the last fetch
  // resolved, not a recomputation from admin's user list, which this remote
  // has no reason to know about.
  const [roleChangeBumps, setRoleChangeBumps] = useState(0);
  useEffect(
    () =>
      bus.subscribe('user:role-changed', (payload) => {
        // The payload crossed a boundary between two separately built
        // applications, so its shape is checked here rather than assumed.
        if (typeof payload !== 'object' || payload === null) return;
        if (typeof (payload as { userId?: unknown }).userId !== 'string') return;
        setRoleChangeBumps((count) => count + 1);
      }),
    [bus],
  );

  const adjustedOverview = useMemo(() => {
    if (overview.status !== 'loaded' || roleChangeBumps === 0) {
      return overview;
    }
    return {
      ...overview,
      data: {
        ...overview.data,
        kpis: overview.data.kpis.map((kpi) =>
          kpi.id === 'active-users' ? { ...kpi, value: kpi.value + roleChangeBumps } : kpi,
        ),
      },
    };
  }, [overview, roleChangeBumps]);

  return (
    <div className="flex flex-col gap-6 p-6" data-base-path={basePath}>
      <header>
        <h1 className="text-xl font-medium text-(--color-text)">Dashboard</h1>
        <p className="text-sm text-(--color-text-muted)">
          {isAuthenticated && user ? `Signed in as ${user.name}` : 'Not signed in'}
        </p>
      </header>
      <KpiCards state={adjustedOverview} />
      <ActivityChart state={overview} />
      <RecentActivity state={overview} />
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

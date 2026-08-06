/**
 * A dev/test-only escape hatch: `?forceOverviewFailure=1` forces
 * fetchDashboardOverview's rejection path (FR-008's error state), so an e2e
 * test can prove the shell contains a real remote's data-fetch failure
 * (FR-018) without a real backend to break. Never read anywhere in
 * production-affecting logic beyond this one flag.
 */
export function shouldForceOverviewFailure(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('forceOverviewFailure') === '1';
}

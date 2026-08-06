# Internal Contract: `apps/dashboard/src/internal/data/fetch-overview.ts`

**Feature**: `003-dashboard-remote` | **Date**: 2026-08-06

Internal to the dashboard remote — nothing here crosses the federation
boundary or is importable from outside `apps/dashboard`. Documented as a
contract anyway (Principle IV) because it is the seam every future swap to a
real data source (a backend, once one exists) replaces, and the seam a test
exercises to prove `FR-008`'s error path without a flaky real network call.

## Exports

```ts
export function fetchDashboardOverview(options?: FetchOverviewOptions): Promise<DashboardOverview>;
export type { FetchOverviewOptions, DashboardOverview, KpiMetric, ActivityDataPoint, ActivityFeedItem };
```

## `fetchDashboardOverview`

```ts
interface FetchOverviewOptions {
  /** Milliseconds of artificial delay before resolving. Default 400. */
  delayMs?: number;
  /** Forces the rejection path — how FR-008's error state is tested. Default false. */
  forceFailure?: boolean;
}
```

| Guarantee | Requirement |
|---|---|
| Resolves with a `DashboardOverview` after `delayMs` when `forceFailure` is not set | `FR-007` |
| Rejects with an `Error` carrying a specific, non-generic message when `forceFailure` is set | `FR-008`, mirrors `federation-utils-contract.md`'s `error` guarantee |
| Returns exactly 2 `kpis`: `active-users`, `usage-trend` | `FR-006` |
| Returns at most 12 `feed` items, reverse-chronological | `FR-012`, `FR-013` — 12 is this sprint's documented bound, chosen to fill the feed region without scrolling at the design system's default card width |
| Never mutates its returned arrays between calls — each call produces a fresh, independently-ordered result | prevents a test from passing only because it reused a prior call's array reference |

## What this contract deliberately does not do

- It does not call `fetch`, `XMLHttpRequest`, or any network API. The data is
  an in-module fixture (research D5) — this project has no backend to call.
- It does not cache. Every call re-resolves from the fixture; caching is a
  concern for whatever replaces this function against a real data source
  later, not for proving the async-fetch mechanism this sprint is about.
- It does not know about React. `useDashboardOverview` (a thin hook wrapping
  this function in `FetchState`, see `data-model.md`) is a separate, one-file
  concern — kept separate so the fixture itself is testable with no DOM.

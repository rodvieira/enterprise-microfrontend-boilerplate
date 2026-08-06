# Phase 1 Data Model: Dashboard Remote

**Feature**: `003-dashboard-remote` | **Date**: 2026-08-06

The dashboard's data is its own domain fixture, not configuration — unlike the
shell, which has no domain data of its own. Everything here is internal to
`apps/dashboard` (`src/internal/data/`); nothing is exposed across the
federation boundary except the root component itself (`RemoteAppProps`,
already defined in `@enterprise-mfe/shared-types` — not redefined here).

---

## DashboardOverview

The single payload one fetch resolves to. KPI cards, the chart, and the feed
all read from the same fetch rather than issuing three independent requests —
they are one conceptual "state of the dashboard right now," and driving them
from one `FetchState` is what makes "distinct loading state" (`FR-008`) true
for all three surfaces without three copies of the same async logic.

| Field | Type | Rules |
|---|---|---|
| `kpis` | `readonly KpiMetric[]` | Exactly two for this sprint: active users, usage trend (`FR-006`). |
| `activity` | `readonly ActivityDataPoint[]` | Chronologically ordered, oldest first — the order a chart plots left to right. |
| `feed` | `readonly ActivityFeedItem[]` | Reverse-chronological, newest first (`FR-012`) — the opposite order from `activity`, because a feed and a time-axis chart read in opposite directions. |

---

## KpiMetric

A labeled numeric value with a trend indicator, rendered inside a `Card`.

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Stable identity for the card — used as the React key and in tests, not shown. |
| `label` | `string` | "Active users", "Usage trend". |
| `value` | `number` | The current value. Formatting (percentage, count) is the card's concern, not the data model's. |
| `trend` | `'up' \| 'down' \| 'flat'` | Drives the trend indicator. `'flat'` is a real state, not a fallback — a metric that hasn't moved is not an error. |

---

## ActivityDataPoint

One point the chart plots.

| Field | Type | Rules |
|---|---|---|
| `timestamp` | `string` (ISO 8601) | X-axis value. |
| `value` | `number` | Y-axis value. |

**Edge case coverage**: an `activity` array with zero or one entries is valid
— the chart's empty/minimal state (spec Edge Cases) is a rendering concern,
not a data-shape violation. `ActivityDataPoint[]` has no minimum length.

---

## ActivityFeedItem

One entry in the recent activity feed, rendered through the shared design
system's `Table` (or a list built the same way `Table` composes — see
`plan.md` Project Structure), using its `emptyState` prop for the empty case
(`FR-013`).

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Stable identity — the row key. |
| `timestamp` | `string` (ISO 8601) | Used for sort order (reverse-chronological) and display. |
| `description` | `string` | What happened. Plain text — no rich content in this sprint. |

**Bounding** (`FR-013`): the fixture data source returns at most a fixed,
documented number of items (see `contracts/dashboard-data-contract.md`); the
feed itself does not truncate, it renders exactly what it receives. Where
"bounded" is enforced is a design decision the contract states explicitly, so
it isn't ambiguous between the data source and the rendering component.

---

## FetchState\<T\>

Not a new export — this project already has the exact shape it needs. The
dashboard reuses `RemoteLoadState`'s pattern
(`idle → loading → loaded | failed`, from `@enterprise-mfe/federation-utils`,
`specs/002-shell-host/contracts/federation-utils-contract.md`) for its own
internal data fetch, rather than a bundler/federation-specific type — it is
generic over any async value, which is exactly what a plain data fetch needs.
See `contracts/dashboard-data-contract.md` for the exact function signature
this sprint adds.

| State | `KpiMetric[]`, chart, feed rendering |
|---|---|
| `idle` / `loading` | Loading state on all three surfaces (`FR-008`) |
| `loaded` | Cards show values, chart renders `activity`, feed shows `feed` or its empty state |
| `failed` | Cards show their error state (`FR-008`); chart and feed region show the same contained failure, not three different error UIs |

**Relationship to the shell's containment**: when composed inside the shell,
a `failed` `DashboardOverview` fetch is a failure *inside* the mounted
dashboard region — already contained by construction, since the dashboard is
one federated region. `RemoteBoundary` (shell-side, `federation-utils`) only
ever sees this as "the remote loaded successfully and is now rendering its
own internal error state," which is exactly the distinction `FR-018` draws
between a remote that fails to *load* and a remote that loads and shows its
own contained failure.

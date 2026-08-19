# apps/dashboard

The analytics/overview remote: KPI cards (active users, usage trend), an
activity-over-time chart, and a recent activity feed. Exposes one
component, `./App`, over Module Federation.

## Running it

Standalone, with no shell present — a remote is a portable application in
its own right, not something that only works composed:

```bash
pnpm --filter @enterprise-mfe/dashboard run dev    # http://localhost:3001
pnpm --filter @enterprise-mfe/dashboard run build
```

Composed inside the shell: run the command above alongside
`pnpm --filter @enterprise-mfe/shell run dev` (or just `pnpm dev` from the
repository root), then visit `http://localhost:3000/dashboard`. Its entry
in `apps/shell/src/internal/federation/remotes.dev.json` is what makes it
registrable.

## Structure

The same `src/exposed/` / `src/internal/` split every app in this repository
uses:

```text
src/
├── exposed/
│   └── App.tsx              # what the shell mounts ("dashboard/App"); also imports internal/styles.css — see below
├── internal/
│   ├── data/                 # the async data contract every domain surface reads from
│   ├── kpi/                   # KPI cards
│   ├── chart/                  # the activity chart (recharts)
│   ├── feed/                    # the recent activity feed
│   └── styles.css                # Tailwind entry, imports the design system's tokens
├── bootstrap.tsx             # standalone dev entry — supplies stand-in props
└── index.tsx                 # dynamic import('./bootstrap') — the MF async boundary
```

**Why `exposed/App.tsx` imports `styles.css` directly, not just
`bootstrap.tsx`**: when the shell loads this remote via federation, it
fetches only the chunks in `./App`'s own dependency graph — `bootstrap.tsx`'s
`main` chunk is never requested. Any future remote needs its exposed entry to
own this import too, or its own Tailwind classes generate no CSS at all when
composed (found the hard way — see the commit history for
`exposed/App.tsx`).

## The data contract

`internal/data/fetch-overview.ts` is a self-contained fixture, not a real
network call — this project has no backend by design. KPI cards, the chart,
and the feed all read from one shared `useDashboardOverview()` call in
`App.tsx`, not three independent fetches — so they move through loading and
error states together instead of tearing.

## The cross-remote update

Changing a user's role in [`apps/admin`](../admin/README.md) moves this
remote's "active users" KPI live — no reload, and no import between the two
remotes. This side of it is a single `bus.subscribe('user:role-changed', …)`
in `exposed/App.tsx`, which increments the count the last fetch returned
rather than recomputing it from admin's user list. This remote has no reason
to know that list exists.

The payload is validated before it is used. The publisher is a separately
built application, so its idea of the payload can differ from this one's —
the tests fire malformed payloads at it on purpose.

It works across browser tabs too, because the shell's bus relays over a
same-origin `BroadcastChannel`.

## Session

Arrives as the `session` prop, already resolved by the shell — this remote
mounts no provider and reads no shared module. That is what lets it move to
its own repository unchanged: nothing it needs is an import.

The standalone entry (`bootstrap.tsx`) supplies stand-ins from
`internal/standalone-host.ts`, since it has no shell to hand it any.

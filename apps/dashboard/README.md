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
├── bootstrap.tsx             # standalone dev entry — wraps App in its own <AuthProvider>
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
remotes. This side of it is a single `useEventSubscription` on
`'user:role-changed'` in `exposed/App.tsx`, which increments the count the
last fetch returned rather than recomputing it from admin's user list. This
remote has no reason to know that list exists.

It works across browser tabs too, because the bus relays over a same-origin
`BroadcastChannel`.

## Session

Reads the current session through `useAuth()` from `@enterprise-mfe/auth`
with **no dashboard-local `<AuthProvider>`** in `exposed/App.tsx` — when
composed inside the shell, this component renders inside the shell's own
provider, and the React context is shared because `@enterprise-mfe/auth` is
a Module Federation singleton. Only the standalone entry (`bootstrap.tsx`)
establishes its own session, since it has no shell ancestor to supply one.

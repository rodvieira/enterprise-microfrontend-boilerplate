# apps/admin

The users & permissions remote: a paginated, sortable user table and an
invite/edit modal, reachable only with the `users:write` permission.
Exposes one component, `./App`, over Module Federation.

Its role changes are this project's headline cross-remote proof: submitting
one publishes an event on the `bus` the shell passed in, which
[`apps/dashboard`](../dashboard/README.md) subscribes to, updating its
"active users" KPI live — no reload, no shared module, no direct import
between the two remotes.

## Running it

Standalone, with no shell present:

```bash
pnpm --filter @enterprise-mfe/admin run dev    # http://localhost:3002
pnpm --filter @enterprise-mfe/admin run build
```

Composed inside the shell: run the command above alongside
`pnpm --filter @enterprise-mfe/shell run dev` and
`pnpm --filter @enterprise-mfe/dashboard run dev` (or just `pnpm dev` from
the repository root), then visit `http://localhost:3000/admin`. Its entry
in the shell's `remotes.dev.json` is what makes it registrable — adding it
required no shell source change, because the shell already had the
route-patching mechanism this remote reuses unchanged.

## Structure

The same `src/exposed/` / `src/internal/` split every app in this
repository uses:

```text
src/
├── exposed/
│   └── App.tsx              # what the shell mounts ("admin/App"); also imports internal/styles.css — see apps/dashboard/README.md for why
├── internal/
│   ├── users/                # fixture data, pagination/sort state, the table, the invite/edit modal
│   ├── permissions/            # the local users:write check
│   ├── host-context.tsx        # makes the host's session and bus reachable without prop drilling
│   ├── ui/                      # this app's own components and design tokens
│   └── styles.css                # Tailwind entry, imports internal/ui/tokens.css
├── bootstrap.tsx             # standalone dev entry — supplies stand-in props
└── index.tsx                 # dynamic import('./bootstrap') — the MF async boundary
```

## User data

`internal/users/fixtures.ts` is a self-contained, in-memory fixture — 27
seeded users, mutated in place by `use-user-list.ts` — exactly like
`apps/dashboard`'s KPI/chart/feed data.
This project has no backend by design.

## Permission gating

The invite/edit action is reachable only when the session handed in by the
host carries `users:write`, checked locally in
`internal/permissions/use-can-write-users.ts`.

Kept local on purpose. Route-level protection is the orchestrator's job — it
owns the routes. What a remote gates *inside* its own screens is its own
business, and a remote in another repository has no way to extend the host's
`ProtectedRoute` anyway. Reading a permission off the session prop is
something any remote can do, in any repository.

## Session

Arrives as the `session` prop, already resolved by the shell — the same
pattern `apps/dashboard` uses, and the same one a remote in another
repository has available to it.

`exposed/App.tsx` puts `session` and `bus` into `internal/host-context.tsx`
so components several levels down reach them without threading props through
every layer. That context is this app's own: it never crosses the federation
boundary, so it stays valid wherever this app is built.

The standalone entry (`bootstrap.tsx`) supplies stand-ins from
`internal/standalone-host.ts`, since it has no shell to hand it any.

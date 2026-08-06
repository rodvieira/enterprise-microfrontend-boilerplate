# apps/admin

The users & permissions remote — the second micro-frontend remote
(ADR-0008's build order, ADR-0010's domain assignment): a paginated/sorted
user table and an invite/edit modal, reachable only with the `users:write`
permission. Exposes one component, `./App`, over Module Federation.

Its role changes are this project's headline cross-remote proof: submitting
one publishes an event through `packages/event-bus` that
[`apps/dashboard`](../dashboard/README.md) subscribes to, updating its
"active users" KPI live — no reload, no direct import between the two
remotes.

## Running it

Standalone, with no shell present:

```bash
pnpm --filter @enterprise-mfe/admin run dev    # http://localhost:3002
pnpm --filter @enterprise-mfe/admin run build
```

Composed inside the shell: run the command above alongside
`pnpm --filter @enterprise-mfe/shell run dev` and
`pnpm --filter @enterprise-mfe/dashboard run dev` (or just `pnpm dev` from
the repository root), then visit `http://localhost:3000/admin`. See
[the registry entry](../../specs/004-admin-remote/contracts/registry-entry.md)
for exactly what makes this remote registrable — registering it required no
shell source change, since `003-dashboard-remote` already built the
route-patching mechanism this remote reuses unchanged.

## Structure

The same `src/exposed/` / `src/internal/` split every app in this
repository uses (constitution Principle I):

```text
src/
├── exposed/
│   └── App.tsx              # what the shell mounts ("admin/App"); also imports internal/styles.css — see apps/dashboard/README.md for why
├── internal/
│   ├── users/                # fixture data, pagination/sort state, the table, the invite/edit modal
│   ├── permissions/            # the local users:write check — not a packages/auth contract change
│   └── styles.css                # Tailwind entry, imports the design system's tokens
├── bootstrap.tsx             # standalone dev entry — wraps App in its own <AuthProvider>
└── index.tsx                 # dynamic import('./bootstrap') — the MF async boundary
```

## User data

`internal/users/fixtures.ts` is a self-contained, in-memory fixture — 27
seeded users, mutated in place by `use-user-list.ts` — exactly like
`apps/dashboard`'s KPI/chart/feed data (`003-dashboard-remote` research D5).
This project has no backend by design.

## Permission gating

The invite/edit action is reachable only when the current session's
`user.permissions` includes `users:write`, checked locally
(`internal/permissions/use-can-write-users.ts`) rather than by extending
`packages/auth`'s `ProtectedRoute` — see `specs/004-admin-remote/research.md`
D4 for why this stayed a local, narrowly-scoped check instead of a shared
contract change.

## Session

Reads the current session through `useAuth()` with no admin-local
`<AuthProvider>` in `exposed/App.tsx` — the same pattern
`apps/dashboard` uses. Only the standalone entry (`bootstrap.tsx`)
establishes its own session.

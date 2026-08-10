# How to add a remote

There are two ways a remote comes to exist in this project:
`pnpm turbo gen remote` (the default, since sprint 7 — ADR-0008,
ADR-0014), or by hand, matching the same convention the generator itself
was extracted from (`apps/dashboard`, `apps/admin`). Use the generator
unless you have a specific reason not to; this doc covers both, because a
hand-built remote still has to match the generator's output exactly to
pass this project's guard rails.

## The default path: `pnpm turbo gen remote`

```bash
pnpm turbo gen remote
```

Prompts for output mode, remote name, route path, and label, validates
every answer before writing anything
([contracts/generator-contract.md](../specs/006-remote-generator/contracts/generator-contract.md)),
then produces one of two outputs:

- **Monorepo mode** — `apps/<name>`, workspace-linked, registered in
  `apps/shell/src/internal/federation/remotes.dev.json` and
  `docs/architecture.md`'s "Remotes" section automatically. From a clean
  install, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`,
  `pnpm check:boundaries`, and `pnpm check:shared-deps` all pass with zero
  manual edits.
- **Standalone mode** — an independent project outside this repository,
  whose `package.json` depends on `@enterprise-mfe/*` as published GitHub
  Packages instead of `workspace:*` — see
  `specs/006-remote-generator/research.md` D5 for what "published" requires
  before that project's own `pnpm install` can succeed.

Full walkthrough, including the three refusal paths (name collision,
reserved name, route collision) and standalone mode's install prerequisite:
[specs/006-remote-generator/quickstart.md](../specs/006-remote-generator/quickstart.md).

The generator itself only writes the **dev** registry
(`remotes.dev.json`) — never staging or production. Promoting a remote to
those environments is a deployment decision
([ADR-0012](decisions/0012-runtime-registry-fetch.md)), not a scaffolding
one; the generator's own console output says so explicitly every time it
runs.

## Adding one by hand: the convention it must still match

If you add a remote without the generator — or are checking whether an
existing one is still correct — it must match what `apps/dashboard` and
`apps/admin` already share (this is literally what the generator's own
templates are extracted from; see `specs/006-remote-generator/research.md`
D1 for the exact diff):

1. **`src/exposed/` / `src/internal/` split** (constitution Principle I).
   Only `src/exposed/App.tsx` is importable from outside the app — it's
   what `apps/shell`'s federation loader mounts as `"<name>/App"`. Every
   Tailwind class the exposed component (or anything it renders) uses must
   be reachable via `src/exposed/App.tsx`'s own `import '../internal/styles.css'`
   — not only through `bootstrap.tsx`'s standalone entry, which the shell
   never loads. Found the hard way building `apps/dashboard`'s activity
   chart: see `docs/architecture.md`'s "Remotes" section.
2. **`rspack.config.ts`'s `ModuleFederationPlugin`** exposes exactly
   `{ './App': './src/exposed/App.tsx' }` and declares the same `shared`
   singleton block every other remote does: `react`, `react-dom`,
   `react-router`, `@enterprise-mfe/auth`, `@enterprise-mfe/event-bus`. If
   your remote's name contains a hyphen (this project's own convention —
   `user-settings`, not `usersettings`), also set
   `library: { type: 'var', name: <name with hyphens replaced by underscores> }`
   — Module Federation's default library type needs a valid JS identifier,
   which a kebab-case name isn't (found running the generator's own output
   through a real `rspack build`; see ADR-0014).
3. **`package.json`**'s shared singleton versions
   (`react`, `react-dom`, `react-router`, `@enterprise-mfe/auth`,
   `@enterprise-mfe/event-bus`) must exactly match what every other
   app/package already declares — `pnpm check:shared-deps`
   (`scripts/check-shared-deps.ts`) fails the build otherwise, per
   constitution Principle III. Copy the exact version strings from
   `apps/dashboard/package.json` rather than guessing.
4. **Register it in `apps/shell/src/internal/federation/remotes.dev.json`**
   — `name`, `entry` (its `mf-manifest.json` URL), `routePath`, `label` —
   alongside the existing entries, not replacing them. Pick a route path
   that doesn't collide with `HOST_OWNED_ROUTE_PATHS`
   (`apps/shell/src/internal/routes/remote-routes.tsx`) or any existing
   remote's `routePath`.
5. **Add one line to `docs/architecture.md`'s "Remotes" section**, matching
   its existing prose style — per `CLAUDE.md`'s own rule, "every new
   package or app needs an entry in the relevant `docs/` file, not just
   code."
6. **Declare every package you import** in the remote's own `package.json`
   — `pnpm check:boundaries`'s `no-undeclared-dependencies` rule
   (`.dependency-cruiser.js`) fails otherwise, since this repository's
   hoisted `node_modules` (ADR-0011) would otherwise let an undeclared
   import resolve locally and break only once the remote is extracted to
   its own repository.

Run `pnpm check:boundaries` and `pnpm check:shared-deps` immediately after
— both must pass with zero edits, the same bar the generator's own output
is held to (`specs/006-remote-generator/spec.md`'s User Story 2).

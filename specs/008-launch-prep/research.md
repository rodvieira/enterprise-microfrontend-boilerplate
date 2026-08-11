# Phase 0 Research: Launch Prep

## D1 — Deploy documentation: host-agnostic mechanism, not a provider's dashboard steps

**Decision**: `docs/how-to-deploy.md` documents the real, existing
mechanism — confirmed directly against the code, not written from memory:

- Each app (`apps/shell`, `apps/dashboard`, `apps/admin`, or any generated
  remote) builds independently: `pnpm --filter <name> run build` (or
  `pnpm build` for all). Each `rspack.config.ts` already produces static
  assets with `publicPath: 'auto'` — no server-side rendering, no runtime
  dependency on anything but a static file host.
- `apps/shell`'s build additionally selects one of three registry files
  via `FEDERATION_ENV` (`resolveRegistrySourcePath`,
  `apps/shell/rspack.config.ts`), copying it to `dist/remotes.json` —
  confirmed by re-running `FEDERATION_ENV=production pnpm --filter
  @enterprise-mfe/shell run build` and inspecting the output directly
  (research D1 in `007-docs-security` already established this same
  mechanism for the CSP; this sprint re-confirms it for deploy purposes).
- **`remotes.staging.json` and `remotes.production.json` currently
  contain empty `remotes` arrays** — verified by reading the files
  directly, not assumed. Deploying the shell today, in either environment,
  composes nothing until a maintainer adds real entries pointing at real
  deployed remote URLs.

**Rationale**: This project has never committed to a specific static host
— confirmed by `007-docs-security` research D1's own reasoning for why the
CSP is a `<meta>` tag rather than an HTTP header (no server-side config
this repo controls). Documenting one provider's exact dashboard clicks
would go stale independently of this codebase and would be wrong for every
adopter using a different host. The mechanism (`FEDERATION_ENV`,
independent per-app builds, registry file updates) is what's actually
portable and durable.

**Alternatives considered**: A guide for one specific host (Vercel,
Netlify, GitHub Pages) — rejected for the reason above; a short "any
static host works, here's what changes per environment" note is more
useful and doesn't need updating when hosting trends shift.

## D2 — The technical post's real, verified details

**Decision**: The post (`docs/posts/exposed-internal-boundary.md`) draws
its concrete evidence directly from this project's own commit-visible
history and current source, not generic micro-frontend advice:

1. **The dependency-cruiser rule that was wrong until a real second app
   existed to catch it** — confirmed verbatim in `.dependency-cruiser.js`'s
   own comment on `no-cross-app-reaching-into-internal`: the original,
   single-rule form flagged an app importing its *own* `internal/`,
   because dependency-cruiser's `from`/`to` `pathNot` backreference syntax
   can only be defined in `from` and read in `to` — found "the first time
   a real app existed to check against," never caught before because
   nothing under `apps/` existed yet to trip it.
2. **The Tailwind chunk-loading gotcha** — confirmed in
   `docs/architecture.md`'s "Remotes" section and
   `apps/dashboard/src/exposed/App.tsx`'s own comment: a remote's
   `src/exposed/` entry must import its own stylesheet directly, because
   when the shell loads a remote via Module Federation it fetches only the
   chunks reachable from the exposed module's own dependency graph — a
   standalone `bootstrap.tsx`-only stylesheet import is never requested,
   collapsing the remote's own Tailwind classes to no generated CSS at all
   once composed. Found building `apps/dashboard`'s activity chart.
3. **`ADR-0008`'s own build-order discipline** — the generator
   (`pnpm turbo gen remote`) was deliberately built *after* both
   `apps/dashboard` and `apps/admin` existed, extracted from what they
   actually turned out to share (research D1 in `006-remote-generator`),
   rather than designed from the blueprint's original sketch — a concrete
   example of the exposed/internal convention being something discovered
   and hardened through two real implementations, not decreed once and
   assumed correct.

**Rationale**: A post about an architectural convention is more credible
and more useful with real "found this the hard way" detail than with
generic best-practice prose — matching this project's own established
documentation voice (visible throughout `docs/decisions/` and
`docs/architecture.md`).

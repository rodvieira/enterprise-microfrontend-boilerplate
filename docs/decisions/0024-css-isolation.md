# 0024 — Every app ships its own Tailwind; version agreement is the guard, not isolation

**Status:** Accepted

## Context

Nothing in this repository had ever stated a position on CSS across
remotes, which made it the most visible gap in the ADR set. Each app —
shell, dashboard, admin — independently does:

```css
@import "tailwindcss";
@import "@enterprise-mfe/ui/styles.css";
```

Measured against a real production build of this repository:

| App | Emitted CSS | Preflight present |
|---|---:|---|
| shell | 24 KB | yes |
| dashboard | 24 KB | yes |
| admin | 24 KB | yes |

A page composing both remotes therefore carries roughly **72 KB of CSS
where 24 KB would do**, and applies the Tailwind preflight three times.

Today that is waste, not breakage: all three declare `tailwindcss@^4.3.3`,
so the three resets are byte-identical and applying them repeatedly is
idempotent. The real hazard is what independent deployment makes possible
— dashboard on Tailwind 4.3 and admin on 4.5, shipped weeks apart by
different teams. Their preflights differ, whichever loads last wins, and
base elements across the whole composed page quietly restyle. Nothing
fails, nothing logs, and there is no obvious thing to grep for.

## Decision

**Keep per-app Tailwind. Guard the version instead of isolating the CSS.**

`tailwindcss` and `@tailwindcss/postcss` are added to
`scripts/check-shared-deps.ts`'s list, which until now held only
runtime-shared packages. They are build-time dependencies, and they are
there for exactly the same reason the others are: a version mismatch does
not fail the build, it fails silently once the artifacts are composed.

The duplication itself is accepted. It costs bytes, not correctness, and
the alternatives all cost more than the bytes are worth — see below.

## Why not the obvious fix

The obvious fix is to let only the shell ship preflight and have remotes
import utilities alone:

```css
/* a remote, hypothetically */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

**This breaks ADR-0007.** A remote must render correctly on its own — that
standalone-parity guarantee is what lets any remote move to its own
repository, and it is exercised by every generated standalone project. A
remote with no preflight is styled correctly only when composed inside
this particular shell, which converts an independent application into a
fragment that merely looks independent. Recovering both would mean two CSS
entry points per remote, one federated and one standalone, and the one
nobody runs locally is the one that breaks.

CSS `@layer` ordering was also considered. It solves precedence — which
rule wins when two remotes disagree — but not duplication, since every
layer still contains its own copy of preflight. Precedence has not been an
observed problem here; duplication and drift are the real ones, and layers
address the wrong half.

## Consequences

- A composed page carries one preflight per app. On this repository's own
  deployment that is ~48 KB of redundant uncompressed CSS, most of which
  compresses away and all of which is cached per remote.
- Upgrading Tailwind is now a coordinated change across every app in one
  commit — `pnpm check:shared-deps` fails the build otherwise. That is the
  intended cost: the alternative is finding out from a screenshot.
- `tailwindcss` was already in the generator's `REQUIRED_TOOL_VERSIONS`,
  so a generated remote already inherits the source manifest's version.
  This decision makes that property enforced rather than incidental.
- The check's list now mixes runtime-shared packages with build-time ones.
  The entry carries a comment saying why, because the distinction matters
  when adding the next one.

## Related

`docs/decisions/0007-monorepo-and-standalone-parity.md` — the guarantee
that rules out preflight-in-the-shell-only.
`docs/decisions/0004-react-typescript-tailwind.md` — where Tailwind was
chosen. `scripts/check-shared-deps.ts`.

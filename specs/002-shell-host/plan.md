# Implementation Plan: Shell Host

**Branch**: `002-shell-host` | **Date**: 2026-08-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-shell-host/spec.md`

## Summary

Build `apps/shell` — the first application in the repository — as a Module
Federation host on Rspack, plus `@enterprise-mfe/federation-utils`, the shared
loading utility that keeps a broken remote from taking down the application.

Two decisions carry the sprint. The registry is **fetched at runtime** rather than
compiled in, so one build serves all three environments and "switching
environment is switching a file" is literally true (research D3). And
`federation-utils` **takes a loader function** rather than importing the
federation runtime, which is what allows every failure mode in US3 to be tested
this sprint, against simulated remotes, before any remote exists (D5).

This is also the sprint where two guard rails stop being theoretical: the
boundary gate gets its first `apps/` directory to inspect (issue #2), and
`tokens.css` gets compiled by a real bundler for the first time (issue #4).

## Technical Context

**Language/Version**: TypeScript 5.9, strict; React 19.2.8

**Primary Dependencies**: `@rspack/core` + `@rspack/cli` 2.1.7, `@module-federation/enhanced` 2.8.1, `tailwindcss` + `@tailwindcss/postcss` 4.3.3, `postcss` 8.5.25, `postcss-loader` 8.2.1, `react-router` 8.3.0 — each justified in the pull request per Principle IX

**Storage**: N/A. The registry is a fetched static file; nothing is persisted.

**Testing**: Vitest against simulated remotes. No Playwright this sprint (D7).

**Target Platform**: Evergreen browsers; Node 22.22.2+ for tooling

**Project Type**: Monorepo — first application (`apps/shell`) plus one new shared package

**Performance Goals**: The host frame renders without waiting for the registry fetch. No remote-loading performance target, since there is no remote to measure.

**Constraints**: One build must serve all three environments (D3). `federation-utils` must not depend on a bundler or the MF runtime (D5). The host must render with an empty registry. Under ADR-0011's hoisted layout, every imported package must be declared in the importing package's own manifest.

**Scale/Scope**: 1 app, 1 new package, 3 registry files, 4 simulated failure modes, ~35 test cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | **Yes, first time** | ✅ | `apps/shell/src` splits into `exposed/` and `internal/` exactly as a remote will (D8). The host exposes nothing over federation today; the empty `exposes` map carries a comment saying so, because otherwise it reads as an oversight. |
| II — No Cross-App Relative Imports | **Yes, first time enforceable** | ✅ | Only one app exists, so there is nothing to import across — but the gate gains its first `apps/` directory and must be **proved able to fail** before this work is done (issue #2, `FR-020`). |
| III — Singleton Shared Dependencies | Yes | ✅ | `react`, `react-dom`, `@enterprise-mfe/auth` and now `react-router` are MF `shared` singletons. `react-router` is added to `SINGLETONS` in `scripts/check-shared-deps.ts` in this sprint — it holds context consumed by more than one app, which is exactly the trigger the principle names (D6). |
| IV — Conventions Documented, Never Assumed | Yes | ✅ | The registry format is documented as a contract a team can follow without reading host source (`FR-010`). The shell's folder layout is documented as ours, not as a Module Federation requirement. |
| V — Generator After Two Remotes | No | ✅ | No generator work. This is sprint 3; the generator is sprint 7. |
| VI — Auth Is a Contract, Not an Implementation | Yes | ✅ | The shell consumes `useAuth()` and `<ProtectedRoute>` and adds no login flow. The stub keeps working with zero configuration. |
| VII — Decisions Superseded, Never Rewritten | Yes | ⚠️ | No ADR is edited. **Two new ADRs are expected from this sprint** — see below. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Scopes `shell` and `federation-utils` are already in the `commitlint.config.mjs` allow-list. |
| IX — Every Dependency Justified | Yes | ✅ | Seven new dependencies, each with a one-line justification. `react-router` is the one that needed a real argument rather than a label — recorded in D6. |

**Gate result: PASS.** No violation requires justification, so Complexity Tracking
stays empty.

**Two ADRs this sprint is expected to produce** (Principle VII — recorded now so
they are not forgotten under delivery pressure):

1. **Runtime registry fetch (D3).** "One build, three deployments" is an
   architectural decision that outlives this sprint and is not currently in
   `docs/decisions/`. It deserves its own record whether or not anything changes.
2. **A Tailwind fallback, only if needed (D2).** If v4 cannot be made to work
   under Rspack, moving to a v3 preset requires a new ADR. It supersedes nothing —
   ADR-0002 decided the bundler, not the Tailwind major.

## Project Structure

### Documentation (this feature)

```text
specs/002-shell-host/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — decisions D1–D9
├── data-model.md        # Phase 1 — registry, registration, origin decision, load state
├── quickstart.md        # Phase 1 — how to validate
├── contracts/           # Phase 1
│   ├── registry-contract.md
│   └── federation-utils-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/shell/
├── src/
│   ├── exposed/
│   │   └── App.tsx                  # what bootstrap mounts; the host exposes nothing over federation
│   ├── internal/
│   │   ├── federation/
│   │   │   ├── manifest.ts          # fetch + validate remotes.json
│   │   │   ├── origin-guard.ts      # the allow-list and transport rules
│   │   │   ├── register.ts          # MF2 registerRemotes, after validation
│   │   │   ├── loader.ts            # the federation-specific RemoteLoader
│   │   │   ├── types.ts             # RemoteRegistry, RemoteRegistration
│   │   │   ├── remotes.dev.json
│   │   │   ├── remotes.staging.json
│   │   │   └── remotes.production.json
│   │   ├── routes/
│   │   │   └── remote-routes.tsx    # route path → remote, host-owned (D9)
│   │   ├── chrome/                  # frame built from @enterprise-mfe/ui
│   │   └── styles.css               # imports tokens.css, declares @source
│   ├── bootstrap.tsx
│   └── index.tsx
├── tests/
├── rspack.config.ts                 # host config; exposes map deliberately empty
├── federation.config.ts
├── index.html
├── package.json
├── tsconfig.json
└── README.md

packages/federation-utils/
├── src/
│   ├── index.ts
│   ├── use-remote.ts                # loader-driven, bundler-agnostic (D5)
│   └── remote-boundary.tsx          # class component; React has no hook equivalent
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

**Structure Decision**: `apps/shell` takes the same `exposed/` + `internal/`
shape a remote will, because it is the structural template sprint 4 copies. All
federation wiring lives under `internal/federation/` — the registry is not
importable from outside the app, which is what stops a future remote from
learning about its siblings.

The registry JSON files live in `src/internal/federation/` rather than a
top-level `config/` so that the boundary rules cover them like any other source,
and the build copies the selected one to `dist/remotes.json`.

**Build order within the feature**:

1. `packages/federation-utils` — loader-driven, testable with no bundler; unblocks the shell and carries US3
2. `apps/shell` scaffolding — Rspack, MF host config, an app that renders "hello"
3. **Tailwind pipeline (issue #4)** — prove `tokens.css` compiles before building any chrome on top of it
4. The frame — layout, navigation, session, from `@enterprise-mfe/ui` and `@enterprise-mfe/auth`
5. Registry: types, fetch, validation, error reporting
6. Origin guard, then `registerRemotes` wiring behind it
7. Routes and the remote region, using `useRemote` + `RemoteBoundary`
8. **Guard rails (issue #2)** — restore `apps` to the boundary gate, prove it fails, add `react-router` to the drift check
9. Documentation and the two ADRs

Step 3 is deliberately early. Discovering the styling pipeline is broken after
building the whole frame on top of it is the expensive order.

## Complexity Tracking

No constitutional violations. Nothing to justify.

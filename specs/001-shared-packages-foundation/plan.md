# Implementation Plan: Shared Packages Foundation

**Branch**: `001-shared-packages-foundation` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-shared-packages-foundation/spec.md`

## Summary

Create the five foundational packages of the workspace — shared TypeScript
config, shared lint config, shared type contracts, a real design system, and the
auth contract with an in-memory stub — plus the two pieces of repository
infrastructure they depend on: a unit test runner wired at the root, and
`scripts/check-shared-deps.ts`, the singleton drift gate that Principle III
requires and that `pnpm check:shared-deps` currently fails for want of.

The approach is deliberately unglamorous: packages ship TypeScript source with no
build step (research D1), the design system carries zero runtime dependencies
(D3), and every shared rule is inherited by `extends` rather than copied (D6).
Nothing in this feature touches a bundler, federation, or an app.

## Technical Context

**Language/Version**: TypeScript 5.9 (root pins `^5.7.2`), strict mode — research D8

**Primary Dependencies**: React 19.2.8 and ReactDOM 19.2.8 as peer dependencies in `ui` and `auth` (D7); Tailwind CSS 4.3.3 for the design system (D2). No runtime dependency is added to any package.

**New development dependencies (root)**: `vitest@4.1.10`, `@vitejs/plugin-react@6.0.5`, `jsdom@30.0.1`, `@testing-library/react@16.3.2` — each justified in the pull request per Principle IX (D4)

**Storage**: N/A — no persistence in this feature. The auth stub is in-memory and clears on reload, by design (Principle VI)

**Testing**: Vitest 4 with one root config using `test.projects: ['packages/*']`; `@testing-library/react` over jsdom for component and keyboard tests (D4)

**Target Platform**: Evergreen browsers, per the blueprint's explicit non-goals. Node 20+ for tooling

**Project Type**: Monorepo library packages — no application, no service, no browser-runnable artifact in this feature

**Performance Goals**: Full test suite under 60 seconds from one command (SC-005). No runtime performance target — these packages have no measurable runtime surface until an app renders them

**Constraints**: No bundler dependency, no federation configuration, no dependency on any app (FR-023). Zero runtime dependencies in `packages/ui` (D3). Packages consumed as source, no build step (D1)

**Scale/Scope**: 5 packages, 7 design-system components, 1 auth contract with 3 exports, 5 shared types, 1 gate script. Roughly 30 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against all nine principles in `.specify/memory/constitution.md`.

| Principle | Applies | Status | How this plan satisfies it |
|---|---|---|---|
| I — Exposed/Internal Boundary | No | N/A | Applies to apps under `apps/*`. No app is created here. Packages use a single public entry (`src/index.ts`) as the equivalent discipline (D6). |
| II — No Cross-App Relative Imports | Partially | ✅ | No app exists to import across. The plan does make `pnpm check:boundaries` functional for the first time by creating `packages/config-typescript/tsconfig.base.json`, the path `.dependency-cruiser.js` already points at. |
| III — Singleton Shared Dependencies | Yes | ✅ | `scripts/check-shared-deps.ts` is built in this feature and registers `@enterprise-mfe/auth` from day one (FR-012). React is a peer dependency everywhere (D7), so pnpm cannot install a second copy. |
| IV — Conventions Documented, Never Assumed | Yes | ✅ | Every package ships a README (FR-019); the catalog entry and the contracts live in `specs/001-shared-packages-foundation/contracts/`. No convention is introduced without being written down. |
| V — Generator After Two Remotes | No | ✅ | No generator work. This feature is sprint 2; the generator is sprint 7. |
| VI — Auth Is a Contract, Not an Implementation | Yes | ✅ | `packages/auth` ships `useAuth()`, `<AuthProvider>`, `<ProtectedRoute>` over an in-memory stub. No OIDC, no network, no environment variable (D9, FR-008). |
| VII — Decisions Superseded, Never Rewritten | Yes | ✅ | No existing ADR is edited. Two decisions in this plan touch ADR territory and are flagged below rather than quietly absorbed. |
| VIII — Conventional Commits, English Only | Yes | ✅ | Commits scoped per package using the allow-list already in `commitlint.config.mjs`: `config-typescript`, `config-biome`, `shared-types`, `ui`, `auth`, `repo`. |
| IX — Every Dependency Justified | Yes | ✅ | Four new root devDependencies, each with a one-line justification (D4). Zero new runtime dependencies — `packages/ui` deliberately hand-rolls what a component library would provide (D3). |

**Gate result: PASS.** No violation requires justification, so Complexity
Tracking below stays empty.

**Two items for the record, neither a violation:**

1. Research D2 selects Tailwind CSS v4 with CSS-first tokens. ADR-0002 described
   Tailwind's Rspack support as PostCSS-based, which was the v3 integration. That
   ADR decided the *bundler*, not the Tailwind major, so this is not a
   contradiction — but if sprint 3 hits a v4/Rspack problem, Principle VII
   requires a new ADR recording the fallback, not an edit to ADR-0002.
2. Research D8 keeps TypeScript on 5.x while 7.x is published. Moving majors is
   its own decision with its own ADR, not a side effect of creating a shared
   tsconfig.

## Project Structure

### Documentation (this feature)

```text
specs/001-shared-packages-foundation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — decisions D1–D9
├── data-model.md        # Phase 1 output — User, Role, Permission, Session
├── quickstart.md        # Phase 1 output — how to validate the feature
├── contracts/           # Phase 1 output
│   ├── auth-contract.md
│   ├── ui-contract.md
│   └── config-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/
├── config-typescript/
│   ├── tsconfig.base.json      # ← .dependency-cruiser.js already points here
│   ├── tsconfig.react.json
│   ├── package.json
│   └── README.md
├── config-biome/
│   ├── biome.json
│   ├── package.json
│   └── README.md
├── shared-types/
│   ├── src/
│   │   ├── index.ts
│   │   ├── user.ts             # User, Role, Permission, ROLE_PERMISSIONS
│   │   └── component.ts        # RemoteAppProps, WithClassName
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── ui/
│   ├── src/
│   │   ├── index.ts
│   │   ├── components/         # Button, Input, Modal, Table, Toast, Layout, Nav
│   │   ├── hooks/              # useToast, focus management
│   │   ├── styles/tokens.css   # Tailwind v4 @theme block
│   │   └── utils/cx.ts         # ~10-line class composition helper
│   ├── tests/                  # one file per component
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── auth/
    ├── src/
    │   ├── index.ts            # the only public entry
    │   ├── context.tsx         # AuthProvider, useAuth
    │   ├── protected-route.tsx
    │   └── stub.ts             # in-memory user — the swappable part
    ├── tests/
    ├── package.json
    ├── tsconfig.json
    └── README.md

scripts/
└── check-shared-deps.ts        # the Principle III gate

vitest.config.ts                # root, test.projects: ['packages/*']
```

**Structure Decision**: Flat `packages/*`, matching `pnpm-workspace.yaml` as it
already stands — no nesting or grouping folders, because the workspace glob is
already committed and every tool in the repo (`turbo`, `dependency-cruiser`,
Biome) is configured against that shape. Each package exposes exactly one public
entry point, `src/index.ts`; the config packages expose config files instead,
since they are consumed by `extends` rather than by `import`. Tests live beside
the package they cover, not in a central tests tree, so a package stays
self-contained when ADR-0007's standalone mode eventually extracts one.

**Build order within the feature** (dependency order, and the order the tasks
should follow):

1. `config-typescript` — unblocks `pnpm check:boundaries` and everything else
2. `config-biome` — no dependents, but pairs with the above
3. Root test wiring — `vitest.config.ts` and the four devDependencies
4. `shared-types` — depended on by `auth` and `ui`
5. `ui` — the largest unit of work, and the one User Story 1 rests on
6. `auth` — depends on `shared-types`
7. `scripts/check-shared-deps.ts` — needs the packages to exist to have something
   to check, and must be verified by deliberately breaking it (quickstart §5)
8. Documentation — package READMEs and the docs entry required by FR-019

## Complexity Tracking

No constitutional violations. Nothing to justify.

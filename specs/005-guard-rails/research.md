# Phase 0 Research: Guard Rails

**Feature**: `005-guard-rails` | **Date**: 2026-08-06

---

## D1 — "Genuinely unreachable" via browser-level network interception, not stopping a process

**Decision**: The real remote-load failure (`US1`) is produced with Playwright's
`page.route(url, route => route.abort())`, targeting one remote's
`mf-manifest.json` (and `remoteEntry.js`) specifically, rather than stopping
that remote's dev server process.

**Rationale**: `spec.md`'s own Assumptions guessed "stopping a dev server or
misconfiguring its port" — reasonable before the test design was actually
worked out, wrong once it was. `apps/shell/playwright.config.ts` runs
`fullyParallel: true` against **shared** dev servers for the whole test
run (`webServer` starts them once, `reuseExistingServer` keeps them up
across the suite). Killing a real process mid-test would break every other
test running concurrently against that same server — the opposite of
"contained." `page.route(...).abort()` fails the *specific request* only
for the *specific page* that registered it, which is what makes it safe to
run alongside `dashboard-composition.spec.ts` and `admin-composition.spec.ts`
in the same parallel run.

This is not a weaker substitute for "real" — the browser's actual `fetch()`
call genuinely fails (a real `net::ERR_FAILED`, the same class of error a
truly-down server produces), exercising the identical code path
(`createFederationLoader` → `loadRemote` → rejection → `useRemote`'s
`failed` state) a real network outage would. What changes is *where* the
failure is injected (network layer, per-page) rather than *what* the
application observes.

**Alternatives considered**: orchestrating `stop`/`restart` of a real dev
server process from within a test (rejected — global `webServer` lifecycle
in Playwright is shared across the whole run, and `fullyParallel` makes
per-test process management actively hazardous to other tests); pointing a
*second*, dedicated registry entry at a deliberately-wrong port (rejected —
would require a fourth environment-like registry variant just for this one
test, more moving parts than the interception approach for the same proof).

**Consequences**: `spec.md`'s Assumptions section is superseded by this
decision for the *how*; the *what* it promises (a real, not simulated,
unreachable remote) is unchanged and, if anything, more precisely true.

---

## D2 — CI installs only the Chromium browser, not the full Playwright browser matrix

**Decision**: `npx playwright install --with-deps chromium` in the CI job,
matching `playwright.config.ts`'s implicit default project (no `projects`
array is currently defined, so Playwright uses its default Chromium-only
project).

**Rationale**: Installing Firefox and WebKit as well would cost real CI
minutes for browsers nothing in this project's config currently exercises.
If a future sprint adds cross-browser projects to `playwright.config.ts`,
this line grows with it — not before.

**Consequences**: `--with-deps` (installs the OS-level libraries Chromium
needs on a bare `ubuntu-latest` runner) is required in CI specifically;
local developer machines typically already have these, which is why local
`npx playwright install chromium` (no `--with-deps`) was sufficient when
this suite was first built in `003-dashboard-remote`.

---

## D3 — One new CI step, not a second workflow

**Decision**: `pnpm e2e` is added as one more `step` in the existing
`quality` job in `.github/workflows/ci.yml`, after `Shared deps drift
check`, before `Security audit`.

**Rationale**: All seven gates (`CLAUDE.md`'s documented set) are one
project-wide quality bar — running them in one job keeps the "did this PR
pass everything" question answerable from one job's pass/fail, matching how
`pnpm build` already runs before `pnpm test` and `pnpm check:boundaries` in
the same job today. A separate `e2e` job would need its own
checkout/install/build steps duplicated, for no isolation benefit this
project currently needs.

**Alternatives considered**: a separate `e2e` job running in parallel with
`quality` (rejected for now — real isolation benefit, primarily faster
feedback via parallelism, but adds workflow complexity this project's
current CI runtime doesn't yet justify; worth revisiting if the combined
job's runtime becomes a real developer-experience problem).

**Consequences**: A broken e2e scenario makes the whole `quality` job red,
the same visibility every other gate already has. CI runtime grows by
however long `pnpm e2e`'s three dev-server boot + 9 scenarios take
(commonly under 15 seconds locally; CI runners are typically slower, but
this is not expected to be the pipeline's bottleneck step).

---

## D4 — The closing record is a new ADR, `0013-guard-rails-closed.md`

**Decision**: A new ADR, not an edit to ADR-0007 or ADR-0008 (constitution
Principle VII), stating: the three constitution-named guard rails were
already complete before this sprint (with pointers to `002-shell-host`,
`003-dashboard-remote`, `004-admin-remote`), what this sprint added (D1–D3
above), and that blueprint's "standalone-repo parity" is deferred to
sprint 7's generator per ADR-0007 — a recorded consequence, not a forgotten
item.

**Rationale**: `002-shell-host` and `004-admin-remote` both closed with a
record for exactly this reason — a future reader (or the next sprint's
first action) should not need to reconstruct, from commit history, whether
a phase actually finished. This sprint has no other natural home for that
statement, since it delivers no new package or app of its own.

**Consequences**: `docs/decisions/` gains one file. No existing ADR is
edited.

---

## No data-model.md or contracts/ for this feature

This sprint introduces no new domain entity, no new package, and no new
public API surface — its deliverables are a CI workflow step, one e2e test
file, and a decision record. `data-model.md` and `contracts/` are skipped
per the plan template's own guidance ("skip if project is purely internal"
applied here to "this specific feature has no new interface to document").

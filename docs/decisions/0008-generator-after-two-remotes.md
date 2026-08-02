# 0008 — Generator built after two real remotes exist, not before

**Status:** Accepted

## Context

The scaffolding generator (`pnpm turbo gen remote`) needs to encode what every
remote in this project has in common. Designing that abstraction before any
real remote exists risks guessing wrong — the second remote often reveals a
requirement the first one didn't have.

## Decision

Build `apps/dashboard` and `apps/admin` by hand first. Only after both exist
and work end-to-end, extract the common pattern into the generator.

## Consequences

The build order (see `docs/blueprint.html` §15) places the generator in sprint
7, after both example remotes are done in sprints 4-5. If asked to build the
generator earlier, this ADR is the reason to push back — not arbitrary
sequencing.

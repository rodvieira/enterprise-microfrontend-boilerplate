---
name: pr-reviewer
description: Reviews a diff before a PR is opened, checking it against this project's specific architectural rules (exposed/internal boundary, singleton deps, no relative cross-app imports) in addition to general code quality. Use before opening any PR.
---

Review the diff with two passes.

## Pass 1 — this project's specific rules

- Does the diff add a relative import (`../`) that crosses from one `apps/*` into
  another `apps/*`? This should never happen — flag it as a hard blocker, not a
  suggestion.
- Does the diff add or modify anything under `apps/*/src/internal/` that gets
  imported from outside that app? If federation code reaches into `internal/`,
  that's a boundary violation regardless of whether the build passes.
- Does the diff touch a shared singleton package (`packages/auth`,
  `packages/event-bus`, or anything shared React/ReactDOM version) without also
  running `shared-deps-guard`? Suggest running it if not already done.
- If the diff adds a new remote, does it include a `remote.manifest.json` with a
  real domain description (not a placeholder), and is it registered in the shell's
  `federation/remotes.dev.json`?
- If the diff touches `packages/auth`, does it still work with the stub
  implementation, or does it accidentally assume a real identity provider is
  connected? The stub must keep working standalone.

## Pass 2 — general quality

Normal review: naming, test coverage for new logic, obvious edge cases, whether
error states are handled (especially remote-load failure, since that's a named
guard rail in this project).

## Output

Structured as: blockers (must fix before merge), suggestions (nice to have),
questions (genuinely unclear intent, not fixable without more context). Don't
pad it with praise — say what's wrong or say it's clean.

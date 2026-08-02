---
name: commit-crafter
description: Writes a Conventional Commits message from staged changes, with the correct scope for this monorepo (app or package name). Use before committing when the person hasn't written a commit message themselves.
---

Look at `git diff --staged` and produce one Conventional Commits message.

## Scope rules for this monorepo

- Changes inside `apps/shell` → scope `shell`
- Changes inside `apps/dashboard` → scope `dashboard`
- Changes inside `apps/admin` → scope `admin`
- Changes inside `packages/<name>` → scope matching `<name>` (e.g. `auth`, `ui`,
  `event-bus`)
- Changes touching more than one app/package, or root config (`turbo.json`,
  `pnpm-workspace.yaml`, CI) → no scope, or scope `repo` if it reads better
- Changes only in `docs/` → scope `docs`
- Changes only in `.claude/` → scope `claude`

## Type rules

Standard Conventional Commits types (`feat`, `fix`, `refactor`, `test`, `docs`,
`chore`, `ci`). If the diff adds or changes an ADR in `docs/decisions/`, always use
`docs` even if the underlying code also changed in the same commit — split into
two commits if that's not true.

## Output

Just the commit message, ready to use with `git commit -m "..."`. No explanation
unless the scope or type was ambiguous enough to need one — in that case, one
short line after the message explaining the call.

# 0021 — `pnpm eject` is the supported adoption path; the example remotes stay

**Status:** Accepted

## Context

This boilerplate is meant to be adopted by companies as the base of their
own platform. Nothing supported that:

- `@enterprise-mfe` was hardcoded across 149 files, and the project's own
  name was the root package name, the shell's `<title>`, and the text in
  the shell's visible header — branding whatever the adopter shipped.
- `apps/dashboard` and `apps/admin` are examples, not something anyone
  ships, but removing them broke the generator outright:
  `shared-versions.ts` read `apps/dashboard/package.json` literally and
  the generator refused to start unless both existed.

The obvious-sounding alternative — delete the example remotes from this
repository and keep a separate showcase repo — was rejected. Two working
remotes are 24% of the source but carry the whole argument: the second
remote is what proves a convention generalizes rather than merely
happening to work once (ADR-0008 builds the generator *from* them), and
the guard rails need more than one app to guard —
`check:shared-deps` compares singleton ranges *across* apps and
`check:boundaries`'s cross-app rules are vacuous with a single app. A
boilerplate whose examples were deleted is indistinguishable from every
other starter.

So the examples stay, and the adopter removes them — once, deliberately,
with a command.

## Decision

`pnpm eject --scope @acme --first-remote payments` rewrites the
repository in place: renames the npm scope and the project name,
scaffolds the company's first real remote, removes the two examples,
resets the registries, rewrites every config that named the removed apps,
and deletes the artifacts of *this* project's build process (`specs/`,
`.specify/`, `docs/decisions/`, `blueprint.html`). It runs once and then
deletes itself.

Two ordering constraints are load-bearing:

1. The first remote is generated **before** the examples are removed —
   otherwise the generator has no manifest to read shared versions from.
2. `remotes.dev.json` is emptied **before** generating, so `nextDevPort`
   assigns the new remote 3001 instead of 3003 with two unexplained gaps
   below it.

It refuses to run on a dirty working tree: `git reset --hard` is the
undo, and that only works from a clean one.

## It is deliberately partial

The eject does not rewrite prose. `docs/architecture.md` narrates the
example remotes across whole paragraphs; no regex turns that into a
description of someone else's platform, and one that tried would produce
confident nonsense. Only bounded, mechanically-safe forms are rewritten
(parenthetical ADR citations, config entries, identifiers). Everything
else is reported in a generated `EJECT-TODO.md` as `file:line`, alongside
the follow-ups a script should not decide: renaming the repository,
resetting git history, pointing `publishConfig` at their registry.

Every transform throws rather than silently returning its input, so a
regex that stops matching after an upstream edit fails loudly instead of
handing someone a half-renamed repository.

## Consequences

- The generator is no longer coupled to the example remotes by name.
  `resolveSourceManifest()` finds any remote under `apps/` declaring the
  full singleton set, sorted for determinism. This is a fix in its own
  right: a correct checkout whose remotes happened to be named something
  else previously failed the generator's own precondition.
- Ejecting is one-way within a checkout. The undo is git, which is why the
  clean-tree precondition is not negotiable.
- The eject deletes `docs/decisions/`, so an adopter starts without this
  project's ADR history. `EJECT-TODO.md` says so and recommends keeping
  the habit.

## Related

`scripts/eject.ts`, `scripts/eject/transforms.ts`.
`docs/decisions/0008-generator-after-two-remotes.md` — why two real
remotes exist at all. `docs/decisions/0020-packages-build-for-publishing.md`
— the day-one problem an ejected company hits next.

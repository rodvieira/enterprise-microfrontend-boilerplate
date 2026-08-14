# 0022 — Registry entries carry an optional `version`; rollback is editing it

**Status:** Accepted

**Extends:** [ADR-0012](0012-runtime-registry-fetch.md)

## Context

ADR-0012 made the registry a file the host fetches at runtime, so
switching environments is switching a file rather than rebuilding. That
already put the pieces for independent rollback in place, but the registry
never said which *build* of a remote an entry pointed at, and nothing in
the docs committed to immutable published paths.

Without that, the natural thing to do is publish each remote to a mutable
path (`/dashboard/latest/`) and overwrite it. That quietly gives up the
main operational reason organisations adopt micro-frontends: rolling one
remote back without touching the others, or the host. Overwriting in place
means the previous build no longer exists to roll back *to*.

It also leaves incident response guessing. When a remote fails to load,
the diagnostic names `dashboard` — not which build of it — and the person
reading the stack trace has to reconstruct that from a URL, if the URL
even encodes it.

## Decision

`RemoteRegistration` gains an optional `version?: string`, and
`docs/how-to-deploy.md` documents the immutable-versioned-path convention
that makes it meaningful:

```jsonc
{
  "name": "dashboard",
  "entry": "https://cdn.example/dashboard/1.4.2/mf-manifest.json",
  "version": "1.4.2",
  "routePath": "/dashboard"
}
```

**Rollback is editing that string and redeploying the registry JSON.** No
remote is rebuilt or redeployed, because 1.4.1 was never deleted. Canary
and blue/green fall out of the same mechanism: two environments' registries
pointing at different versions of one remote.

Three properties are deliberate:

- **Optional.** A remote served from a mutable path genuinely has no
  version to state, and a field that must be filled in would be filled in
  with a lie. Dev omits it.
- **Never resolved by the host.** `entry` alone decides what loads. The
  host does not compare, range-match, or select on `version` — that would
  make the registry a resolver and reintroduce the build-time coupling
  ADR-0012 removed.
- **Rejected when present and unusable.** `"version": null` or `""` fails
  at startup, alongside the registry's other malformed-document failures.
  That shape is a deploy pipeline substituting a value it failed to
  compute; ignoring it would discard the one fact worth having during an
  incident.

Every federation diagnostic now goes through `describeRemote()`, which
prints `dashboard@1.4.2` when a version is stated and `dashboard` when it
is not.

## Consequences

- The field is inert unless the deployment publishes to versioned paths.
  This ADR does not enforce that — no static host can be made to — it
  documents it and gives the registry somewhere to record it.
- `remotes.production.json` in this repository stays without versions:
  the GitHub Pages deploy (ADR-0018) overwrites in place, so stating a
  version would be exactly the lie described above. The convention is
  documented for adopters whose CDN supports it.
- The next thing that wants this field is telemetry: correlating a remote
  failure with the build that introduced it is the whole reason to record
  the version rather than infer it.

## Alternatives considered

- **Deriving the version from the entry URL** — rejected: it makes a
  parsing convention out of a URL the adopter owns, and breaks the moment
  someone's path layout differs.
- **Requiring `version` on every entry** — rejected: see "optional" above.
- **Letting the host resolve a semver range to a concrete build** —
  rejected: that is a resolver, needs an index of available versions, and
  turns a static file into a service. ADR-0012 rejected the service for
  the same reason.

## Related

`docs/decisions/0012-runtime-registry-fetch.md`,
`docs/how-to-deploy.md` ("Immutable versions, and rolling one back"),
`apps/shell/src/internal/federation/types.ts`.

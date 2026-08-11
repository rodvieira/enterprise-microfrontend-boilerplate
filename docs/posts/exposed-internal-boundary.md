# The folder convention that took two apps to get right

Module Federation doesn't have an opinion about your folder structure.

That surprised me the first time I sat down with it. Webpack's
Module Federation — and now Rspack's implementation, which is what this
post is really about — gives you exactly four primitives: a host, a
remote, an `exposes` map, and a `shared` block for singleton dependencies.
That's the whole vocabulary. Nothing in the spec tells you which files in
a remote are safe for another team to depend on and which ones are your
own business. You get to decide that yourself, and if you don't decide it
deliberately, your team will decide it by accident, one import at a time,
until the boundary is wherever the last person who touched the code left
it.

We built [enterprise-microfrontend-boilerplate](https://github.com/rodvieira/enterprise-microfrontend-boilerplate) —
two real remotes (a dashboard and an admin panel) composed inside a shell,
talking to each other through a typed event bus — and the first
architectural decision we made was also the one that turned out hardest
to actually enforce correctly. Here's what we landed on, and the two
times it broke before it was right.

## The convention

Every app splits its `src/` into two directories:

```text
src/
├── exposed/     # the only code listed in this app's ModuleFederationPlugin exposes map
└── internal/    # everything else — never imported from outside, even across federation
```

`exposed/` is the contract. It's what another team, another app, or a
completely separate repository is allowed to depend on. `internal/` is
where the feature lives — the data fetching, the state, the
components that only make sense in the context of one specific domain. The
rule is simple to state: nothing outside an app may import that app's
`internal/`, full stop, even though Module Federation's own runtime would
happily let you.

That last clause matters. Module Federation doesn't enforce this for you.
If you `exposes` a component in one file and it happens to import a
sibling file in `internal/`, that sibling gets bundled and shipped —
Module Federation doesn't care where an import comes from inside your own
app, only what you've explicitly listed in `exposes`. The boundary we're
describing is a build-time discipline, not a runtime one. Nothing stops a
second remote from reaching straight into the first remote's internals
except a rule you write down and then enforce in CI.

We enforce it with [dependency-cruiser](https://github.com/sverweij/dependency-cruiser),
and this is where it got interesting.

## The rule that was wrong for months, and nobody knew

Here's the rule as we first wrote it, back when the shell existed and
exactly zero remotes did:

```js
{
  name: 'no-cross-app-reaching-into-internal',
  from: { pathNot: '^apps/([^/]+)/' },
  to: { path: '^apps/([^/]+)/src/internal/' },
}
```

Read it as English: "anything that isn't inside some app may not import
that app's `internal/`." Looks right. It passed every check we ran against
it, because at the time we wrote it, there was nothing under `apps/` to
check it against except the shell itself, and the shell has no
`internal/` of the kind this rule was watching for.

The bug showed up the moment a second real app existed. `dependency-cruiser`'s
`from`/`to` matching supports backreferences — you can capture a group in
`from` and refer to it in `to` as `$1` — but only in one direction. You
can capture in `from` and read the capture in `to`. You cannot do it the
other way around, and there's no single rule that says "match `to`
against some app's `internal/`, and match `from` against *anything
outside that specific same app*" without a capture group living on the
`from` side.

Our rule captured nothing. `pathNot: '^apps/([^/]+)/'` on the `from` side
was a negation with no carve-out for "unless it's the same app as the
`to` path" — because there was no way to express "same app" without a
capture, and we hadn't needed one yet. The very first time a real app
existed and imported its *own* `internal/` — which is completely fine,
that's what `internal/` is for — the rule fired anyway. It couldn't tell
the difference between app A reaching into app B's internals and app A
reaching into its own.

We caught this the moment the second real app landed, because that's when
the rule ran against something that could actually violate it in the
"safe" direction. Before that, the rule had never had a chance to be
wrong out loud. The fix was splitting it into two rules — one for
app-to-app reaching, with a real backreference this time, and one for
non-app code (packages, scripts) reaching into any app's `internal/`,
which doesn't need one:

```js
{
  name: 'no-cross-app-reaching-into-internal',
  from: { path: '^apps/([^/]+)/' },
  to: {
    path: '^apps/([^/]+)/src/internal/',
    pathNot: '^apps/$1/',
  },
},
{
  name: 'no-package-reaching-into-app-internal',
  from: { pathNot: '^apps/' },
  to: { path: '^apps/([^/]+)/src/internal/' },
},
```

The lesson wasn't about dependency-cruiser's syntax. It was that a
boundary rule written before there's a second real thing to check it
against is a guess, and guesses about enforcement logic fail exactly the
way this one did — silently, until the first real case walks through the
door.

## The bug that had nothing to do with imports

The second time this convention bit us, `dependency-cruiser` had nothing
to say about it, because it wasn't an import violation at all.

`apps/dashboard`'s exposed component renders a chart, styled with Tailwind
classes. The stylesheet import lived in `bootstrap.tsx` — the file that
runs when you load the dashboard standalone, outside the shell, for local
development. That's a completely reasonable place to put it if you're
thinking about "where does this app's CSS get loaded from," and it worked
perfectly every time we ran the dashboard on its own.

It broke the instant we composed it inside the shell. The chart rendered
at zero by zero pixels — present in the DOM, invisible, no error anywhere.

Module Federation doesn't load an entire app when the shell composes a
remote. It loads exactly the JavaScript chunk reachable from whatever you
listed in `exposes` — in our case, `./App`, pointing at
`src/exposed/App.tsx`. `bootstrap.tsx` isn't in that dependency graph. It's
the *other* entry point, the one that only runs when the app boots
standalone. So every Tailwind class the chart used had, from the shell's
point of view, no stylesheet backing it at all. The import that made the
CSS real only existed on a code path the shell never executes.

The fix was one line: import the stylesheet from `src/exposed/App.tsx`
directly, not only from `bootstrap.tsx`. But the *reason* it needed to be
there is the same reason the folder convention exists in the first place
— `exposed/` isn't just "the public API," it's the literal, complete
dependency graph of everything the outside world will actually load. If
something your exposed component needs at runtime isn't reachable from
`exposed/`, composing it into a host doesn't fail loudly. It fails quietly,
and it fails exactly the way ours did: something renders, technically,
and is wrong in a way no test written against the standalone app would
ever catch.

When we built the second remote, we didn't rediscover this. We wrote the
stylesheet import in the exposed entry from the first commit, because by
then it was a known cost of getting the boundary wrong, not a surprise
waiting to happen a second time.

## What "two remotes" actually bought us

Neither of these bugs would have shown up with one app. The import-scoping
bug needed a second app to import into. The stylesheet bug needed
composition to actually happen — a shell rendering a remote it didn't
build, exercising exactly the code path a standalone dev server never
touches.

That's the actual argument for building a second real remote before
writing a scaffolding generator, or before calling a convention "done":
a convention that's only ever been checked against one example hasn't
been checked against the part of the problem that makes conventions hard
— what happens when someone who isn't you, working on something you
didn't build, runs into the edge you didn't think to name. The second
remote is what proves the rule generalizes. The first one only proves it
was possible once.

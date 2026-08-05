/**
 * Enforces the boundary rules for this project (see CLAUDE.md and ADR-0006,
 * ADR-0007, ADR-0011):
 *
 * 1. No app under apps/* may import another app via a relative path.
 *    Cross-app communication only happens through federation (apps/shell's
 *    federation/loadRemote.ts) or through packages/*.
 * 2. Nothing outside an app's own src/internal/ may import from that
 *    src/internal/ — only src/exposed/ is a valid import target from outside.
 *    Code anywhere inside that same app (exposed/, tests/, bootstrap.tsx,
 *    rspack.config.ts, ...) may still reach its own internal/ freely.
 * 3. Every module must declare every package it imports in its own
 *    package.json — see ADR-0011.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-app-relative-imports',
      severity: 'error',
      comment:
        'Apps must not import each other via relative paths. Use federation ' +
        '(loadRemote) or a shared package instead. This is what keeps a remote ' +
        'portable to its own repository later — see ADR-0007.',
      from: { path: '^apps/([^/]+)/' },
      to: {
        path: '^apps/([^/]+)/',
        pathNot: '^apps/$1/',
      },
    },
    {
      // Split in two because dependency-cruiser backreferences (`$1`) can only
      // be defined in `from` and read in `to`, never the reverse — there is no
      // single-rule way to say "to matches some app's internal/, and from is
      // outside that same app". The first rule handles app-to-app; the second
      // handles packages/scripts reaching into any app's internal/ at all.
      //
      // A rule combining both into one `from: { pathNot: '^apps/...' }` was
      // the original (bootstrapped, never-exercised) form of this rule, and it
      // was wrong: with no same-app carve-out, it flagged an app importing its
      // *own* internal/ — found the first time a real app existed to check
      // against (issue #2), never caught before because nothing under apps/
      // existed to trip it.
      name: 'no-cross-app-reaching-into-internal',
      severity: 'error',
      comment:
        'Only src/exposed/ is importable from outside an app. src/internal/ is ' +
        'private to that app, even across federation. See ADR-0006.',
      from: { path: '^apps/([^/]+)/' },
      to: {
        path: '^apps/([^/]+)/src/internal/',
        pathNot: '^apps/$1/',
      },
    },
    {
      name: 'no-package-reaching-into-app-internal',
      severity: 'error',
      comment:
        'Same rule as no-cross-app-reaching-into-internal, for code outside ' +
        'apps/* entirely — packages/* and root-level scripts must never reach ' +
        "into an app's src/internal/. See ADR-0006.",
      from: { pathNot: '^apps/' },
      to: { path: '^apps/([^/]+)/src/internal/' },
    },
    {
      name: 'no-undeclared-dependencies',
      severity: 'error',
      comment:
        'This module imports a package its own package.json does not declare. ' +
        'The repository uses a single hoisted node_modules at the root (see .npmrc ' +
        'and ADR-0011), so an undeclared package resolves anyway and nothing fails ' +
        'locally — until someone extracts this app or package to its own repository, ' +
        'where the import has nothing to resolve to. Declare it, or stop importing it.',
      from: { path: '^(apps|packages)/' },
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    // Points at the root tsconfig, not packages/config-typescript/tsconfig.base.json:
    // dependency-cruiser hands the file to TypeScript, which rejects a config that
    // resolves to zero input files (TS18003). The base config is meant to be
    // extended, never used directly. The root config extends it and has inputs.
    tsConfig: { fileName: 'tsconfig.json' },
  },
};

/**
 * Enforces two rules for this project (see CLAUDE.md and ADR-0006, ADR-0007):
 *
 * 1. No app under apps/* may import another app via a relative path.
 *    Cross-app communication only happens through federation (apps/shell's
 *    federation/loadRemote.ts) or through packages/*.
 * 2. Nothing outside an app's own src/internal/ may import from that
 *    src/internal/ — only src/exposed/ is a valid import target from outside.
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
      name: 'no-reaching-into-internal',
      severity: 'error',
      comment:
        'Only src/exposed/ is importable from outside an app. src/internal/ is ' +
        'private to that app, even across federation. See ADR-0006.',
      from: { pathNot: '^apps/([^/]+)/src/internal/' },
      to: { path: '^apps/([^/]+)/src/internal/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'packages/config-typescript/tsconfig.base.json' },
  },
};

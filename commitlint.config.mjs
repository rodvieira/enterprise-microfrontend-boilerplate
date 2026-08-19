export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'shell',
        'dashboard',
        'admin',
        'shared-types',
        'federation-utils',
        'telemetry',
        'config-typescript',
        'config-biome',
        'docs',
        'claude',
        'repo',
      ],
    ],
  },
};

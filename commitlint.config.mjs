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
        'ui',
        'auth',
        'shared-types',
        'federation-utils',
        'event-bus',
        'telemetry',
        'testing-utils',
        'config-typescript',
        'config-biome',
        'docs',
        'claude',
        'repo',
      ],
    ],
  },
};

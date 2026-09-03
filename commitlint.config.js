export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'test',
        'chore',
        'docs',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'chat',
        'call',
        'ui',
        'api',
        'socket',
        'db',
      ],
    ],
  },
};
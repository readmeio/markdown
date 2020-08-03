const [, , typeEnum] = require('@commitlint/config-angular').rules['type-enum'];

module.exports = {
  extends: ['@commitlint/config-angular'],
  rules: {
    'header-max-length':    [0, 'always', 106],
    'type-enum':            [2, 'always', [...typeEnum, 'chore', 'ref', 'add']],
    'scope-case':           [0, 'always', []],
    'body-max-line-length': [0, 'always', 'Infinity'],
  },
};

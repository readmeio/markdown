const [,,typeEnum] = require('@commitlint/config-angular').rules['type-enum'];

module.exports = {
  extends: ['@commitlint/config-angular'],
  rules: {
    'header-max-length':    [0, 'always', 106],
    'type-enum':            [2, 'always', [...typeEnum, 'chore', 'ref', 'add', 'enhance', 'BUILD']],
    'type-case':            [1, 'always', ['lower-case', 'upper-case']],
    'type-empty':           [0],
    'scope-empty':          [0],
    'subject-empty':        [1, 'never'],
    'body-max-line-length': [0, 'always', 'Infinity'],
  },
};

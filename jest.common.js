const path = require('path');

module.exports = {
  moduleNameMapper: {
    '.+\\.scss$': 'identity-obj-proxy',
  },
  modulePathIgnorePatterns: ['<rootDir>/__tests__/helpers'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { configFile: path.resolve(__dirname, '.babelrc') }] },
  transformIgnorePatterns: [
    // Since `@readme/variable` doesn't ship any transpiled code, we need to transform it as we're running tests.
    '<rootDir>/node_modules/@readme/variable/^.+\\.jsx?$',
  ],
};

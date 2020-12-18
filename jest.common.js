module.exports = {
  moduleNameMapper: {
    '.+\\.scss$': 'identity-obj-proxy',
  },
  modulePathIgnorePatterns: ['<rootDir>/__tests__/helpers'],
  setupFiles: ['<rootDir>/lib/enzyme'],
  transform: {
    '^.+\\.jsx?$': '<rootDir>/lib/babel-jest',
  },
  transformIgnorePatterns: [
    // Since `@readme/variable` doesn't ship any transpiled code, we need to transform it as we're running tests.
    '<rootDir>/node_modules/@readme/variable/^.+\\.jsx?$',
  ],
};

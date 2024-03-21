module.exports = {
  moduleNameMapper: {
    '.+\\.scss$': 'identity-obj-proxy',
  },
  modulePathIgnorePatterns: ['<rootDir>/__tests__/helpers'],
  transformIgnorePatterns: [
    // Since `@readme/variable` doesn't ship any transpiled code, we need to transform it as we're running tests.
    '<rootDir>/node_modules/@readme/variable/^.+\\.jsx?$',
    // wat
    '<rootDir>/node_modules/@babel',
    '<rootDir>/node_modules/@jest',
    '<rootDir>/node_modules/jest',
  ],
};

module.exports = {
  displayName: 'browser',
  globalSetup: 'jest-environment-puppeteer/setup',
  globalTeardown: 'jest-environment-puppeteer/teardown',
  moduleNameMapper: {
    '.+\\.scss$': 'identity-obj-proxy',
  },
  modulePathIgnorePatterns: ['<rootDir>/__tests__/helpers'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/browser/setup.js'],
  testEnvironment: 'jest-environment-puppeteer',
  testMatch: ['**/__tests__/browser/**/*.test.[jt]s?(x)'],
  transformIgnorePatterns: [
    // Since `@readme/variable` doesn't ship any transpiled code, we need to transform it as we're running tests.
    '<rootDir>/node_modules/@readme/variable/^.+\\.jsx?$',
    // wat
    '<rootDir>/node_modules/@babel',
    '<rootDir>/node_modules/@jest',
    '<rootDir>/node_modules/jest',
  ],
};

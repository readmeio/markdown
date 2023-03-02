const common = require('./jest.common.cjs');

module.exports = {
  ...common,
  displayName: 'browser',
  globalSetup: '<rootDir>/__tests__/browser/global-setup.js',
  preset: 'jest-puppeteer',
  setupFilesAfterEnv: ['<rootDir>/__tests__/browser/setup.js'],
  testMatch: ['**/__tests__/browser/**/*.test.[jt]s?(x)'],
};

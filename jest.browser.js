const common = require('./jest.common');

module.exports = {
  ...common,
  displayName: 'browser',
  globalSetup: 'jest-environment-puppeteer/setup',
  globalTeardown: 'jest-environment-puppeteer/teardown',
  testEnvironment: 'jest-environment-puppeteer',
  setupFilesAfterEnv: ['<rootDir>/__tests__/browser/setup.js'],
  testMatch: ['**/__tests__/browser/**/*.test.[jt]s?(x)'],
};

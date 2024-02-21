const path = require('path');

module.exports = {
  collectCoverageFrom: ['**/*.{js,jsx}'],
  coveragePathIgnorePatterns: [
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/lib',
    '<rootDir>/node_modules/',
    '<rootDir>/jest.config.js',
    '<rootDir>/webpack.*.js',
    '<rootDir>/.*rc.js',
    '<rootDir>/*/index.js', // ignore helper index files
    '<rootDir>/example',
  ],
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  modulePathIgnorePatterns: ['<rootDir>/__tests__/helpers'],
  preset: '@readme/jest-preset/react',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { configFile: path.resolve(__dirname, '.babelrc') }] },
  transformIgnorePatterns: [
    // Since `@readme/variable` doesn't ship any transpiled code, we need to transform it as we're running tests.
    '<rootDir>/node_modules/@readme/variable/^.+\\.jsx?$',
  ],
};

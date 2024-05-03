const common = require('./jest.common');

const unit = {
  ...common,
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
  coverageReporters: ['json', 'text', 'lcov', 'clover'], // per https://github.com/facebook/jest/issues/9396#issuecomment-573328488
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  displayName: 'unit',
  prettierPath: require.resolve('prettier-2'),
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/browser/'],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
};

module.exports = { projects: [unit] };

const shared = {
  moduleNameMapper: {
    '.+\\.(css|styl|less|sass|scss)$': 'identity-obj-proxy',
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

const unit = {
  ...shared,
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
  setupFilesAfterEnv: ['<rootDir>/__tests__/helpers'],
  testPathIgnorePatterns: ['/browser/'],
  testURL: 'http://localhost',
};

const browser = {
  ...shared,
  displayName: 'browser',
  preset: 'jest-puppeteer',
  testMatch: ['**/__tests__/browser/**/*.[jt]s?(x)'],
};

module.exports = { projects: [unit, browser] };

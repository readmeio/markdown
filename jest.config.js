module.exports = {
  testURL: 'http://localhost',
  coverageReporters: ['json', 'text', 'lcov', 'clover'], // per https://github.com/facebook/jest/issues/9396#issuecomment-573328488
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  setupFiles: ['<rootDir>/lib/enzyme'],
  coveragePathIgnorePatterns: ['<rootDir>/webpack.*.js', 'dist/'],
  collectCoverageFrom: ['**/*.{js,jsx}', '!**/node_modules/**', '!jest.config.js', '!**/coverage/lcov-report/**'],
  moduleNameMapper: {
    '.+\\.(css|styl|less|sass|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.jsx?$': '<rootDir>/lib/babel-jest',
  },
};

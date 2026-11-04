import oxlintConfig from '@readme/oxlint-config';
import oxlintConfigJest from '@readme/oxlint-config/testing/jest';
import oxlintConfigVitest from '@readme/oxlint-config/testing/vitest';
import oxlintConfigTS from '@readme/oxlint-config/typescript';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [oxlintConfig, oxlintConfigTS],
  options: {
    reportUnusedDisableDirectives: 'error',
  },
  ignorePatterns: ['coverage/', 'dist/'],
  categories: {
    suspicious: 'error',
  },
  env: {
    browser: true,
    commonjs: true,
    es2022: true,
    node: true,
  },
  rules: {
    // Remark and unist visitors mutate the node they are handed. That assignment is the transform.
    'no-param-reassign': 'off',

    // lib/index.ts and the processor barrels import each other. Untangling that is separate from this move.
    'import/no-cycle': 'off',

    // Helpers stay next to the code they serve, including ones that close over nothing.
    'unicorn/consistent-function-scoping': 'off',

    // `Array#toSorted` is ES2023. This package targets ES2022.
    'unicorn/no-array-sort': 'off',

    // Empty `interface Foo extends Bar {}` is how this repo names props and augments Vitest matchers.
    'typescript/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],

    // Stylesheets and test setup are loaded for their side effects.
    'import/no-unassigned-import': [
      'error',
      {
        allow: ['**/*.css', '**/*.scss', '@testing-library/jest-dom', '@testing-library/jest-dom/**', '**/matchers'],
      },
    ],
  },
  overrides: [
    {
      // Webpack, scripts, and a few library entrypoints are CommonJS.
      files: ['**/*.{js,cjs,jsx}'],
      rules: {
        'typescript/no-require-imports': 'off',
      },
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['__tests__/**/*.{js,jsx,ts,tsx}', 'vitest-setup.js', 'vitest.config.mts', 'vitest.d.ts'],
      excludeFiles: ['__tests__/browser/**'],
      ...oxlintConfigVitest,
      env: {
        vitest: true,
      },
      rules: {
        ...oxlintConfigVitest.rules,

        'vitest/no-large-snapshots': 'off',
        'vitest/prefer-importing-vitest-globals': 'off',

        // The fixer rewrites `toBeTruthy()` on DOM nodes to `toBe(true)`, which fails.
        'vitest/prefer-strict-boolean-matchers': 'off',

        'vitest/require-mock-type-parameters': 'off',
      },
    },
    {
      files: [
        '__tests__/browser/**/*.{js,jsx,ts,tsx}',
        '__mocks__/**/*.{js,jsx,ts,tsx}',
        'jest.config.js',
        'jest-puppeteer.config.js',
      ],
      ...oxlintConfigJest,
      globals: {
        ...oxlintConfigJest.globals,
        page: 'readonly', // jest-puppeteer injects this.
      },
      rules: oxlintConfigJest.rules,
    },
  ],
});

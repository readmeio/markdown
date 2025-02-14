module.exports = {
  extends: ['@readme/eslint-config', '@readme/eslint-config/react', '@readme/eslint-config/typescript'],
  root: true,
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': [
      'warn',
      {
        devDependencies: [
          '**/*.spec.[tj]s',
          '**/*.test.[tj]s',
          '**/*.test.[tj]sx',
          '**/vitest.*.[tj]s',
          '**/webpack..*.js',
          './example/**',
        ],
      },
    ],
  },
};

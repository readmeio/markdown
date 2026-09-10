module.exports = {
  extends: ['@readme/eslint-config', '@readme/eslint-config/react', '@readme/eslint-config/typescript'],
  root: true,
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    'import/extensions': 'off',
    // Webpack bundles the whole tree into dist, so source imports are build-time only.
    // The rule still catches imports of packages that are declared nowhere.
    'import/no-extraneous-dependencies': ['warn', { devDependencies: true }],
  },
};

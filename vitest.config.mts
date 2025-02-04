/* eslint-disable import/no-extraneous-dependencies */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    setupFiles: ['./vitest-setup.js'],
    workspace: [
      {
        extends: true,
        test: {
          exclude: [
            '__tests__/browser'
          ],
          name: 'rdmd',
        },
      },
    ]
  },
});

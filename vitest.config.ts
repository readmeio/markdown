import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '__tests__/browser'],
    globals: true,
    setupFiles: ['./vitest-setup.js'],
  },
});

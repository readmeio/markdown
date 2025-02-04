import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '__tests__/browser'],
    globals: true,
    setupFiles: ['./vitest-setup.js'],
  },
});

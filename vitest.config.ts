import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 20000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});

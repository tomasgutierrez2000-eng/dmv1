import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', '.claude', 'scenarios/factory/__tests__/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});

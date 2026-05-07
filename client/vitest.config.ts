import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Note: @vitejs/plugin-react omitted here as it's ESM-only and causes issues
  // in vitest's CJS config loading. Tests still work via jsdom environment.
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    globals: true,
    setupFiles: ['./src/tests/setupTests.ts'],
    include: ['./src/tests/**/*.test.{tsx,ts}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@SkillSeal/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});

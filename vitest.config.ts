import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Kept separate from vite.config.ts: vitest ships its own vite copy and the two
// plugin types do not unify. Unit and integration tests are pure logic and need
// no React plugin, so the split costs nothing.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    // Engine tests need no DOM; component tests opt in with
    // `@vitest-environment jsdom` at the top of the file.
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
  },
});

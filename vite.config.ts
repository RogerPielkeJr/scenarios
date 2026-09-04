import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/',
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

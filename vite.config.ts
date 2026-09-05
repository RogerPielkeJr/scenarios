import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// scripts/build_single_file.py sets SINGLE_PAGE to the name of one page to
// get a build of that page alone. With two entry points Rollup lifts the
// code they share into its own chunk, which a single-file pack cannot
// resolve; with one entry there is nothing to share and the output is one
// CSS and one JS.
const singlePage = process.env['SINGLE_PAGE'] ?? '';
const PAGES: Record<string, string> = {
  main: 'index.html',
  bibliography: 'bibliography.html',
  // Directory indexes, so the built site serves /learn/ and
  // /learn/population/ as clean URLs with no rewrite rules.
  learn: 'learn/index.html',
  'learn-population': 'learn/population/index.html',
  'learn-energy-intensity': 'learn/energy-intensity/index.html',
  'learn-carbon-intensity': 'learn/carbon-intensity/index.html',
  'learn-income': 'learn/income/index.html',
  'learn-methane': 'learn/methane/index.html',
  'learn-land-use': 'learn/land-use/index.html',
};

export default defineConfig({
  base: '/',
  build: {
    outDir: singlePage === '' ? 'dist' : 'dist-single',
    assetsDir: 'assets',
    sourcemap: singlePage === '',
    emptyOutDir: true,
    rollupOptions: {
      input: singlePage === ''
        ? Object.fromEntries(Object.entries(PAGES)
            .map(([name, file]) => [name, resolve(__dirname, file)]))
        : { [singlePage]: resolve(__dirname, PAGES[singlePage] ?? 'index.html') },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

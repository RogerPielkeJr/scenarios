import { defineConfig, devices } from '@playwright/test';

// Playwright's bundled Chromium needs GTK and ATK shared libraries that this
// host does not have system-wide, and installing them needs root. The
// browser-test conda environment already carries them, so point the loader
// there. Harmless if the libraries are present system-wide.
const CONDA_LIB = '/home/rpielke/miniconda3/envs/browser-test/lib';
process.env['LD_LIBRARY_PATH'] = [CONDA_LIB, process.env['LD_LIBRARY_PATH']]
  .filter(Boolean).join(':');

/**
 * Visual checks at the four widths the brief names. Screenshots are
 * committed, so a layout change shows up as an image diff in review.
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts/,
  snapshotDir: 'tests/screenshots',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
  fullyParallel: true,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Chrome'],
  },
  expect: {
    // Font loading and antialiasing move a few pixels between runs, so this
    // is not a pixel-perfect check. Keep the tolerance tight enough that a
    // moved label still fails: at 0.02 a collision between two pieces of
    // axis text passed, and --update-snapshots then kept the stale image,
    // because it only rewrites a baseline that actually failed.
    toHaveScreenshot: { maxDiffPixelRatio: 0.004, animations: 'disabled' },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    // Always build and serve fresh. Reusing a server that is already up
    // silently skips the build, so the screenshots come from whatever was
    // last compiled rather than from the working tree.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

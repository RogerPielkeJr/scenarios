import { expect, test } from '@playwright/test';

const BREAKPOINTS = [
  { name: '360', width: 360, height: 1400 },
  { name: '768', width: 768, height: 1400 },
  { name: '1280', width: 1280, height: 1100 },
  { name: '1600', width: 1600, height: 1100 },
];

const THEMES = ['light', 'dark'] as const;

for (const breakpoint of BREAKPOINTS) {
  for (const theme of THEMES) {
    test(`layout at ${breakpoint.name}px, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await page.waitForFunction(() => {
        const tile = document.getElementById('tile-cumulative');
        return tile !== null && tile.textContent !== '' && tile.textContent !== '—';
      });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${breakpoint.name}-${theme}.png`, { fullPage: true });
    });
  }
}

test('every tile is filled and nothing failed to render', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  for (const id of ['tile-cumulative', 'tile-warming', 'tile-added', 'tile-analogue']) {
    await expect(page.locator(`#${id}`)).not.toHaveText('—');
    await expect(page.locator(`#${id}`)).not.toHaveText('unavailable');
  }
  await expect(page.locator('#chart [data-user-path]')).toHaveCount(1);
  await expect(page.locator('#chart [data-marker]')).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('a shared link restores the scenario', async ({ page }) => {
  await page.goto('/#s=12_2.5_-0.8_-0.1_2_500');
  await expect(page.locator('#readout-population')).toHaveText('12.0 billion');
  await expect(page.locator('#readout-methane')).toHaveText('500 Mt/yr');
});

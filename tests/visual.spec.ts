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

for (const breakpoint of [BREAKPOINTS[0], BREAKPOINTS[2]]) {
  test(`bibliography at ${breakpoint?.name}px`, async ({ page }) => {
    if (!breakpoint) return;
    await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/bibliography.html');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`bibliography-${breakpoint.name}.png`, { fullPage: true });
  });
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

test('opens on Trend continues, with the reader path named', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#readout-energyPerDollar')).toHaveText('-1.62%/yr');
  await expect(page.locator('#readout-co2PerEnergy')).toHaveText('-0.48%/yr');
  await expect(page.locator('#readout-methane')).toHaveText('300 Mt/yr');
  await expect(page.locator('#chart text', { hasText: 'Build your own' })).toHaveCount(1);
  await expect(page.locator('.legend-item.is-you')).toContainText('Build your own');
});

test('a shared link restores the scenario', async ({ page }) => {
  await page.goto('/#s=12_2.5_-0.8_-0.1_2_500');
  await expect(page.locator('#readout-population')).toHaveText('12.0 billion');
  await expect(page.locator('#readout-methane')).toHaveText('500 Mt/yr');
});

test('never scrolls the page body sideways', async ({ page }) => {
  // 380 is the narrowest width the pages have to work at; 360 gives a margin.
  for (const path of ['/', '/learn/', '/learn/population/', '/bibliography.html']) {
    for (const width of [360, 380, 768, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test('names the reader path the same way everywhere', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#chart text', { hasText: 'Build your own' })).toHaveCount(1);
  await expect(page.locator('.legend-item.is-you')).toContainText('Build your own');
  await expect(page.locator('#kaya-table thead th').nth(1)).toHaveText('Build your own');
  await expect(page.locator('#kaya-table')).not.toContainText('Yours');
});

test('the masthead and the toolbar link out', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.masthead img')).toBeVisible();
  await expect(page.locator('.masthead')).toHaveAttribute('href', 'https://thehonestbroker.org');
  await expect(page.locator('.toolbar a', { hasText: 'The Honest Broker' }))
    .toHaveAttribute('href', 'https://thehonestbroker.org');
});

test('the bibliography button reaches the bibliography and back', async ({ page }) => {
  await page.goto('/');
  await page.locator('.toolbar a', { hasText: 'Bibliography' }).click();
  await expect(page).toHaveURL(/bibliography\.html$/);
  await expect(page.locator('h1')).toHaveText('Bibliography');
  await expect(page.locator('.refs > li')).toHaveCount(16);
  await expect(page.getByText('The Climate Fix')).toBeVisible();
  await page.locator('.toolbar a', { hasText: 'Back to the scenario builder' }).click();
  await expect(page.locator('h1')).toHaveText('Build your own emissions scenario');
});

test('the PNG button produces a scenario sheet', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#download-png').click(),
  ]);
  expect(download.suggestedFilename()).toBe('emissions-scenario.png');
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync((await download.path()) as string);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  // 720 CSS px wide at 2x, and tall enough to hold the chart, the four
  // results and the six assumptions.
  expect(bytes.readUInt32BE(16)).toBe(1440);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(1400);
  expect(bytes.length).toBeGreaterThan(20_000);
  await expect(page.locator('#action-message')).toHaveText('Downloaded');
});

test('the PDF button produces a one-page PDF', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#download-pdf').click(),
  ]);
  expect(download.suggestedFilename()).toBe('emissions-scenario.pdf');
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync((await download.path()) as string);
  const text = bytes.toString('latin1');
  expect(text.startsWith('%PDF-1.4')).toBe(true);
  expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  expect(text).toContain('/Type /Catalog');
  expect(text).toContain('/Filter /DCTDecode');
  expect(text).toContain('/Count 1');
  // The cross-reference offsets have to point at the objects they claim to.
  const startxref = Number(/startxref\s+(\d+)/.exec(text)?.[1]);
  expect(text.slice(startxref, startxref + 4)).toBe('xref');
  for (const [, offset] of text.matchAll(/^(\d{10}) 00000 n $/gm)) {
    expect(text.slice(Number(offset)).startsWith(`${text.slice(Number(offset), Number(offset) + 1)} 0 obj`)).toBe(true);
  }
  expect(bytes.length).toBeGreaterThan(20_000);
});

test('the theme toggle overrides the system setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-toggle').click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#theme-label')).toHaveText('Light');
  // The choice has to survive a reload, or it is not a setting.
  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'dark');
});

const LIVE_SLUGS = ['population', 'energy-intensity', 'carbon-intensity',
  'income', 'methane', 'land-use'];

for (const slug of LIVE_SLUGS) {
  for (const breakpoint of BREAKPOINTS) {
    for (const theme of THEMES) {
      test(`the ${slug} page at ${breakpoint.name}px, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(`/learn/${slug}/`);
        await page.waitForSelector('#learn-chart path');
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`learn-${slug}-${breakpoint.name}-${theme}.png`,
          { fullPage: true });
      });
    }
  }

  test(`the ${slug} page hands a value back`, async ({ page }) => {
    await page.goto(`/learn/${slug}/?s=11.3_2.2_-1.9_-0.7_-1.5_240&n=Held%20steady`);
    await page.locator('.use-button').click();
    await expect(page).toHaveURL(/#s=/);
    await expect(page).toHaveURL(/n=Held%20steady/);
    await expect(page.locator('.handoff')).toBeVisible();
    await expect(page.locator('#scenario-name')).toHaveValue('Held steady');
  });
}

for (const breakpoint of [BREAKPOINTS[0], BREAKPOINTS[2]]) {
  test(`the learn index at ${breakpoint?.name}px`, async ({ page }) => {
    if (!breakpoint) return;
    await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/learn/');
    await page.waitForSelector('.learn-index a');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`learn-index-${breakpoint.name}.png`, { fullPage: true });
  });
}

test('a scenario survives the round trip through the population page', async ({ page }) => {
  await page.goto('/#s=11.3_2.2_-1.9_-0.7_-1.5_240');
  await page.locator('#scenario-name').fill('Crowded century');
  await page.locator('.control[data-input="population"] .learn-link').click();

  await expect(page).toHaveURL(/\/learn\/population\/\?s=11\.3_2\.2_-1\.9_-0\.7_-1\.5_240/);
  await expect(page).toHaveURL(/n=Crowded%20century/);
  await expect(page.locator('h1')).toHaveText('Population');

  // Everything at the UN low variant, which the builder adds up to 6.99.
  const parts = page.locator('.builder-part input[type="range"]');
  const count = await parts.count();
  for (let index = 0; index < count; index += 1) {
    const part = parts.nth(index);
    await part.evaluate((node) => {
      const input = node as HTMLInputElement;
      input.value = input.min;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  await expect(page.locator('.builder-result-value')).toContainText('6.99 billion');
  await page.locator('.use-button').click();

  await expect(page).toHaveURL(/#s=7_2\.2_-1\.9_-0\.7_-1\.5_240/);
  await expect(page).toHaveURL(/n=Crowded%20century/);
  await expect(page).not.toHaveURL(/applied=/);
  await expect(page.locator('#readout-population')).toHaveText('7.0 billion');
  await expect(page.locator('#readout-methane')).toHaveText('240 Mt/yr');
  await expect(page.locator('#scenario-name')).toHaveValue('Crowded century');
  await expect(page.locator('.handoff')).toContainText('7.0 billion');
  await expect(page.locator('#kaya-table thead th').nth(1)).toHaveText('Crowded century');
});

test('the back link returns the scenario unchanged', async ({ page }) => {
  await page.goto('/learn/population/?s=11.3_2.2_-1.9_-0.7_-1.5_240&n=Held%20steady');
  await page.locator('.back-link').first().click();
  await expect(page).toHaveURL(/#s=11\.3_2\.2_-1\.9_-0\.7_-1\.5_240&n=Held%20steady/);
  await expect(page.locator('#readout-population')).toHaveText('11.3 billion');
  await expect(page.locator('#scenario-name')).toHaveValue('Held steady');
});

test('a published scenario draws its own path until a slider moves', async ({ page }) => {
  await page.goto('/');
  await page.locator('.presets button', { hasText: 'CMIP7 MEDIUM' }).click();
  await expect(page.locator('#tile-cumulative')).toHaveText('2,770');
  await expect(page.locator('#tile-warming')).toHaveText('2.84 °C');
  await expect(page.locator('#chart text', { hasText: 'CMIP7 MEDIUM as published' }))
    .toHaveCount(1);
  await expect(page.locator('.presets button[aria-pressed="true"]')).toHaveCount(1);

  // The published path and the marker line behind it are the same 16 points.
  const drawn = await page.locator('#chart [data-user-path]').getAttribute('d');
  const ghost = await page.locator('#chart [data-marker="M"]').getAttribute('d');
  expect(drawn?.replace(/^M/, '')).toBe(ghost?.replace(/^M/, ''));

  await page.locator('#input-population').fill('11');
  await page.locator('#input-population').dispatchEvent('input');
  await expect(page.locator('#tile-cumulative')).not.toHaveText('2,770');
  await expect(page.locator('#chart text', { hasText: 'as published' })).toHaveCount(0);
});

test('a named scenario names its download', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-name').fill('Coal holds on');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#download-png').click(),
  ]);
  expect(download.suggestedFilename()).toBe('coal-holds-on.png');
});

test('the learn index opens every finished page', async ({ page }) => {
  await page.goto('/learn/');
  await expect(page.locator('.learn-index > li')).toHaveCount(6);
  await expect(page.locator('.learn-index a')).toHaveCount(LIVE_SLUGS.length);
  await expect(page.locator('.forthcoming-tag')).toHaveCount(6 - LIVE_SLUGS.length);
  await page.locator('.learn-index a').first().click();
  await expect(page.locator('h1')).toHaveText('Population');
});

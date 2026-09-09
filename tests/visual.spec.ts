import { expect, test } from '@playwright/test';
import { citedSources } from '../src/learn/sources/index.js';
import { readFileSync } from 'node:fs';
import { LEARN_ENTRIES } from '../src/learn/registry.js';

// Playwright runs this file through Node, which rejects the bare JSON imports
// the model modules use, so the data comes off disk rather than through them.
// Anything needing the model itself belongs in the Vitest suite.
const SLIDER_COUNT: number =
  (JSON.parse(readFileSync('src/data/config.json', 'utf8')) as { inputs: unknown[] })
    .inputs.length;

// The site is "Build your own climate scenario". An unnamed scenario's
// downloads take that stem; see fileStem in src/app.ts.
const UNNAMED_STEM = 'climate-scenario';

// Three widths, not four. 1280 and 1600 exercised the same layout, because
// .wrap caps at 1180px, and every regenerated baseline costs the repository
// its full size forever.
const BREAKPOINTS = [
  { name: '360', width: 360, height: 1400 },
  { name: '768', width: 768, height: 1400 },
  { name: '1280', width: 1280, height: 1100 },
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
      // The strip is fixed to the window, so a full-page shot would stamp it
      // across the middle of a tall page. It has baselines of its own below.
      await page.addStyleTag({ content: '#scenario-strip { display: none !important; }' });
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

for (const breakpoint of [BREAKPOINTS[0], BREAKPOINTS[2]]) {
  test(`library at ${breakpoint?.name}px`, async ({ page }) => {
    if (!breakpoint) return;
    await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/library.html');
    // The covers load lazily and arrive from Substack's CDN at their own
    // pace. A full-page shot reaches past the viewport without scrolling,
    // so walking the page first is what puts an image in each card.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(
      () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      null, { timeout: 20_000 },
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`library-${breakpoint.name}.png`, { fullPage: true });
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

// A bare internal link drops the reader's six numbers and their name, and the
// Use button on the page they land on then carries the defaults home over all
// of them. This has been three separate bugs now: the sibling nav and the
// toolbar (e2525e3), the bibliography's back link (8ffdadb), and the factor
// links inside the Kaya identity. So the rule is checked wholesale rather than
// link by link: on every page, every internal link carries the scenario.
test('no internal link anywhere drops the scenario', async ({ page }) => {
  const query = 's=11.5_2.2_-1.1_-0.9_-3_450&n=Audit%20run';
  const bare: string[] = [];
  const pages = ['/', '/learn/', '/learn/population/', '/learn/income/',
    '/learn/energy-intensity/', '/learn/carbon-intensity/', '/learn/land-use/',
    '/learn/methane/', '/learn/timing/', '/learn/removal/',
    '/library.html', '/bibliography.html'];
  for (const path of pages) {
    await page.goto(path === '/' ? `/#${query}` : `${path}?${query}`);
    await page.waitForFunction(() => document.querySelectorAll('a[href]').length > 3);
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
      .map((a) => ({
        href: a.getAttribute('href') ?? '',
        text: (a.textContent ?? '').trim().slice(0, 40),
      })));
    for (const link of links) {
      // Only routes between the tool's own pages carry a scenario. The PDF,
      // the images and every outside link do not.
      if (!link.href.startsWith('/')) continue;
      if (/\.(pdf|png|xml|txt)$/.test(link.href)) continue;
      if (!/[#?].*s=/.test(link.href)) bare.push(`${path} → "${link.text}" → ${link.href}`);
    }
  }
  expect(bare).toEqual([]);
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

test('every figure and table names its data and carries the mark', async ({ page }) => {
  for (const path of ['/', '/learn/population/', '/learn/carbon-intensity/']) {
    await page.goto(path);
    const credits = page.locator('.figure-credit');
    expect(await credits.count()).toBeGreaterThan(1);
    for (let index = 0; index < await credits.count(); index += 1) {
      await expect(credits.nth(index).locator('img')).toBeVisible();
      await expect(credits.nth(index).locator('.credit-data')).toContainText('Data:');
    }
  }
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
  // The scenario rides along in the query string, so the path is not the
  // whole URL any more.
  await expect(page).toHaveURL(/bibliography\.html\?s=/);
  await expect(page.locator('h1')).toHaveText('Bibliography');
  // Sixteen hand-written entries, plus one per work the Learn More pages cite.
  await expect(page.locator('#learn-sources > li')).toHaveCount(citedSources().length);
  await expect(page.locator('.refs > li')).toHaveCount(16 + citedSources().length);
  await expect(page.locator('.cited-by').first()).toContainText('Cited by:');
  await expect(page.getByText('The Climate Fix')).toBeVisible();
  await page.locator('.toolbar a', { hasText: 'Build your own climate scenario' }).click();
  await expect(page.locator('h1')).toHaveText('Build your own climate scenario');
});

test('the PNG button produces a scenario sheet', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#download-png').click(),
  ]);
  expect(download.suggestedFilename()).toBe(`${UNNAMED_STEM}.png`);
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
  expect(download.suggestedFilename()).toBe(`${UNNAMED_STEM}.pdf`);
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
  'income', 'methane', 'land-use', 'timing', 'removal'];

for (const slug of LIVE_SLUGS) {
  for (const breakpoint of BREAKPOINTS) {
    for (const theme of THEMES) {
      test(`the ${slug} page at ${breakpoint.name}px, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(`/learn/${slug}/`);
        // Attached rather than visible. On the removal page the first path is
        // a horizontal line, because capture and storage opens at no effect,
        // and a zero-height box never counts as visible. Not the reader's
        // series specifically: the carbon-intensity chart is stacked bands and
        // puts the reader's line in the second figure.
        await page.waitForSelector('#learn-chart path', { state: 'attached' });
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
  // The link is whatever the page itself writes, never a literal. One number
  // per slider means a typed link goes stale the moment a slider joins, which
  // is what happened when timing and removal arrived and left this test
  // looking for the six-number form.
  await page.goto('/');
  await page.locator('#input-population').fill('11.3');
  await page.locator('#input-population').dispatchEvent('input');
  await page.locator('#scenario-name').fill('Held steady');
  await page.locator('#scenario-name').dispatchEvent('input');
  await expect(page).toHaveURL(/#s=11\.3_/);
  const link = new URL(page.url()).hash.slice(1);
  expect(link.split('&')[0]?.split('_')).toHaveLength(SLIDER_COUNT);

  await page.goto(`/learn/population/?${link}`);
  await page.locator('.back-link').first().click();
  await expect(page).toHaveURL(`/#${link}`);
  await expect(page.locator('#readout-population')).toHaveText('11.3 billion');
  await expect(page.locator('#scenario-name')).toHaveValue('Held steady');
});

test('a published scenario draws its own path until a slider moves', async ({ page }) => {
  await page.goto('/');
  // By data-preset, not by text: "CMIP7 MEDIUM" is a prefix of
  // "CMIP7 MEDIUM-to-LOW" and matches both buttons.
  await page.locator('.presets button[data-preset="cmip7-medium"]').click();
  // No number typed in. This test is about the chart drawing the marker's own
  // path, and tests/presets.test.ts already pins what each preset comes to;
  // repeating a figure here only froze a stale one, which is how "2,770" (the
  // marker's published total) outlived the tile's 2,767 (the model's).
  await expect(page.locator('#tile-cumulative')).toHaveText(/^[\d,]+$/);
  await expect(page.locator('#tile-warming')).toHaveText(/^\d\.\d{2} °C$/);
  const cumulative = await page.locator('#tile-cumulative').textContent() ?? '';
  // "reconstructed", not "as published": the ink is the Kaya reconstruction
  // and the marker's own path sits behind it. src/model/markers.ts writes the
  // label for both the chart and the downloaded sheet.
  await expect(page.locator('#chart text', { hasText: 'CMIP7 MEDIUM reconstructed' }))
    .toHaveCount(1);
  await expect(page.locator('.presets button[aria-pressed="true"]')).toHaveCount(1);

  // The ink is the reconstruction, one point a year, and the marker's own
  // path sits behind it at the six values it publishes. The two used to be
  // the same line: drawing the published path as the ink made one step of the
  // population slider look like it raised warming by 0.18 degrees when it had
  // lowered it by 0.002. They must differ, and both must be on the chart.
  const drawn = await page.locator('#chart [data-user-path]').getAttribute('d');
  const ghost = await page.locator('#chart [data-marker="M"]').getAttribute('d');
  expect(drawn).not.toBe(null);
  expect(ghost).not.toBe(null);
  expect(drawn).not.toBe(ghost);
  expect((drawn ?? '').split('L')).toHaveLength(2100 - 2025 + 1);
  expect((ghost ?? '').split('L')).toHaveLength(16);

  await page.locator('#input-population').fill('11');
  await page.locator('#input-population').dispatchEvent('input');
  await expect(page.locator('#tile-cumulative')).not.toHaveText(cumulative);
  await expect(page.locator('#chart text', { hasText: 'reconstructed' })).toHaveCount(0);
});

test('every figure on a learn page offers a PNG and a spreadsheet', async ({ page }) => {
  for (const path of ['/learn/population/', '/learn/energy-intensity/', '/learn/removal/']) {
    await page.goto(path);
    const figures = await page.locator('.chart-figure').count();
    expect(figures, path).toBeGreaterThan(0);
    await expect(page.locator('.figure-actions')).toHaveCount(figures);
  }
});

// The top page is the exception, and on purpose. Its chart sits in a
// .chart-figure like any other, but what its two buttons hand over is the
// whole scenario sheet -- chart, results and assumptions on one page -- so
// they live in the toolbar rather than under the figure. This test used to
// count the top page among the rest and passed only while its chart had no
// figure wrapper to be counted.
test('the top page downloads a scenario sheet rather than the figure', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.chart-figure')).toHaveCount(1);
  await expect(page.locator('.figure-actions')).toHaveCount(0);
  await expect(page.locator('#download-png')).toBeVisible();
  await expect(page.locator('#download-pdf')).toBeVisible();
});

test('the PNG button under a figure downloads that figure', async ({ page }) => {
  await page.goto('/learn/population/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.figure-actions button', { hasText: 'PNG' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^population-.*\.png$/);
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync((await download.path()) as string);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.length).toBeGreaterThan(10_000);
  // The band under the drawing carries the logo and the two credit lines, so
  // the image stands taller than the figure's own viewBox.
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  expect(width).toBe(1360);
  expect(height).toBeGreaterThan(800);
});

test('the XLS button downloads the numbers behind the figure', async ({ page }) => {
  await page.goto('/learn/population/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.figure-actions button', { hasText: 'XLS' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.xls$/);
  const { readFileSync } = await import('node:fs');
  const text = readFileSync((await download.path()) as string, 'utf8');
  expect(text).toContain('<?mso-application progid="Excel.Sheet"?>');
  expect(text).toContain('UN medium');
  expect(text).toContain('Data: UN World Population Prospects 2024');
  expect(text).toContain('Roger Pielke Jr.');
  // The years the chart draws have to be in the file the reader downloads.
  expect(text).toContain('<Data ss:Type="Number">1950</Data>');
  expect(text).toContain('<Data ss:Type="Number">2100</Data>');
});

test('a learn page names the reader\'s value after their scenario', async ({ page }) => {
  await page.goto('/learn/population/?s=11.3_2.2_-1.9_-0.7_-1.5_240&n=Crowded%20century');
  await expect(page.locator('.builder-result-key')).toHaveText('Crowded century');
  await expect(page.locator('#learn-chart text', { hasText: 'Crowded century' }))
    .toHaveCount(1);
});

test('the builder comes first on a learn page', async ({ page }) => {
  await page.goto('/learn/income/');
  const first = page.locator('.learn-block').first();
  await expect(first).toHaveClass(/builder-block/);
  await expect(first.locator('h2')).toHaveText('Build your value');
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
  // Counted from the registry, which is what the index itself reads. The
  // literal 6 here outlived two new pages. LIVE_SLUGS is the screenshot list
  // and is not the same thing: the timing page is live and carries no
  // baseline, so the index shows more links than that list has entries.
  const live = LEARN_ENTRIES.filter((entry) => entry.status === 'live').length;
  await page.goto('/learn/');
  await expect(page.locator('.learn-index > li')).toHaveCount(LEARN_ENTRIES.length);
  await expect(page.locator('.learn-index a')).toHaveCount(live);
  await expect(page.locator('.forthcoming-tag'))
    .toHaveCount(LEARN_ENTRIES.length - live);
  await page.locator('.learn-index a').first().click();
  await expect(page.locator('h1')).toHaveText('Population');
});

// The strip carries the reader's two headline numbers to wherever they are.
// Its whole reason for existing is the distance between the sliders and the
// chart, so these run in a real browser: jsdom has no IntersectionObserver.
test.describe('the scenario strip', () => {
  // On a wide screen the chart sits beside the sliders and shows on load, so
  // the strip has nothing to add until the reader works down the column.
  test('stays down while the chart shows, and comes up once it does not',
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/');
      const strip = page.locator('#scenario-strip');
      await expect(strip).toBeHidden();

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(strip).toBeVisible();
      await expect(page.locator('#strip-cumulative')).not.toHaveText('—');
      await expect(page.locator('#strip-cumulative'))
        .toHaveText(await page.locator('#tile-cumulative').textContent() ?? '');

      // And the chart comes back in one press.
      await page.locator('#strip-jump').click();
      await expect(page.locator('.chart-figure')).toBeInViewport();
      await expect(strip).toBeHidden();
    });

  // On a phone the sliders sit above the chart entirely, so the strip earns
  // its place from the first moment: the reader can reach every slider before
  // the chart comes into view at all.
  test('is already up on a phone, where the chart starts below the fold',
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 720 });
      await page.goto('/');
      await expect(page.locator('#scenario-strip')).toBeVisible();
      await expect(page.locator('.chart-figure')).not.toBeInViewport();

      await page.locator('#strip-jump').click();
      await expect(page.locator('.chart-figure')).toBeInViewport();
      await expect(page.locator('#scenario-strip')).toBeHidden();
    });

  test('tracks the sliders while the chart is out of sight', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto('/');
    await expect(page.locator('#scenario-strip')).toBeVisible();
    const warmingBefore = await page.locator('#strip-warming').textContent();
    // The methane slider sits at the foot of the column, furthest from the
    // chart, which is the case the strip exists for. Methane moves the
    // warming and leaves the CO2 total alone, so only one of the two changes.
    await page.locator('#input-methane').fill('600');
    await expect(page.locator('#strip-warming')).not.toHaveText(warmingBefore ?? '');

    // A slider that does move the total moves the strip with it.
    const cumulativeBefore = await page.locator('#strip-cumulative').textContent();
    await page.locator('#input-population').fill('11.5');
    await expect(page.locator('#strip-cumulative')).not.toHaveText(cumulativeBefore ?? '');

    // Whatever moved, the strip and the tiles still agree.
    await expect(page.locator('#strip-cumulative'))
      .toHaveText(await page.locator('#tile-cumulative').textContent() ?? '');
    await expect(page.locator('#strip-warming'))
      .toHaveText(await page.locator('#tile-warming').textContent() ?? '');
  });

  // The sliders owned `.readout` first, for the large value under each track.
  // A strip rule reaching those would fix all six to the foot of the window.
  test('leaves the sliders\' own readouts alone', async ({ page }) => {
    await page.goto('/');
    const readouts = page.locator('#controls .readout');
    expect(await readouts.count()).toBe(SLIDER_COUNT);
    for (let index = 0; index < SLIDER_COUNT; index += 1) {
      const position = await readouts.nth(index).evaluate(
        (node) => getComputedStyle(node).position);
      expect(position, `slider readout ${index}`).toBe('static');
    }
  });

  // The strip holds a button at the far end of a fixed row. Widths where its
  // contents stop fitting cut that button off the edge, and because the strip
  // clips rather than pushing the page wide, the sideways-scroll test above
  // never sees it. Both faults were real: at 360px the button sat 12.7px past
  // the edge, and the long label came back at 440px before it fitted.
  test('never clips its own button, at any width', async ({ page }) => {
    for (const width of [320, 360, 380, 414, 430, 440, 460, 479, 480, 481, 560,
      700, 860, 1024, 1280, 1600]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.locator('#scenario-strip').waitFor({ state: 'visible' });
      const box = await page.evaluate(() => {
        const strip = document.getElementById('scenario-strip');
        const inner = strip?.querySelector('.strip-inner');
        const jump = document.getElementById('strip-jump');
        if (!(strip instanceof HTMLElement) || !(inner instanceof HTMLElement)
          || !(jump instanceof HTMLElement)) throw new Error('no strip');
        return {
          overflow: inner.scrollWidth - inner.clientWidth,
          gapRight: strip.getBoundingClientRect().right
            - jump.getBoundingClientRect().right,
          height: strip.getBoundingClientRect().height,
        };
      });
      expect(box.overflow, `${width}px overflows its row`).toBeLessThanOrEqual(0);
      expect(box.gapRight, `${width}px clips the button`).toBeGreaterThanOrEqual(8);
      // The page reserves 108px under its last line for the strip.
      expect(box.height, `${width}px is taller than the room reserved`)
        .toBeLessThanOrEqual(108);
    }
  });

  for (const width of [360, 1280]) {
    test(`looks right at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.locator('#scenario-strip')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('#scenario-strip')).toHaveScreenshot(`strip-${width}.png`);
    });
  }
});

// A mistyped address has to land somewhere that leads back into the site.
test('the 404 page carries the site and its routes', async ({ page }) => {
  const response = await page.goto('/404.html');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('No page at that address');
  await expect(page.locator('.masthead img')).toBeVisible();
  for (const href of ['/', '/learn/', '/library.html', '/bibliography.html']) {
    expect(await page.locator(`a[href="${href}"]`).count(),
      href).toBeGreaterThan(0);
  }
  // It reserves no room for a strip it does not carry.
  await expect(page.locator('#scenario-strip')).toHaveCount(0);
});

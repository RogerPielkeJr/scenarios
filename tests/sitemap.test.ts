import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LEARN_ENTRIES } from '../src/learn/registry.js';

/**
 * The sitemap was hand-kept and went stale as soon as a page was added: it
 * listed ten URLs while the site served twelve. scripts/build_sitemap.py
 * generates it from vite's own entry list now, and this holds the two together
 * so a page cannot ship unlisted again.
 */
describe('the sitemap', () => {
  const xml = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);

  it('lists every Learn More page the registry calls live', () => {
    for (const entry of LEARN_ENTRIES) {
      if (entry.status !== 'live') continue;
      const url = `https://scenarios.thehonestbroker.org/learn/${entry.slug}/`;
      expect(locs, entry.slug).toContain(url);
    }
  });

  it('lists the pages that are not Learn More pages', () => {
    for (const url of ['https://scenarios.thehonestbroker.org/',
                       'https://scenarios.thehonestbroker.org/learn/',
                       'https://scenarios.thehonestbroker.org/library.html',
                       'https://scenarios.thehonestbroker.org/bibliography.html']) {
      expect(locs).toContain(url);
    }
  });

  // A sitemap lists what is worth indexing, and a 404 is not.
  it('leaves the 404 out, and repeats nothing', () => {
    expect(locs.some((l) => l.includes('404'))).toBe(false);
    expect(new Set(locs).size).toBe(locs.length);
  });
});

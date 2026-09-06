import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { existsSync } from 'node:fs';
import { LEARN_ENTRIES } from '../src/learn/registry.js';
import { SOURCES_BY_SLUG, citedSources } from '../src/learn/sources/index.js';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');
const INDEX = read('index.html');
const BIBLIOGRAPHY = read('bibliography.html');
const LEARN_INDEX = read('learn/index.html');
const LIBRARY = read('library.html');
const LEARN_POPULATION = read('learn/population/index.html');
const VITE_CONFIG = read('vite.config.ts');
const PAGES = [
  ['index.html', INDEX],
  ['bibliography.html', BIBLIOGRAPHY],
  ['library.html', LIBRARY],
  ['learn/index.html', LEARN_INDEX],
  ['learn/population/index.html', LEARN_POPULATION],
] as const;

describe('both pages', () => {
  it.each(PAGES)('%s carries the masthead logo', (_name, html) => {
    expect(html).toContain('class="masthead"');
    expect(html).toContain('src="/thb-logo.png"');
    expect(html).toContain('alt="The Honest Broker"');
  });

  it.each(PAGES)('%s links back to The Honest Broker', (_name, html) => {
    expect(html).toContain('href="https://thehonestbroker.org"');
  });

  it.each(PAGES)('%s carries a toolbar and a theme toggle', (_name, html) => {
    expect(html).toContain('class="toolbar"');
    expect(html).toContain('id="theme-toggle"');
  });

  it('links the pages to each other', () => {
    expect(INDEX).toContain('href="/bibliography.html"');
    expect(INDEX).toContain('href="/learn/"');
    expect(BIBLIOGRAPHY).toContain('href="/"');
    expect(LEARN_POPULATION).toContain('href="/learn/"');
  });

  // The scenario travels in the query string, which only a script can write.
  // A link the script cannot find keeps the bare href and resets the reader's
  // six numbers, so every route off a page has to carry an id.
  it.each(PAGES)('%s reaches the library, and the library is reachable', (_name, html) => {
    if (html === LIBRARY) {
      expect(html).toContain('id="back-toolbar"');
      expect(html).toContain('id="bibliography-toolbar"');
    } else {
      expect(html).toContain('id="library-toolbar"');
      expect(html).toContain('href="/library.html"');
    }
  });

  it('builds the library as its own entry point', () => {
    expect(VITE_CONFIG).toContain("library: 'library.html'");
  });

  it.each(PAGES)('%s gives the logo explicit dimensions so it cannot reflow', (_name, html) => {
    expect(html).toMatch(/<img src="\/thb-logo\.png"[^>]*width="216"[^>]*height="216"/);
  });
});

describe('bibliography', () => {
  const entries = BIBLIOGRAPHY.split('<li>').slice(1);

  it('lists the book, the scenarios work, the bounds and the sources', () => {
    for (const heading of ['The book', 'Our work on scenarios',
                           'The two technology bounds', 'Where the numbers come from']) {
      expect(BIBLIOGRAPHY, heading).toContain(heading);
    }
  });

  it('includes The Climate Fix', () => {
    expect(BIBLIOGRAPHY).toContain('The Climate Fix');
    expect(BIBLIOGRAPHY).toContain('Basic Books');
  });

  it('includes the Ausubel papers the two bounds are built from', () => {
    expect(BIBLIOGRAPHY).toContain('Technical progress and climatic change');
    expect(BIBLIOGRAPHY).toContain('Carbon dioxide emissions in a methane economy');
  });

  // Every entry has to be findable. A citation with no link is a dead end for
  // a reader who wants to check it.
  it('gives every entry a link and a plain-language gloss', () => {
    expect(entries.length).toBeGreaterThanOrEqual(14);
    for (const entry of entries) {
      const label = entry.slice(0, 70).replace(/\s+/g, ' ');
      expect(entry, label).toMatch(/href="https?:\/\//);
      expect(entry, label).toContain('class="gloss"');
    }
  });

  it('uses only https links', () => {
    const urls = [...BIBLIOGRAPHY.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1] ?? '');
    expect(urls.filter((u) => u.startsWith('http:'))).toEqual([]);
  });
});

describe('the Learn More pages', () => {
  const live = LEARN_ENTRIES.filter((entry) => entry.status === 'live');

  it('has a page on disk for every entry the registry calls live', () => {
    expect(live.length).toBeGreaterThan(0);
    for (const entry of live) {
      expect(existsSync(resolve(process.cwd(), `learn/${entry.slug}/index.html`)), entry.slug)
        .toBe(true);
      expect(existsSync(resolve(process.cwd(), `src/learn/main-${entry.slug}.ts`)), entry.slug)
        .toBe(true);
    }
  });

  // A page Vite never builds is a 404 for the reader, however complete it is.
  it('builds every live page as its own entry point', () => {
    for (const entry of live) {
      expect(VITE_CONFIG, entry.slug).toContain(`learn/${entry.slug}/index.html`);
    }
    expect(VITE_CONFIG).toContain("learn: 'learn/index.html'");
  });

  it('leaves no page behind for an entry still in preparation', () => {
    for (const entry of LEARN_ENTRIES.filter((candidate) => candidate.status !== 'live')) {
      expect(existsSync(resolve(process.cwd(), `learn/${entry.slug}/index.html`)), entry.slug)
        .toBe(false);
    }
  });

  it('names each page in its own title and heading', () => {
    expect(LEARN_POPULATION).toContain('<title>Population');
    expect(LEARN_POPULATION).toContain('id="learn-title"');
    expect(LEARN_INDEX).toContain('id="learn-main"');
  });
});

describe('the bibliography against the Learn More pages', () => {
  it('holds a source list for every page the registry calls live', () => {
    for (const entry of LEARN_ENTRIES.filter((page) => page.status === 'live')) {
      const sources = SOURCES_BY_SLUG[entry.slug];
      expect(sources, entry.slug).toBeDefined();
      expect(sources?.length ?? 0, entry.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it('lists every work the live pages cite, once each', () => {
    const cited = citedSources();
    const urls = cited.map((entry) => entry.source.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const entry of LEARN_ENTRIES.filter((page) => page.status === 'live')) {
      for (const source of SOURCES_BY_SLUG[entry.slug] ?? []) {
        const found = cited.find((candidate) => candidate.source.url === source.url);
        expect(found, `${entry.slug} → ${source.title}`).toBeDefined();
        expect(found?.pages).toContain(entry.title);
      }
    }
  });

  it('gives every cited work a resolvable link and a plain-language gloss', () => {
    for (const { source } of citedSources()) {
      expect(source.url, source.title).toMatch(/^https:\/\//);
      expect(source.used.length, source.title).toBeGreaterThan(20);
    }
  });

  it('leaves room on the page for the generated list', () => {
    expect(BIBLIOGRAPHY).toContain('id="learn-sources"');
    expect(BIBLIOGRAPHY).toContain('Behind the Learn More pages');
  });
});

describe('the two sibling sites', () => {
  it('links the front page and the bibliography to the decarbonization dashboard', () => {
    for (const [name, html] of [['index.html', INDEX], ['bibliography.html', BIBLIOGRAPHY]] as const) {
      expect(html, name).toContain('https://decarbonization.thehonestbroker.org');
    }
  });

  // The two sites measure carbon intensity on different bases and publish
  // different rates for it. Whichever page a reader lands on has to say so.
  it('explains the figure that differs between them', async () => {
    const { CARBON_INTENSITY_PAGE } = await import('../src/learn/carbon_intensity.js');
    const prose = CARBON_INTENSITY_PAGE.definition.paragraphs.join(' ');
    expect(prose).toContain('decarbonization.thehonestbroker.org');
    expect(prose).toContain('Neither figure corrects the other');
  });
});

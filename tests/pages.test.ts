import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');
const INDEX = read('index.html');
const BIBLIOGRAPHY = read('bibliography.html');
const PAGES = [['index.html', INDEX], ['bibliography.html', BIBLIOGRAPHY]] as const;

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

  it('links the two pages to each other', () => {
    expect(INDEX).toContain('href="/bibliography.html"');
    expect(BIBLIOGRAPHY).toContain('href="/"');
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

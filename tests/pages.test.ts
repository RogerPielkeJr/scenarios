import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_URL } from '../src/ui/toolbar.js';

import { existsSync } from 'node:fs';
import { LEARN_ENTRIES } from '../src/learn/registry.js';
import { SOURCES_BY_SLUG, citedSources } from '../src/learn/sources/index.js';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');
const INDEX = read('index.html');
const BIBLIOGRAPHY = read('bibliography.html');
const LEARN_INDEX = read('learn/index.html');
const LIBRARY = read('library.html');
const LEARN_POPULATION = read('learn/population/index.html');
const NOT_FOUND = read('404.html');
const VITE_CONFIG = read('vite.config.ts');
const PAGES = [
  ['index.html', INDEX],
  ['bibliography.html', BIBLIOGRAPHY],
  ['library.html', LIBRARY],
  ['learn/index.html', LEARN_INDEX],
  ['learn/population/index.html', LEARN_POPULATION],
] as const;

/** The file scripts/build_methodology_pdf.py writes, served from the site root. */
const METHODOLOGY_PDF = '/thb-scenario-builder-methodology.pdf';

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

  // The notice stands on every page, not only the front one, because a reader
  // can land on any of them from a link.
  it.each(PAGES)('%s carries the work-in-progress notice', (_name, html) => {
    expect(html).toContain('This is work in progress');
    expect(html).toContain('caveat lector');
    expect(html).toContain('data-feedback>Provide feedback</span>');
  });

  // The markup ships the words and `linkFeedback` makes them a link at
  // runtime, so nothing above this catches where they point. Between the
  // site going live and the announcement post going up, they pointed at the
  // Substack front page: a reader with an error to report landed on a list of
  // posts. That was deliberate and temporary; this makes it visible if it
  // ever becomes permanent by accident.
  it('sends feedback to the announcement post, not the Substack front page', () => {
    expect(FEEDBACK_URL).not.toBeNull();
    expect(FEEDBACK_URL).toMatch(/^https:\/\//);
    expect(FEEDBACK_URL, 'a /p/ path is what makes it a post rather than the front page')
      .toContain('/p/');
  });
});

// A link posted to Substack or X renders from these. Without them the site
// arrives as a grey box on the day it is announced, and nothing in the build
// would have said so.
describe('the tags a shared link renders from', () => {
  const SITE = 'https://scenarios.thehonestbroker.org';

  it.each(PAGES)('%s carries a favicon and a theme colour', (_name, html) => {
    expect(html).toContain('rel="icon" href="/thb-logo.png"');
    expect(html).toContain('name="theme-color"');
  });

  it.each(PAGES)('%s carries a canonical URL on this domain', (_name, html) => {
    expect(html).toMatch(new RegExp(`<link rel="canonical" href="${SITE}[^"]*">`));
  });

  it.each(PAGES)('%s carries a card with an image, a title and a description',
    (_name, html) => {
      for (const tag of ['og:type', 'og:site_name', 'og:url', 'og:title', 'og:description',
        'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) {
        expect(html, tag).toContain(`property="${tag}"`);
      }
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain(`content="${SITE}/social-card.png"`);
    });

  // The card's title and description have to say what the page is, and every
  // page has to differ from the others, or ten links all preview the same.
  it('gives every page its own card title', () => {
    const titles = PAGES.map(([, html]) =>
      /<meta property="og:title" content="([^"]*)"/.exec(html)?.[1] ?? '');
    expect(titles.every((title) => title.length > 10)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('has the image the cards point at', () => {
    expect(existsSync(resolve(process.cwd(), 'public/social-card.png'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'scripts/build_social_card.py'))).toBe(true);
  });

  it('lists every page in the sitemap', () => {
    const sitemap = read('public/sitemap.xml');
    for (const path of ['/', '/learn/', '/library.html', '/bibliography.html',
      '/learn/population/', '/learn/methane/']) {
      expect(sitemap, path).toContain(`<loc>${SITE}${path}</loc>`);
    }
    expect(read('public/robots.txt')).toContain(`${SITE}/sitemap.xml`);
  });
});

// Most of every page is built in the browser, so a reader with scripting off
// sees headings and empty boxes unless the page says why.
describe('scripting off', () => {
  it.each(PAGES)('%s explains itself without JavaScript', (_name, html) => {
    expect(html).toContain('<noscript>');
    expect(html).toContain('needs JavaScript switched on');
  });
});

describe('the methodology PDF', () => {
  // A button pointing at a file nobody built is a 404 on the live site, and
  // neither the type checker nor the bundler would notice.
  it('exists where both links point', () => {
    expect(existsSync(resolve(process.cwd(), `public${METHODOLOGY_PDF}`))).toBe(true);
  });

  it('is reachable from the library page and from the front page', () => {
    expect(LIBRARY).toContain(`href="${METHODOLOGY_PDF}"`);
    expect(LIBRARY).toContain('Methodology (PDF)');
    expect(INDEX).toContain(`href="${METHODOLOGY_PDF}"`);
  });

  // The PDF is three files bound together. A part that stops existing would
  // build a document quietly missing a third of itself.
  it('is built from the three documents it names', () => {
    const script = read('scripts/build_methodology_pdf.py');
    for (const part of ['METHODOLOGY.md', 'METHODS.md', 'DATA.md']) {
      expect(script, part).toContain(part);
      expect(existsSync(resolve(process.cwd(), part)), part).toBe(true);
    }
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

// GitHub Pages serves /404.html for any address it cannot match. Without one
// a mistyped link lands the reader on GitHub's own grey page, off the site
// entirely, with no way back.
describe('the 404 page', () => {
  it('exists and is built as its own entry point', () => {
    expect(existsSync(resolve(process.cwd(), '404.html'))).toBe(true);
    expect(VITE_CONFIG).toContain("'not-found': '404.html'");
  });

  it('wears the furniture every other page wears', () => {
    expect(NOT_FOUND).toContain('class="masthead"');
    expect(NOT_FOUND).toContain('id="theme-toggle"');
    expect(NOT_FOUND).toContain('This is work in progress');
    expect(NOT_FOUND).toContain('data-feedback>Provide feedback</span>');
  });

  // Its whole job is to put the reader back on the site.
  it('offers every part of the site', () => {
    for (const href of ['/', '/learn/', '/library.html', '/bibliography.html',
      METHODOLOGY_PDF]) {
      expect(NOT_FOUND, href).toContain(`href="${href}"`);
    }
  });

  // A missing page has no content to index and no preview worth rendering,
  // and a canonical URL on it would tell a crawler the opposite.
  it('asks not to be indexed, and claims no canonical URL or card', () => {
    expect(NOT_FOUND).toContain('name="robots" content="noindex, follow"');
    expect(NOT_FOUND).not.toContain('rel="canonical"');
    expect(NOT_FOUND).not.toContain('property="og:');
  });

  it('stays out of the sitemap', () => {
    expect(read('public/sitemap.xml')).not.toContain('404');
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

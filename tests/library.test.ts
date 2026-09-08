// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBRARY_SECTIONS, libraryEntries } from '../src/library/entries.js';
import { mountLibrary, readableDate } from '../src/library/page.js';
import { decodeScenario, encodeScenario, type Scenario } from '../src/state.js';

const HTML = readFileSync(resolve(process.cwd(), 'library.html'), 'utf8');

const SCENARIO: Scenario = {
  inputs: {
    population: 9.4, income: 2.1, energyPerDollar: -1.8,
    co2PerEnergy: -0.9, landUse: -2.5, methane: 220,
    improvementTiming: 50, removals: 0,
  },
  name: 'Slow build-out',
};

function loadPage(search: string): void {
  const body = HTML.slice(HTML.indexOf('<body>') + '<body>'.length, HTML.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', `/library.html${search}`);
}

describe('the library entries', () => {
  const entries = libraryEntries();

  it('holds every section, each with posts under it', () => {
    expect(LIBRARY_SECTIONS.length).toBeGreaterThanOrEqual(3);
    for (const section of LIBRARY_SECTIONS) {
      expect(section.entries.length, section.title).toBeGreaterThanOrEqual(3);
      expect(section.note.length, section.title).toBeGreaterThan(40);
    }
    const ids = LIBRARY_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // A post listed twice under two arguments wastes a card and reads as an
  // oversight, and a slug that misses its URL sends the reader nowhere.
  it('lists every post once, at its own address', () => {
    const slugs = entries.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const entry of entries) {
      expect(entry.url, entry.title)
        .toBe(`https://rogerpielkejr.substack.com/p/${entry.slug}`);
    }
  });

  it('dates every post, and none in the future', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const entry of entries) {
      expect(entry.date, entry.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date)), entry.title).toBe(false);
      expect(entry.date.localeCompare(today), entry.title).toBeLessThanOrEqual(0);
    }
  });

  it('gives every post a cover and a gloss that says what it holds', () => {
    for (const entry of entries) {
      expect(entry.image, entry.title).toMatch(/^https:\/\//);
      expect(entry.gloss.length, entry.title).toBeGreaterThan(60);
      expect(entry.gloss.length, entry.title).toBeLessThan(300);
      // A gloss that restates the title tells a reader nothing new.
      expect(entry.gloss.toLowerCase(), entry.title)
        .not.toBe(entry.title.toLowerCase());
    }
  });

  it('reads dates as a person writes them, with no timezone to shift them', () => {
    expect(readableDate('2026-07-15')).toBe('July 15, 2026');
    expect(readableDate('2020-11-30')).toBe('November 30, 2020');
    expect(readableDate('2025-04-28')).toBe('April 28, 2025');
  });

  it('orders newest first', () => {
    const dates = entries.map((entry) => entry.date);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });
});

describe('the library page', () => {
  it('builds a card for every post, each opening the post itself', () => {
    loadPage('');
    mountLibrary(document);
    const cards = Array.from(document.querySelectorAll('a.library-card'));
    expect(cards.length).toBe(libraryEntries().length);
    for (const card of cards) {
      expect(card.getAttribute('href')).toMatch(/^https:\/\/rogerpielkejr\.substack\.com\/p\//);
      expect(card.getAttribute('rel')).toBe('noopener');
      expect(card.querySelector('img.library-cover')).not.toBeNull();
      expect(card.querySelector('h3')?.textContent).not.toBe('');
      expect(card.querySelector('.gloss')?.textContent).not.toBe('');
    }
  });

  it('heads each section with its own title and note', () => {
    loadPage('');
    mountLibrary(document);
    for (const section of LIBRARY_SECTIONS) {
      const block = document.getElementById(section.id);
      expect(block, section.id).not.toBeNull();
      expect(block?.querySelector('h2')?.textContent).toBe(section.title);
      expect(block?.querySelector('.block-note')?.textContent).toBe(section.note);
      expect(block?.querySelectorAll('a.library-card').length).toBe(section.entries.length);
    }
  });

  // The same bug the Learn More pages had: a bare href on the way out drops
  // the six numbers and the name, and the reader gets the defaults back.
  it('carries the scenario back into the builder and on to the other pages', () => {
    loadPage(`?${encodeScenario(SCENARIO)}`);
    mountLibrary(document);

    const back = document.getElementById('back-toolbar')?.getAttribute('href') ?? '';
    expect(decodeScenario(back.split('#')[1] ?? '')).toEqual(SCENARIO);

    const inPage = document.querySelector('.back-strip a')?.getAttribute('href') ?? '';
    expect(decodeScenario(inPage.split('#')[1] ?? '')).toEqual(SCENARIO);

    for (const [id, path] of [['learn-toolbar', '/learn/'],
      ['bibliography-toolbar', '/bibliography.html']] as const) {
      const href = document.getElementById(id)?.getAttribute('href') ?? '';
      expect(href.startsWith(`${path}?`), id).toBe(true);
      expect(decodeScenario(href.split('?')[1] ?? ''), id).toEqual(SCENARIO);
    }
  });

  it('offers a fresh start to a reader who arrives with no scenario', () => {
    loadPage('');
    mountLibrary(document);
    expect(document.querySelector('.back-strip a')?.textContent)
      .toBe('← Start a fresh scenario');
  });

  it('ends by pointing at the archive, for the posts it left out', () => {
    loadPage('');
    mountLibrary(document);
    const strips = Array.from(document.querySelectorAll('.back-strip a'));
    const last = strips[strips.length - 1];
    expect(last?.getAttribute('href')).toBe('https://rogerpielkejr.substack.com/archive');
  });
});

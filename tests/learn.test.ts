// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountLearnPage } from '../src/ui/learn/page.js';
import { POPULATION_PAGE } from '../src/learn/population.js';
import { LEARN_ENTRIES } from '../src/learn/registry.js';
import { decodeScenario, encodeScenario, type Scenario } from '../src/state.js';
import { INPUT_IDS } from '../src/model/types.js';
import populationData from '../src/data/learn_population.json';

const HTML = readFileSync(resolve(process.cwd(), 'learn/population/index.html'), 'utf8');

const SCENARIO: Scenario = {
  inputs: {
    population: 9.4, income: 2.1, energyPerDollar: -1.8,
    co2PerEnergy: -0.9, landUse: -2.5, methane: 220,
  },
  name: 'Slow build-out',
};

function loadPage(search: string): void {
  const body = HTML.slice(HTML.indexOf('<body>') + '<body>'.length, HTML.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', `/learn/population/${search}`);
}

describe('the population page', () => {
  beforeEach(() => { loadPage(`?${encodeScenario(SCENARIO)}`); });

  it('renders every panel', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    const report = page.lastReport();
    expect(report?.panels.filter((p) => !p.ok).map((p) => `${p.name}: ${p.error}`)).toEqual([]);
  });

  it('fills every output the page promises', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    const outputs = page.lastReport()?.outputs ?? {};
    for (const [id, text] of Object.entries(outputs)) {
      expect(text, `#${id}`).not.toBe('');
      expect(text, `#${id}`).not.toBe('unavailable');
    }
  });

  it('draws the chart under the DOM stub', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    const markup = page.chart.innerHTML;
    for (const id of ['history', 'un-medium', 'SSP1', 'SSP2', 'SSP3', 'reader']) {
      expect(markup, id).toContain(`data-series="${id}"`);
    }
    expect(markup).toContain('data-band="un-95"');
    // Seven markers, each with its own dot at 2100.
    expect(markup.match(/data-point="/g)?.length).toBe(7);
  });

  it('opens every region at the UN medium variant, summing to the UN world medium', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    const outcome = page.builder.outcome();
    expect(outcome.value).toBeCloseTo(populationData.constants.world2100.medium, 2);
  });

  it('produces the sum its inputs imply', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    for (const part of POPULATION_PAGE.builder.parts) page.builder.set(part.id, part.min);
    expect(page.builder.outcome().value)
      .toBeCloseTo(populationData.constants.world2100.low, 2);

    for (const part of POPULATION_PAGE.builder.parts) page.builder.set(part.id, part.max);
    expect(page.builder.outcome().value)
      .toBeCloseTo(populationData.constants.world2100.high, 2);
  });

  it('shows the reader the rounded value before they commit', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    const fit = page.builder.fitted();
    const shown = document.querySelector('.builder-fit')?.textContent ?? '';
    expect(shown).toContain(fit.value.toFixed(1));
  });

  it('says so when the value clamps to the end of the slider', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    for (const part of POPULATION_PAGE.builder.parts) page.builder.set(part.id, part.max);
    expect(page.builder.fitted().clamped).toBe('max');
    expect(document.querySelector('.builder-fit')?.textContent).toContain('stops at');
  });

  it('replaces one field and returns the other five untouched', () => {
    const page = mountLearnPage(POPULATION_PAGE);
    for (const part of POPULATION_PAGE.builder.parts) page.builder.set(part.id, part.min);
    const href = page.builder.href();
    expect(href).toContain('?applied=population');
    const returned = decodeScenario(href.slice(href.indexOf('#')));
    expect(returned).not.toBeNull();
    expect(returned?.inputs.population).toBe(page.builder.fitted().value);
    for (const id of INPUT_IDS) {
      if (id === 'population') continue;
      expect(returned?.inputs[id], id).toBe(SCENARIO.inputs[id]);
    }
    expect(returned?.name).toBe(SCENARIO.name);
  });

  it('carries the state back unchanged on the back links', () => {
    mountLearnPage(POPULATION_PAGE);
    const links = [...document.querySelectorAll('.back-link')] as HTMLAnchorElement[];
    expect(links).toHaveLength(2);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(decodeScenario(href.slice(href.indexOf('#')))).toEqual(SCENARIO);
      expect(link.textContent).toContain('Back to my scenario');
    }
  });

  it('opens on the defaults and offers a fresh start with no state', () => {
    loadPage('');
    const page = mountLearnPage(POPULATION_PAGE);
    expect(page.scenario.name).toBe('');
    expect(document.querySelector('.back-link')?.textContent).toContain('fresh scenario');
  });

  it('inks its own factor in the identity and links the live ones', () => {
    mountLearnPage(POPULATION_PAGE);
    const active = document.querySelector('.identity .factor.is-active');
    expect(active?.textContent).toBe('People');
    expect(active?.tagName).toBe('SPAN');
  });

  it('lists the other five pages', () => {
    mountLearnPage(POPULATION_PAGE);
    const items = document.querySelectorAll('.sibling-list > li');
    expect(items).toHaveLength(LEARN_ENTRIES.length - 1);
  });

  it('gives every source a link, a vintage and a use', () => {
    expect(POPULATION_PAGE.sources.length).toBeGreaterThanOrEqual(4);
    expect(POPULATION_PAGE.sources.length).toBeLessThanOrEqual(8);
    for (const source of POPULATION_PAGE.sources) {
      expect(source.url, source.title).toMatch(/^https:\/\//);
      expect(source.vintage, source.title).not.toBe('');
      expect(source.used, source.title).not.toBe('');
    }
  });
});

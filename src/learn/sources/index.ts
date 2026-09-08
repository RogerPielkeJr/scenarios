/**
 * Every source the Learn More pages cite, keyed by page.
 *
 * Kept apart from the pages themselves so the bibliography can read the
 * lists without pulling in eight data files, and apart from the bibliography
 * page so a test can read them without a DOM.
 */
import type { Source } from '../types.js';
import { LEARN_ENTRIES } from '../registry.js';
import { POPULATION_SOURCES } from './population.js';
import { INCOME_SOURCES } from './income.js';
import { ENERGY_INTENSITY_SOURCES } from './energy_intensity.js';
import { CARBON_INTENSITY_SOURCES } from './carbon_intensity.js';
import { LAND_USE_SOURCES } from './land_use.js';
import { METHANE_SOURCES } from './methane.js';
import { TIMING_SOURCES } from './timing.js';
import { REMOVAL_SOURCES } from './removal.js';

export const SOURCES_BY_SLUG: Readonly<Record<string, readonly Source[]>> = {
  population: POPULATION_SOURCES,
  income: INCOME_SOURCES,
  'energy-intensity': ENERGY_INTENSITY_SOURCES,
  'carbon-intensity': CARBON_INTENSITY_SOURCES,
  'land-use': LAND_USE_SOURCES,
  methane: METHANE_SOURCES,
  timing: TIMING_SOURCES,
  removal: REMOVAL_SOURCES,
};

export interface Cited {
  source: Source;
  /** Which pages cite it, since several share a source. */
  pages: string[];
}

/**
 * One entry per work, however many pages cite it, in the order a reader
 * meets them. Generated from the pages themselves, so a source added to a
 * page arrives in the bibliography without anyone copying it across.
 */
export function citedSources(): Cited[] {
  const byUrl = new Map<string, Cited>();
  for (const entry of LEARN_ENTRIES) {
    if (entry.status !== 'live') continue;
    for (const source of SOURCES_BY_SLUG[entry.slug] ?? []) {
      const found = byUrl.get(source.url);
      if (found === undefined) byUrl.set(source.url, { source, pages: [entry.title] });
      else found.pages.push(entry.title);
    }
  }
  return [...byUrl.values()];
}

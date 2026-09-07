import { analogueFor } from '../model/analogue.js';
import { ANCHORS, addedWarming, warming } from '../model/emulator.js';
import { MARKER_BY_ID, placeAmongMarkers, type PublishedPath } from '../model/markers.js';
import type { ScenarioInputs, ScenarioPath } from '../model/types.js';
import { degrees, perDollar, signedDegrees, thousands } from '../format.js';

const HIGH = MARKER_BY_ID['H'];

export interface StatTiles {
  cumulative: HTMLElement;
  cumulativeNote: HTMLElement;
  warming: HTMLElement;
  warmingNote: HTMLElement;
  added: HTMLElement;
  addedNote: HTMLElement;
  analogue: HTMLElement;
  analogueNote: HTMLElement;
}

/**
 * The three numbers the tiles lead with.
 *
 * With a published scenario on screen these report that scenario's published
 * totals rather than the reconstruction's, because the chart above them draws
 * its published path.
 *
 * The tiles and the readout strip both draw from here, so a reader looking at
 * one and then the other can never be handed two different answers.
 */
export interface ScenarioSummary {
  cumulativeGt: number;
  warmingC: number;
  addedC: number;
}

export function scenarioSummary(
  inputs: ScenarioInputs,
  path: ScenarioPath,
  published: PublishedPath | null = null,
): ScenarioSummary {
  if (published !== null) {
    return {
      cumulativeGt: published.cumulativeGt,
      warmingC: published.warmingC,
      addedC: published.warmingC - ANCHORS.recentMeanC,
    };
  }
  return {
    cumulativeGt: path.cumulativeGt,
    warmingC: warming(path.cumulativeGt, inputs.methane),
    addedC: addedWarming(path.cumulativeGt, inputs.methane),
  };
}

/**
 * The four tiles.
 *
 * The country comparison keeps coming from the Kaya factors, which supply the
 * only 2100 carbon intensity either way.
 */
export function renderStats(
  tiles: StatTiles,
  inputs: ScenarioInputs,
  path: ScenarioPath,
  published: PublishedPath | null = null,
): void {
  const summary = scenarioSummary(inputs, path, published);
  tiles.cumulative.textContent = thousands(summary.cumulativeGt);
  const highNote = HIGH === undefined ? 'GtCO2'
    : `GtCO2 · CMIP7 HIGH reaches ${thousands(HIGH.cumulativeGt)}`;
  tiles.cumulativeNote.textContent = published === null
    ? highNote
    : `GtCO2 · as published by ${published.label}`;

  tiles.warming.textContent = degrees(summary.warmingC);
  tiles.warmingNote.textContent = published === null
    ? placeAmongMarkers(summary.warmingC)
    : `as published by ${published.label}`;

  tiles.added.textContent = signedDegrees(summary.addedC);
  tiles.addedNote.textContent =
    `above the ${ANCHORS.recentPeriod} average of ${ANCHORS.recentMeanC.toFixed(2)} °C`;

  const analogue = analogueTile(path.final.kgCo2PerUsd);
  tiles.analogue.textContent = analogue.value;
  tiles.analogueNote.textContent = analogue.note;
}

/**
 * The country tile's two lines, for the page and for the downloaded sheet
 * alike, so a reader comparing the two is never given different answers.
 *
 * Only a match names an economy. The other three verdicts say plainly that
 * the table holds none, and name the economy at the edge so the reader keeps
 * a bearing: a 2100 world at 0.011 kg CO2 per dollar resembles nothing on
 * earth today, and saying "Switzerland", which emits four times that, was
 * worse than saying nothing.
 */
export function analogueTile(intensity: number): { value: string; note: string } {
  const per = `${perDollar(intensity)} kg CO2 per dollar`;
  const verdict = analogueFor(intensity);
  if (verdict === null) return { value: 'no comparison', note: per };
  if (verdict.kind === 'match') {
    return {
      value: verdict.country.name,
      note: `${per} · ${verdict.country.name} emits ${perDollar(verdict.country.kg_co2_per_usd)}`,
    };
  }
  if (verdict.kind === 'cleaner') {
    return {
      value: 'no economy this clean',
      note: `${per} · the cleanest today is ${verdict.nearest.name} at `
        + `${perDollar(verdict.nearest.kg_co2_per_usd)}`,
    };
  }
  if (verdict.kind === 'dirtier') {
    return {
      value: 'no economy this carbon-intensive',
      note: `${per} · the highest today is ${verdict.nearest.name} at `
        + `${perDollar(verdict.nearest.kg_co2_per_usd)}`,
    };
  }
  return {
    value: 'no close match',
    note: `${per} · the nearest is ${verdict.nearest.name} at `
      + `${perDollar(verdict.nearest.kg_co2_per_usd)}`,
  };
}

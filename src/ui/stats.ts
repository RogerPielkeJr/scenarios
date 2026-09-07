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

  const intensity = path.final.kgCo2PerUsd;
  const country = analogueFor(intensity);
  if (country === null) {
    tiles.analogue.textContent = 'no economy today';
    tiles.analogueNote.textContent = 'cleaner than anywhere on earth';
  } else {
    tiles.analogue.textContent = country.name;
    tiles.analogueNote.textContent =
      `${perDollar(intensity)} kg CO2 per dollar · ${country.name} emits `
      + `${perDollar(country.kg_co2_per_usd)}`;
  }
}

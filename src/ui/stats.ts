import { nearestAnalogue } from '../model/analogue.js';
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
 * The four tiles.
 *
 * With a published scenario on screen the first three report that scenario's
 * own published totals rather than the reconstruction's, because the chart
 * above them draws its published path. The country comparison keeps coming
 * from the Kaya factors, which supply the only 2100 carbon intensity either
 * way.
 */
export function renderStats(
  tiles: StatTiles,
  inputs: ScenarioInputs,
  path: ScenarioPath,
  published: PublishedPath | null = null,
): void {
  const cumulativeGt = published === null ? path.cumulativeGt : published.cumulativeGt;
  tiles.cumulative.textContent = thousands(cumulativeGt);
  const highNote = HIGH === undefined ? 'GtCO2'
    : `GtCO2 · CMIP7 HIGH reaches ${thousands(HIGH.cumulativeGt)}`;
  tiles.cumulativeNote.textContent = published === null
    ? highNote
    : `GtCO2 · as published by ${published.label}`;

  const t = published === null ? warming(path.cumulativeGt, inputs.methane) : published.warmingC;
  tiles.warming.textContent = degrees(t);
  tiles.warmingNote.textContent = published === null
    ? placeAmongMarkers(t)
    : `as published by ${published.label}`;

  const added = published === null
    ? addedWarming(path.cumulativeGt, inputs.methane)
    : published.warmingC - ANCHORS.recentMeanC;
  tiles.added.textContent = signedDegrees(added);
  tiles.addedNote.textContent =
    `above the ${ANCHORS.recentPeriod} average of ${ANCHORS.recentMeanC.toFixed(2)} °C`;

  const intensity = path.final.kgCo2PerUsd;
  const country = nearestAnalogue(intensity);
  if (country === null) {
    tiles.analogue.textContent = 'no economy today';
    tiles.analogueNote.textContent = 'cleaner than anywhere on earth';
  } else {
    tiles.analogue.textContent = country.name;
    tiles.analogueNote.textContent =
      `${perDollar(intensity)} kg CO2 per dollar · ${country.name} runs `
      + `${perDollar(country.kg_co2_per_usd)}`;
  }
}

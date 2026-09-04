import { nearestAnalogue } from '../model/analogue.js';
import { ANCHORS, addedWarming, warming } from '../model/emulator.js';
import { MARKER_BY_ID, placeAmongMarkers } from '../model/markers.js';
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

export function renderStats(
  tiles: StatTiles,
  inputs: ScenarioInputs,
  path: ScenarioPath,
): void {
  tiles.cumulative.textContent = thousands(path.cumulativeGt);
  tiles.cumulativeNote.textContent = HIGH === undefined
    ? 'GtCO2'
    : `GtCO2 · CMIP7 HIGH is ${thousands(HIGH.cumulativeGt)}`;

  const t = warming(path.cumulativeGt, inputs.methane);
  tiles.warming.textContent = degrees(t);
  tiles.warmingNote.textContent = placeAmongMarkers(t);

  tiles.added.textContent = signedDegrees(addedWarming(path.cumulativeGt, inputs.methane));
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
      `${perDollar(intensity)} kg CO2 per dollar · ${country.name} is ${perDollar(country.kg_co2_per_usd)}`;
  }
}

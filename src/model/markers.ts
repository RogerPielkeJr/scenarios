import markersJson from '../data/markers.json';
import type { InputId } from './types.js';

export interface MarkerKaya {
  populationBn: number;
  income: number;
  energyPerDollar: number;
  co2PerEnergy: number | null;
  landUse: number;
  methane: number;
}

export interface Marker {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  order: number;
  co2Gt: readonly number[];
  cumulativeGt: number;
  methaneMt: number;
  landUseGt: number;
  warmingC: number;
  kaya: MarkerKaya;
}

export const MARKER_YEARS: readonly number[] = markersJson.years;
export const MARKERS = markersJson.markers as readonly Marker[];

export const MARKER_BY_ID: Readonly<Record<string, Marker>> = Object.freeze(
  Object.fromEntries(MARKERS.map((m) => [m.id, m])),
);

/**
 * The marker value that belongs under a given slider, or null if unpublished.
 *
 * Timing and removal carry no published value to put a tick on. The markers
 * report six Kaya numbers each; the pair this model needs beyond those comes
 * from fitting each marker's CO2 path in scripts/build_carried_data.py, which
 * makes them derived quantities rather than something a marker states. A tick
 * would claim otherwise, so those two sliders carry none.
 */
export function markerValueFor(marker: Marker, input: InputId): number | null {
  switch (input) {
    case 'population': return marker.kaya.populationBn;
    case 'income': return marker.kaya.income;
    case 'energyPerDollar': return marker.kaya.energyPerDollar;
    case 'co2PerEnergy': return marker.kaya.co2PerEnergy;
    case 'landUse': return marker.kaya.landUse;
    case 'methane': return marker.kaya.methane;
    case 'improvementTiming': return null;
    case 'removals': return null;
  }
}

/** One marker's own published path, in the shape the chart draws. */
export interface PublishedPath {
  points: Array<{ year: number; co2Gt: number }>;
  cumulativeGt: number;
  warmingC: number;
  label: string;
}

/**
 * A marker's published emissions path, five-yearly to 2100.
 *
 * Loading a CMIP7 preset highlights this behind the ink, which stays the Kaya
 * reconstruction the sliders drive. Drawing the published path as the ink
 * instead made one step of the population slider look like it raised warming
 * by 0.18 degrees when it had lowered it by 0.002. Moving any slider drops
 * the highlight and leaves the reconstruction alone.
 */
export function publishedPath(marker: Marker): PublishedPath {
  return {
    points: MARKER_YEARS.map((year, index) => ({
      year,
      co2Gt: marker.co2Gt[index] ?? 0,
    })),
    cumulativeGt: marker.cumulativeGt,
    warmingC: marker.warmingC,
    label: `CMIP7 ${marker.label}`,
  };
}

/**
 * What to call the ink line while a CMIP7 preset is loaded.
 *
 * The ink is the Kaya reconstruction of that marker, and the marker's own
 * path sits highlighted behind it under the same name, so the label has to
 * separate the two. The chart and the downloaded sheet both read this, after
 * the sheet spent a while calling the reconstruction "as published".
 */
export function reconstructionLabel(published: PublishedPath): string {
  return `${published.label} reconstructed`;
}

/**
 * Plain-language placement of a warming figure among the markers, e.g.
 * "between CMIP7 MEDIUM and HIGH" or "above CMIP7 HIGH".
 */
export function placeAmongMarkers(warmingC: number, nearTolerance = 0.06, edge = 0.02): string {
  const ladder = [...MARKERS].sort((x, y) => x.warmingC - y.warmingC);
  const coolest = ladder[0];
  const warmest = ladder[ladder.length - 1];
  if (coolest === undefined || warmest === undefined) return '';
  if (warmingC < coolest.warmingC - edge) return 'below every CMIP7 scenario';
  if (warmingC > warmest.warmingC + edge) return `above CMIP7 ${warmest.label}`;

  let lower = coolest;
  let upper = warmest;
  for (let i = 0; i < ladder.length - 1; i += 1) {
    const a = ladder[i];
    const b = ladder[i + 1];
    if (a === undefined || b === undefined) continue;
    if (warmingC >= a.warmingC && warmingC <= b.warmingC) {
      lower = a;
      upper = b;
      break;
    }
  }
  const nearest = Math.abs(warmingC - lower.warmingC) < Math.abs(warmingC - upper.warmingC)
    ? lower : upper;
  return Math.abs(warmingC - nearest.warmingC) < nearTolerance
    ? `about CMIP7 ${nearest.label}`
    : `between CMIP7 ${lower.label} and ${upper.label}`;
}

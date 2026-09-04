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

/** The marker value that belongs under a given slider, or null if unpublished. */
export function markerValueFor(marker: Marker, input: InputId): number | null {
  switch (input) {
    case 'population': return marker.kaya.populationBn;
    case 'income': return marker.kaya.income;
    case 'energyPerDollar': return marker.kaya.energyPerDollar;
    case 'co2PerEnergy': return marker.kaya.co2PerEnergy;
    case 'landUse': return marker.kaya.landUse;
    case 'methane': return marker.kaya.methane;
  }
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

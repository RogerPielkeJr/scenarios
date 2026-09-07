import notesJson from '../data/notes.json';
import { OBSERVED_RATES } from './config.js';
import { PRESET_BY_ID, presetByLabel } from './bounds.js';
import { computePath } from './kaya.js';
import { MARKER_BY_ID, MARKER_YEARS } from './markers.js';
import { outsideUnRange } from './population.js';
import type { ScenarioInputs, ScenarioPath } from './types.js';
import { at } from './types.js';

const T = notesJson.thresholds;

/**
 * The two technology bounds, computed from the bound presets rather than
 * carried as constants, so they follow the model instead of drifting from it.
 */
function boundTotals(): { slow: number; fast: number } {
  const slow = presetByLabel('Slowest technical progress');
  const fast = presetByLabel('Ausubel methane economy');
  return {
    slow: slow ? computePath(slow.inputs).cumulativeGt : Infinity,
    fast: fast ? computePath(fast.inputs).cumulativeGt : 0,
  };
}

export const BOUNDS = boundTotals();

/** How a reader's rate compares with the observed one. Null when unusable. */
function ratio(value: number, observed: number): number | null {
  return Math.abs(observed) < 0.001 ? null : value / observed;
}

export interface ScenarioFlags {
  /** Reader's rate divided by the observed rate, or null. */
  efficiencyRatio: number | null;
  fuelMixRatio: number | null;
  incomeRatio: number | null;
  populationOutsideUn: 'above' | 'below' | null;
  efficiencySlowerThanRecord: boolean;
  fuelMixFasterThanAnyScenario: boolean;
  aboveSlowBound: boolean;
  belowFastBound: boolean;
  /** Combinations no marker contains. */
  coherence: {
    fastFuelMixSlowEfficiency: boolean;
    fastEfficiencyStaticFuelMix: boolean;
    stagnantEconomyFastEfficiency: boolean;
    largeSinkUnchangedFuelMix: boolean;
  };
  /** How closely a loaded CMIP7 preset reproduces the marker it names. */
  markerFidelity: MarkerFidelity | null;
  /** True while the chart draws a published path rather than the reconstruction. */
  showingPublished: boolean;
}

/**
 * A CMIP7 preset sets the sliders to the Kaya factors that marker reports.
 * Compounding those factors at a constant rate reproduces where the marker
 * ends up far better than how it gets there, and this records both, so the
 * interface can say which by how much instead of waving at it.
 */
export interface MarkerFidelity {
  markerId: string;
  label: string;
  ourCumulativeGt: number;
  markerCumulativeGt: number;
  ourEndGt: number;
  markerEndGt: number;
  ourMidGt: number;
  markerMidGt: number;
  midYear: number;
  /** Cumulative gap as a share of the marker's own total, in percent. */
  cumulativePercent: number;
  /** 2100 gap as a share of the marker's own 2100 emissions, in percent. */
  endPercent: number;
  /** True when the marker's path crosses into net removal, which a product of four positive factors cannot. */
  markerGoesNegative: boolean;
}

export function computeFlags(
  inputs: ScenarioInputs,
  path: ScenarioPath,
  presetId: string | null,
): ScenarioFlags {
  const c = T.coherence;
  return {
    efficiencyRatio: ratio(inputs.energyPerDollar, OBSERVED_RATES.energyPerDollar),
    fuelMixRatio: ratio(inputs.co2PerEnergy, OBSERVED_RATES.co2PerEnergy),
    incomeRatio: ratio(inputs.income, OBSERVED_RATES.income),
    populationOutsideUn: outsideUnRange(inputs.population),
    efficiencySlowerThanRecord: isBelow(
      ratio(inputs.energyPerDollar, OBSERVED_RATES.energyPerDollar),
      T.efficiencySlowerThanRecordRatio,
    ),
    fuelMixFasterThanAnyScenario: isAbove(
      ratio(inputs.co2PerEnergy, OBSERVED_RATES.co2PerEnergy),
      T.fuelMixFasterThanAnyScenarioRatio,
    ),
    aboveSlowBound: path.cumulativeGt > BOUNDS.slow,
    belowFastBound: path.cumulativeGt < BOUNDS.fast,
    coherence: {
      fastFuelMixSlowEfficiency:
        inputs.co2PerEnergy < c.fastFuelMixSlowEfficiency.co2PerEnergyBelow
        && inputs.energyPerDollar > c.fastFuelMixSlowEfficiency.energyPerDollarAbove,
      fastEfficiencyStaticFuelMix:
        inputs.energyPerDollar < c.fastEfficiencyStaticFuelMix.energyPerDollarBelow
        && inputs.co2PerEnergy > c.fastEfficiencyStaticFuelMix.co2PerEnergyAbove,
      stagnantEconomyFastEfficiency:
        inputs.income < c.stagnantEconomyFastEfficiency.incomeBelow
        && inputs.energyPerDollar < c.stagnantEconomyFastEfficiency.energyPerDollarBelow,
      largeSinkUnchangedFuelMix:
        inputs.landUse < c.largeSinkUnchangedFuelMix.landUseBelow
        && inputs.co2PerEnergy > c.largeSinkUnchangedFuelMix.co2PerEnergyAbove,
    },
    markerFidelity: markerFidelity(path, presetId),
    showingPublished: markerIdForPreset(presetId) !== null,
  };
}

function isBelow(value: number | null, limit: number): boolean {
  return value !== null && value < limit;
}

function isAbove(value: number | null, limit: number): boolean {
  return value !== null && value > limit;
}

/** Which marker each CMIP7 preset names. */
const MARKER_PRESETS: Record<string, string> = {
  'cmip7-high': 'H',
  'cmip7-medium': 'M',
  'cmip7-medium-to-low': 'ML',
  'cmip7-very-low': 'VL',
};

/** The year the comparison quotes mid-century, where the paths part company. */
const MID_YEAR = 2050;

/** The marker a preset names, for the chart to bring forward. Null for the rest. */
export function markerIdForPreset(presetId: string | null): string | null {
  if (presetId === null) return null;
  return MARKER_PRESETS[presetId] ?? null;
}

function markerFidelity(path: ScenarioPath, presetId: string | null): MarkerFidelity | null {
  if (presetId === null) return null;
  const markerId = MARKER_PRESETS[presetId];
  if (markerId === undefined) return null;
  const marker = MARKER_BY_ID[markerId];
  const preset = PRESET_BY_ID[presetId];
  if (marker === undefined || preset === undefined) return null;

  const midIndex = MARKER_YEARS.indexOf(MID_YEAR);
  const ourMid = path.points.find((point) => point.year === MID_YEAR);
  if (midIndex < 0 || ourMid === undefined) return null;

  const markerEndGt = at(marker.co2Gt, marker.co2Gt.length - 1, 'marker 2100');
  const markerMidGt = at(marker.co2Gt, midIndex, 'marker 2050');
  return {
    markerId,
    label: marker.label,
    ourCumulativeGt: path.cumulativeGt,
    markerCumulativeGt: marker.cumulativeGt,
    ourEndGt: path.final.co2Gt,
    markerEndGt,
    ourMidGt: ourMid.co2Gt,
    markerMidGt,
    midYear: MID_YEAR,
    cumulativePercent:
      ((path.cumulativeGt - marker.cumulativeGt) / marker.cumulativeGt) * 100,
    endPercent: Math.abs(markerEndGt) < 0.5
      ? Number.NaN
      : ((path.final.co2Gt - markerEndGt) / Math.abs(markerEndGt)) * 100,
    markerGoesNegative: marker.co2Gt.some((value) => value < 0),
  };
}

export const HIGH_EFFICIENCY_RATIO = T.highScenarioEfficiencyRatio;

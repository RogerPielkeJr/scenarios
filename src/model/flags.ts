import notesJson from '../data/notes.json';
import { OBSERVED_RATES } from './config.js';
import { PRESET_BY_ID, presetByLabel } from './bounds.js';
import { computePath } from './kaya.js';
import { MARKER_BY_ID } from './markers.js';
import { outsideUnRange } from './population.js';
import type { ScenarioInputs, ScenarioPath } from './types.js';

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
  /** Set when a loaded CMIP7 preset cannot reproduce the marker it names. */
  markerPresetGap: { markerId: string; label: string; gapGt: number } | null;
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
    markerPresetGap: markerGap(path, presetId),
  };
}

function isBelow(value: number | null, limit: number): boolean {
  return value !== null && value < limit;
}

function isAbove(value: number | null, limit: number): boolean {
  return value !== null && value > limit;
}

/** Marker presets whose Kaya factors cannot reproduce their own total. */
const MARKER_PRESETS: Record<string, string> = {
  'cmip7-high': 'H',
  'cmip7-medium': 'M',
  'cmip7-very-low': 'VL',
};

function markerGap(path: ScenarioPath, presetId: string | null) {
  if (presetId === null) return null;
  const markerId = MARKER_PRESETS[presetId];
  if (markerId === undefined) return null;
  const marker = MARKER_BY_ID[markerId];
  const preset = PRESET_BY_ID[presetId];
  if (marker === undefined || preset === undefined) return null;
  const gapGt = path.cumulativeGt - marker.cumulativeGt;
  // Small gaps are not worth a sentence; a marker the Kaya terms simply
  // cannot reach is.
  return Math.abs(gapGt) < 200 ? null : { markerId, label: marker.label, gapGt };
}

export const HIGH_EFFICIENCY_RATIO = T.highScenarioEfficiencyRatio;

import presetsJson from '../data/presets.json';
import type { ScenarioInputs } from './types.js';

export interface Preset {
  id: string;
  label: string;
  /** True for the four presets METHODS.md derives and the tests pin down. */
  documented: boolean;
  inputs: ScenarioInputs;
  expected?: {
    cumulative_gt: number;
    warming_c: number;
    tolerance_gt: number;
    tolerance_c: number;
    source: string;
    /** What the brief stated before the base-year recalibration, where it did. */
    brief_stated?: { cumulative_gt: number; warming_c: number };
    /** What this preset produced before a rate it depends on was corrected. */
    superseded?: { cumulative_gt: number; warming_c: number; why: string };
  };
}

export const PRESETS = presetsJson.presets as readonly Preset[];

export const PRESET_BY_ID: Readonly<Record<string, Preset>> = Object.freeze(
  Object.fromEntries(PRESETS.map((p) => [p.id, p])),
);

/** The four presets the brief derives, in the order they are explained. */
export const DOCUMENTED_PRESETS = PRESETS.filter((p) => p.documented);

export function presetByLabel(label: string): Preset | undefined {
  return PRESETS.find((p) => p.label === label);
}

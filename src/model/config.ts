import configJson from '../data/config.json';
import type { InputId, ScenarioInputs } from './types.js';

export interface InputSpec {
  id: InputId;
  kind: 'level' | 'rate';
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  default: number;
  decimals: number;
  unitSuffix: string;
  units: string;
  signed: boolean;
  reference: { value: number; label: string };
}

export const BASE_YEAR = configJson.baseYear;
export const END_YEAR = configJson.endYear;
export const BASE = configJson.base;
export const OBSERVED_RATES = configJson.observedRates;
export const INPUT_SPECS = configJson.inputs as readonly InputSpec[];

export const SPEC_BY_ID: Readonly<Record<InputId, InputSpec>> = Object.freeze(
  Object.fromEntries(INPUT_SPECS.map((spec) => [spec.id, spec])) as Record<InputId, InputSpec>,
);

/** Every input at its default. */
export function defaultInputs(): ScenarioInputs {
  return Object.fromEntries(
    INPUT_SPECS.map((spec) => [spec.id, spec.default]),
  ) as unknown as ScenarioInputs;
}

/** Clamps one input to its declared range. */
export function clampInput(id: InputId, value: number): number {
  const spec = SPEC_BY_ID[id];
  return Math.min(spec.max, Math.max(spec.min, value));
}

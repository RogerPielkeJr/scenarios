import baseJson from '../data/base.json';
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
/**
 * The base-year state, from src/data/base.json.
 *
 * CO2 per unit of energy covers fossil and industrial CO2, cement included,
 * so the four Kaya terms count the same emissions the CMIP7 markers count.
 * See DATA.md and METHODS.md.
 */
export const BASE = baseJson.base;
export const BASE_META = baseJson.meta;
export const BASE_BASIS = baseJson.basis;
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

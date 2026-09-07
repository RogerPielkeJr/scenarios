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
  /** What the prototype opened on, kept for comparison. Not used. */
  prototypeDefault: number;
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
/** The preset the page opens on, named in src/data/config.json. */
export const DEFAULT_PRESET = configJson.defaultPreset;

export const SPEC_BY_ID: Readonly<Record<InputId, InputSpec>> = Object.freeze(
  Object.fromEntries(INPUT_SPECS.map((spec) => [spec.id, spec])) as Record<InputId, InputSpec>,
);

/**
 * How many stops a slider offers: min, min + step, ... max, inclusive.
 *
 * The rounding matters. (14 - 6) / 0.1 is 79.99999999999999 in binary
 * floating point, and a bare floor would lose a position off every slider.
 */
export function sliderPositions(spec: InputSpec): number {
  return Math.round((spec.max - spec.min) / spec.step) + 1;
}

/**
 * How many distinct scenarios the six sliders reach, as their product.
 *
 * Derived, never typed. The front page prints this number, and a literal
 * there would go stale the moment a slider's range or step moved. The
 * product sits inside Number.MAX_SAFE_INTEGER at 5.2e14 against 9.0e15;
 * tests/config.test.ts holds that, since past it the arithmetic would start
 * losing whole scenarios in silence.
 *
 * It counts what the sliders themselves reach. A hand-edited ?s= link can
 * carry a value between two stops, which the model clamps to range but does
 * not snap, so links address a denser set than this.
 */
export const SCENARIO_COUNT = INPUT_SPECS.reduce(
  (total, spec) => total * sliderPositions(spec), 1,
);

/**
 * The count as the front page says it: "almost 520 trillion".
 *
 * The qualifier comes from the comparison, not from a guess. If a slider
 * range ever pushed the product past the round figure, this would say "just
 * over" rather than going quietly wrong.
 */
export function approximateScenarioCount(): string {
  const trillions = SCENARIO_COUNT / 1e12;
  const rounded = Math.round(trillions);
  const qualifier = SCENARIO_COUNT < rounded * 1e12 ? 'almost' : 'just over';
  return `${qualifier} ${rounded} trillion`;
}

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

/**
 * Snaps a value to the slider's own step, so a value arriving from a Learn
 * More builder lands somewhere the slider can actually stop. Binary step
 * arithmetic leaves 10.200000000000001, which the spec's decimals settle.
 */
export function roundToStep(id: InputId, value: number): number {
  const spec = SPEC_BY_ID[id];
  const snapped = spec.min + Math.round((value - spec.min) / spec.step) * spec.step;
  return Number(snapped.toFixed(spec.decimals));
}

/** Clamps and says whether it had to, so a builder can tell the reader. */
export function clampWithFlag(
  id: InputId, value: number,
): { value: number; clamped: 'min' | 'max' | null } {
  const spec = SPEC_BY_ID[id];
  if (value < spec.min) return { value: spec.min, clamped: 'min' };
  if (value > spec.max) return { value: spec.max, clamped: 'max' };
  return { value, clamped: null };
}

/** Rounds, then clamps: the order a builder hands a value to a slider. */
export function fitToSlider(
  id: InputId, value: number,
): { value: number; clamped: 'min' | 'max' | null } {
  return clampWithFlag(id, roundToStep(id, value));
}

/** One field replaced, the other five carried through untouched. */
export function withInput(
  inputs: ScenarioInputs, id: InputId, value: number,
): ScenarioInputs {
  return { ...inputs, [id]: value };
}

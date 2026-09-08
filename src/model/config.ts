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
 * How many distinct scenarios the sliders reach, as their product.
 *
 * Derived, never typed. The front page prints this number, and a literal
 * there would go stale the moment a slider's range or step moved.
 *
 * A BigInt, because the product outgrew exact double arithmetic when timing
 * and removal joined the six: 2.41e18 against a MAX_SAFE_INTEGER of 9.01e15.
 * As a number it came out as ...806700 for a true ...806791, losing whole
 * scenarios in the last digits without saying so.
 *
 * It counts what the sliders themselves reach. A hand-edited ?s= link can
 * carry a value between two stops, which the model clamps to range but does
 * not snap, so links address a denser set than this.
 */
export const SCENARIO_COUNT: bigint = INPUT_SPECS.reduce(
  (total, spec) => total * BigInt(sliderPositions(spec)), 1n,
);

const SCALES: ReadonlyArray<readonly [bigint, string]> = [
  [1_000_000_000_000_000_000n, 'quintillion'],
  [1_000_000_000_000_000n, 'quadrillion'],
  [1_000_000_000_000n, 'trillion'],
  [1_000_000_000n, 'billion'],
];

const RATE_PRODUCTS = configJson.rateProducts;

/**
 * How many distinct scenarios the sliders actually reach.
 *
 * SCENARIO_COUNT above counts settings. It is not the same thing: energy per
 * dollar and CO2 per unit of energy enter the identity only through their
 * product, so swapping one for the other leaves the path byte-identical and
 * about half of all settings repeat another. Methane changes no CO2 point at
 * all, but it does change the warming, so it counts as part of an outcome.
 *
 * Which factors collapse depends on the timing slider. Income compounds over
 * calendar years while the two technology rates compound over the redistributed
 * clock, so at any timing but 50% income stands apart and only the technology
 * pair collapses. At exactly 50% the two clocks coincide and all three collapse
 * into a single product. The two cases are counted separately and added.
 *
 * `rateProducts` comes from scripts/build_carried_data.py, which counts the
 * distinct products exactly. The three-rate case is 81.5 million of them, which
 * is a build-time job rather than a page-load one.
 */
export const DISTINCT_SCENARIO_COUNT: bigint = (() => {
  const stops = (id: InputId) => BigInt(sliderPositions(SPEC_BY_ID[id]));
  const timings = stops('improvementTiming');
  const shaped = (timings - 1n) * stops('income') * BigInt(RATE_PRODUCTS.pairs);
  const steady = BigInt(RATE_PRODUCTS.triples);
  return stops('population') * stops('landUse') * stops('removals')
    * stops('methane') * (shaped + steady);
})();

/**
 * The count as the front page says it: "just over 2.4 quintillion".
 *
 * The qualifier comes from the comparison, not from a guess. If a slider
 * range ever pushed the product past the round figure, this would say "just
 * over" rather than going quietly wrong. Rounded to one decimal, so a scale
 * this large still says something the reader can hold.
 */
export function approximate(count: bigint): string {
  const scale = SCALES.find(([size]) => count >= size) ?? SCALES[SCALES.length - 1];
  const [size, name] = scale as readonly [bigint, string];
  // Tenths, in integer arithmetic, so the rounding never drifts.
  const tenths = (count * 10n) / size;
  const rounded = Number(tenths) / 10;
  const qualifier = count * 10n < BigInt(Math.round(rounded * 10)) * size
    ? 'almost' : 'just over';
  return `${qualifier} ${rounded.toFixed(1)} ${name}`;
}

export function approximateScenarioCount(): string {
  return approximate(DISTINCT_SCENARIO_COUNT);
}

/** The settings figure, for the sentence that explains the difference. */
export function approximateSettingsCount(): string {
  return approximate(SCENARIO_COUNT);
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

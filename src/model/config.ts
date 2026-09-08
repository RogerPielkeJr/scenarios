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
 * The factors behind the count of distinct scenarios, in the order the front
 * page multiplies them.
 *
 * Seven numbers for eight sliders. Energy per dollar and CO2 per unit of energy
 * enter the identity only through their product, so swapping one rate for the
 * other leaves the path byte-identical; the pair contributes the count of
 * distinct products they reach rather than the 203,401 pairs they offer.
 */
export const SCENARIO_FACTORS: ReadonlyArray<{ label: string; count: number }> = [
  { label: 'population', count: sliderPositions(SPEC_BY_ID.population) },
  { label: 'income', count: sliderPositions(SPEC_BY_ID.income) },
  { label: 'the two technology rates', count: RATE_PRODUCTS.pairs },
  { label: 'land use', count: sliderPositions(SPEC_BY_ID.landUse) },
  { label: 'methane', count: sliderPositions(SPEC_BY_ID.methane) },
  { label: 'timing', count: sliderPositions(SPEC_BY_ID.improvementTiming) },
  { label: 'removal', count: sliderPositions(SPEC_BY_ID.removals) },
];

/**
 * How many distinct scenarios the sliders reach, as the product of the factors
 * above.
 *
 * SCENARIO_COUNT counts settings, which is not the same thing: about half of
 * them repeat another, because the two technology rates are interchangeable.
 * Methane changes no CO2 point at all, but it does change the warming, so it
 * belongs to an outcome.
 *
 * One further collapse this does not deduct. At a timing of exactly 50% income
 * compounds over the same clock as the two technology rates, so all three
 * collapse into a single product rather than two; counting that slice
 * separately would take 0.1% off the total. `rateProducts.triples` carries the
 * figure for anyone who wants it, and METHODS.md states both.
 */
export const DISTINCT_SCENARIO_COUNT: bigint = SCENARIO_FACTORS.reduce(
  (total, factor) => total * BigInt(factor.count), 1n,
);

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

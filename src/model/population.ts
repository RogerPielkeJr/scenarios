import populationJson from '../data/population.json';
import { at } from './types.js';

const YEARS: readonly number[] = populationJson.years;
const CURVES = populationJson.curves;
const SSP1: readonly number[] = CURVES.SSP1;
const SSP2: readonly number[] = CURVES.SSP2;
const SSP3: readonly number[] = CURVES.SSP3;

export const UN_2024 = populationJson.un2024;
/** The five-yearly SSP world trajectories, for charts that draw them. */
export const SSP_YEARS = YEARS;
export const SSP_CURVES: Readonly<Record<'SSP1' | 'SSP2' | 'SSP3', readonly number[]>> =
  Object.freeze({ SSP1, SSP2, SSP3 });
export const ANCHORS_2100 = populationJson.anchors2100;

const END_1 = at(SSP1, SSP1.length - 1, 'SSP1 end');
const END_2 = at(SSP2, SSP2.length - 1, 'SSP2 end');
const END_3 = at(SSP3, SSP3.length - 1, 'SSP3 end');

/** Linear interpolation along one five-yearly SSP curve. */
function interpolate(curve: readonly number[], year: number): number {
  for (let i = 1; i < YEARS.length; i += 1) {
    const upper = at(YEARS, i, 'year');
    if (year <= upper) {
      const lower = at(YEARS, i - 1, 'year');
      const fraction = (year - lower) / (upper - lower);
      const a = at(curve, i - 1, 'curve');
      const b = at(curve, i, 'curve');
      return a + (b - a) * fraction;
    }
  }
  return at(curve, curve.length - 1, 'curve');
}

/** The base year, and the last year every curve runs to. */
const FIRST_YEAR = at(YEARS, 0, 'first year');
const LAST_YEAR = at(YEARS, YEARS.length - 1, 'last year');

/**
 * The base-year population, which no slider may move.
 *
 * All three SSP curves start at the same figure, so this is a fact about the
 * base year rather than a choice between trajectories.
 */
const BASE_POPULATION = at(SSP2, 0, 'SSP2 start');

/**
 * The blended curve, before the base year is pinned.
 *
 * Interpolates between the real SSP1, SSP2 and SSP3 world trajectories on
 * their 2100 endpoints, so the shape of the curve stays demographic rather
 * than a smoothstep between two numbers. Outside the SSP1-SSP3 span the
 * nearest curve is scaled by the ratio of the target to its own endpoint,
 * which keeps the shape and moves the level.
 */
function shapedAt(year: number, target2100: number): number {
  const a = interpolate(SSP1, year);
  const b = interpolate(SSP2, year);
  const c = interpolate(SSP3, year);
  if (target2100 <= END_1) return a * (target2100 / END_1);
  if (target2100 <= END_2) return a + (b - a) * ((target2100 - END_1) / (END_2 - END_1));
  if (target2100 <= END_3) return b + (c - b) * ((target2100 - END_2) / (END_3 - END_2));
  return c * (target2100 / END_3);
}

/**
 * World population in `year`, on a path that reaches `target2100` billions.
 *
 * The base year is an observation and the slider sets 2100, so moving the
 * slider must not move 2025. Scaling the nearest curve did move it, because it
 * multiplies every year including the first: at 6 billion the path began from
 * 6.04 rather than 8.15, and at 14 billion from 8.79. Every other slider held
 * the base year exactly, and this one now does too.
 *
 * The correction is additive and decays linearly to nothing by 2100, so the
 * base year is exact, the 2100 target is exact, and the shape between them
 * stays the SSP blend. Inside the SSP1-SSP3 span there is nothing to correct:
 * the three curves share a base year, so the drift is zero and the path is
 * unchanged. Only the two stretches beyond the outermost SSPs move, which is
 * where the fault was.
 */
export function populationAt(year: number, target2100: number): number {
  const shaped = shapedAt(year, target2100);
  const drift = BASE_POPULATION - shapedAt(FIRST_YEAR, target2100);
  if (drift === 0) return shaped;
  const span = LAST_YEAR - FIRST_YEAR;
  const remaining = Math.min(Math.max((year - FIRST_YEAR) / span, 0), 1);
  return shaped + drift * (1 - remaining);
}

/** True when a 2100 population sits outside the UN 2024 95% interval. */
export function outsideUnRange(target2100: number): 'above' | 'below' | null {
  if (target2100 > UN_2024.hi95) return 'above';
  if (target2100 < UN_2024.lo95) return 'below';
  return null;
}

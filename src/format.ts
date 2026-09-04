import { SPEC_BY_ID } from './model/config.js';
import type { InputId } from './model/types.js';

/** Never more than two decimal places anywhere in the interface. */
export const MAX_DECIMALS = 2;

export function fixed(value: number, decimals: number): string {
  return value.toFixed(Math.min(decimals, Math.max(decimals, 0)));
}

/** A rate, always carrying its sign, so +1.91 and -1.43 read as a pair. */
export function signed(value: number, decimals: number): string {
  return (value > 0 ? '+' : '') + value.toFixed(decimals);
}

/** Formats one slider value the way its own spec says to. */
export function formatInput(id: InputId, value: number): string {
  const spec = SPEC_BY_ID[id];
  return spec.signed ? signed(value, spec.decimals) : value.toFixed(spec.decimals);
}

export function formatInputWithUnit(id: InputId, value: number): string {
  return formatInput(id, value) + SPEC_BY_ID[id].unitSuffix;
}

/** Whole numbers with thousands separators, for cumulative CO2. */
export function thousands(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Degrees, two decimals, never more. */
export function degrees(value: number): string {
  return `${value.toFixed(2)} °C`;
}

export function signedDegrees(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} °C`;
}

/** Kilograms of CO2 per dollar, three decimals because the values are small. */
export function perDollar(value: number): string {
  return value.toFixed(3);
}

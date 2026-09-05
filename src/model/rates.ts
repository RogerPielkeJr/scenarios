/** Rate arithmetic shared by the model and the Learn More builders. */

/** Compound annual growth rate between two levels, in percent a year. */
export function cagr(first: number, last: number, years: number): number {
  if (first <= 0 || last <= 0 || years <= 0) return Number.NaN;
  return ((last / first) ** (1 / years) - 1) * 100;
}

/** A level compounding at `ratePercent` for `years` years. */
export function compound(base: number, ratePercent: number, years: number): number {
  return base * (1 + ratePercent / 100) ** years;
}

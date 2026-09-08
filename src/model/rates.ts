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

/**
 * Effective years elapsed by year `t`, once the improvement is redistributed
 * across the century.
 *
 * `sharePercent` says how much of the century's total technology improvement
 * lands by the midpoint. At 50 the annual rate is constant and this returns `t`
 * unchanged. Above 50 the rate starts high and decays; below 50 it builds.
 *
 * The weight on the annual rate decays geometrically, so it never changes sign
 * -- a technology that improves cannot start worsening late in the century
 * merely because the reader asked for an early push. Written as
 *
 *   accumulated(t) = span * (1 - e^-Lt) / (1 - e^-L*span)
 *
 * the endpoint is exact: accumulated(span) = span for every L, so the 2100
 * level the reader set on the rate slider stays put whatever the timing.
 */
export function accumulatedYears(t: number, span: number, sharePercent: number): number {
  const share = Math.min(Math.max(sharePercent / 100, 1e-6), 1 - 1e-6);
  // share = 1 / (1 + e^(-L*span/2)), inverted.
  const lambda = (2 / span) * Math.log(share / (1 - share));
  if (Math.abs(lambda) < 1e-12) return t;
  return span * ((1 - Math.exp(-lambda * t)) / (1 - Math.exp(-lambda * span)));
}

/** A level whose annual rate is redistributed by `accumulatedYears`. */
export function compoundOverYears(base: number, ratePercent: number,
                                  accumulated: number): number {
  return base * Math.exp(Math.log(1 + ratePercent / 100) * accumulated);
}

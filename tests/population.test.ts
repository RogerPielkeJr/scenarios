import { describe, expect, it } from 'vitest';
import { BASE_YEAR, END_YEAR } from '../src/model/config.js';
import { ANCHORS_2100, UN_2024, outsideUnRange, populationAt } from '../src/model/population.js';

describe('populationAt', () => {
  it('lands on the requested 2100 population', () => {
    for (const target of [6, 8.092, 9.5, 9.887, 11.4, 12.977, 14]) {
      expect(populationAt(END_YEAR, target)).toBeCloseTo(target, 6);
    }
  });

  it('reproduces each SSP curve when asked for that curve endpoint', () => {
    expect(populationAt(END_YEAR, ANCHORS_2100.SSP1)).toBeCloseTo(ANCHORS_2100.SSP1, 9);
    expect(populationAt(END_YEAR, ANCHORS_2100.SSP2)).toBeCloseTo(ANCHORS_2100.SSP2, 9);
    expect(populationAt(END_YEAR, ANCHORS_2100.SSP3)).toBeCloseTo(ANCHORS_2100.SSP3, 9);
  });

  it('starts from the same present-day population across the SSP span', () => {
    const inside = [ANCHORS_2100.SSP1, 9, 10.2, 12, ANCHORS_2100.SSP3]
      .map((t) => populationAt(BASE_YEAR, t));
    const spread = Math.max(...inside) - Math.min(...inside);
    expect(spread).toBeLessThan(1e-9);
  });

  // Outside the SSP1-SSP3 span the nearest curve is scaled, which moves the
  // 2025 end of it as well as the 2100 end. The slider runs 6 to 14 billion,
  // so both extremes reach this. Pinned here because it is a real property of
  // the specified method, not an accident. Raised with the author; see
  // METHODS.md, "Population outside the SSP span".
  it('shifts the present-day population when scaling beyond the SSP span', () => {
    expect(populationAt(BASE_YEAR, 6)).toBeCloseTo(6.04, 2);
    expect(populationAt(BASE_YEAR, 14)).toBeCloseTo(8.79, 2);
  });

  it('follows a demographic curve rather than a straight line', () => {
    // SSP1 peaks before 2100 and declines. A smoothstep between two
    // endpoints could not do that, so this is what pins the shape.
    const peak = Math.max(...Array.from({ length: 76 },
      (_, i) => populationAt(BASE_YEAR + i, ANCHORS_2100.SSP1)));
    expect(peak).toBeGreaterThan(ANCHORS_2100.SSP1);
    expect(peak).toBeGreaterThan(9.2);
  });

  it('rises without turning over on the high path', () => {
    for (let year = BASE_YEAR + 1; year <= END_YEAR; year += 1) {
      expect(populationAt(year, 12.977)).toBeGreaterThan(populationAt(year - 1, 12.977));
    }
  });

  it('scales the nearest curve outside the SSP1-SSP3 span', () => {
    const low = populationAt(2060, 6);
    const ssp1 = populationAt(2060, ANCHORS_2100.SSP1);
    expect(low).toBeCloseTo(ssp1 * (6 / ANCHORS_2100.SSP1), 9);
  });
});

describe('outsideUnRange', () => {
  it('flags populations beyond the UN 2024 95% interval', () => {
    expect(outsideUnRange(UN_2024.median2100)).toBeNull();
    expect(outsideUnRange(12.5)).toBe('above');
    expect(outsideUnRange(8.0)).toBe('below');
    expect(outsideUnRange(UN_2024.hi95)).toBeNull();
    expect(outsideUnRange(UN_2024.lo95)).toBeNull();
  });
});

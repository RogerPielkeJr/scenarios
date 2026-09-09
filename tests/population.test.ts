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

  // Fixed 2026-09-09. Scaling the nearest curve moved the 2025 end of it along
  // with the 2100 end, so at 6 billion the path began from 6.04 and at 14
  // billion from 8.79 rather than from the observed 8.15. The slider runs 6 to
  // 14 billion, so both extremes reached it. An additive correction that
  // decays to nothing by 2100 now pins the base year without moving the
  // target. See METHODS.md, "Population outside the SSP span".
  it('holds the present-day population beyond the SSP span too', () => {
    for (const target of [6, 6.5, 7, 13, 13.5, 14]) {
      expect(populationAt(BASE_YEAR, target), `target ${target}`).toBeCloseTo(8.15, 9);
      expect(populationAt(END_YEAR, target), `target ${target}`).toBeCloseTo(target, 9);
    }
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

  // The shape outside the span still comes from scaling the nearest curve;
  // what changed is that the correction pinning the base year is added on top,
  // at its full size in 2025 and at nothing in 2100.
  it('scales the nearest curve outside the SSP1-SSP3 span, then pins the base year', () => {
    const scaled = (year: number) =>
      populationAt(year, ANCHORS_2100.SSP1) * (6 / ANCHORS_2100.SSP1);
    const drift = 8.15 - scaled(BASE_YEAR);
    for (const year of [BASE_YEAR, 2050, 2075, END_YEAR]) {
      const remaining = 1 - (year - BASE_YEAR) / (END_YEAR - BASE_YEAR);
      expect(populationAt(year, 6), String(year))
        .toBeCloseTo(scaled(year) + drift * remaining, 9);
    }
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

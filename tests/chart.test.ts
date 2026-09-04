import { describe, expect, it } from 'vitest';
import { niceScale } from '../src/ui/chart.js';

describe('niceScale', () => {
  it('covers the data it is given', () => {
    for (const [low, high] of [[-25, 55], [0, 12], [-120, 340], [-3, 3], [10, 11]]) {
      const scale = niceScale(low as number, high as number);
      expect(scale.min).toBeLessThanOrEqual(low as number);
      expect(scale.max).toBeGreaterThanOrEqual(high as number);
    }
  });

  // The chart turns on whether a path has crossed into net negative
  // emissions, so the zero line is never allowed off the axis.
  it('always keeps zero on the axis', () => {
    for (const [low, high] of [[20, 90], [-90, -20], [5, 6]]) {
      const scale = niceScale(low as number, high as number);
      expect(scale.min).toBeLessThanOrEqual(0);
      expect(scale.max).toBeGreaterThanOrEqual(0);
    }
  });

  it('lands on round numbers a reader can do arithmetic on', () => {
    for (const [low, high] of [[-25, 55], [-120, 340], [0, 7], [-4000, 9000]]) {
      const scale = niceScale(low as number, high as number);
      const mantissa = scale.step / 10 ** Math.floor(Math.log10(scale.step));
      expect([1, 2, 2.5, 5, 10]).toContain(Number(mantissa.toFixed(6)));
      expect(scale.min % scale.step).toBeCloseTo(0, 9);
      expect(scale.max % scale.step).toBeCloseTo(0, 9);
    }
  });

  it('produces a readable number of gridlines', () => {
    for (const [low, high] of [[-25, 55], [0, 12], [-120, 340], [-3, 3], [-1, 900]]) {
      const scale = niceScale(low as number, high as number);
      const lines = (scale.max - scale.min) / scale.step;
      expect(lines).toBeGreaterThanOrEqual(3);
      expect(lines).toBeLessThanOrEqual(14);
    }
  });

  it('widens rather than clipping when a scenario runs high', () => {
    const modest = niceScale(-25, 55);
    const extreme = niceScale(-25, 260);
    expect(extreme.max).toBeGreaterThan(modest.max);
    expect(extreme.max).toBeGreaterThanOrEqual(260);
  });

  it('never returns a zero or negative step', () => {
    for (const [low, high] of [[0, 0], [5, 5], [-2, -2]]) {
      expect(niceScale(low as number, high as number).step).toBeGreaterThan(0);
    }
  });
});

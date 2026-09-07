import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INPUT_SPECS, SCENARIO_COUNT, sliderPositions } from '../src/model/config.js';
import { computePath } from '../src/model/kaya.js';
import { warming } from '../src/model/emulator.js';
import type { ScenarioInputs } from '../src/model/types.js';

describe('how many scenarios the sliders reach', () => {
  // Binary floating point makes (14 - 6) / 0.1 come out as 79.99999999999999,
  // so a bare floor would lose a stop off every slider.
  it('counts the stops on each slider inclusively', () => {
    for (const spec of INPUT_SPECS) {
      const positions = sliderPositions(spec);
      expect(positions, spec.id).toBeGreaterThan(1);
      expect(Number.isInteger(positions), spec.id).toBe(true);
      // The last stop lands on the maximum, not short of it or past it.
      const last = spec.min + (positions - 1) * spec.step;
      expect(last, spec.id).toBeCloseTo(spec.max, 9);
      // And one more stop would overshoot.
      expect(spec.min + positions * spec.step, spec.id).toBeGreaterThan(spec.max + 1e-9);
    }
  });

  it('multiplies them into the total the front page prints', () => {
    const expected = INPUT_SPECS.reduce((total, spec) => total * sliderPositions(spec), 1);
    expect(SCENARIO_COUNT).toBe(expected);
    expect(SCENARIO_COUNT).toBe(519_753_168_866_151);
  });

  // Past MAX_SAFE_INTEGER the product would start losing whole scenarios
  // without saying so, and the number on the page would quietly go wrong.
  it('stays inside exact integer arithmetic', () => {
    expect(Number.isSafeInteger(SCENARIO_COUNT)).toBe(true);
    expect(SCENARIO_COUNT).toBeLessThan(Number.MAX_SAFE_INTEGER / 10);
  });

  // METHODS.md quotes the figure. A slider range moving would change the
  // page and leave the document behind, which is how its preset table went
  // stale once already.
  it('agrees with the figure METHODS.md states', () => {
    const methods = readFileSync(resolve(process.cwd(), 'METHODS.md'), 'utf8');
    expect(methods).toContain(SCENARIO_COUNT.toLocaleString('en-US'));
  });

  // The same paragraph quotes the span of the answers. Every one of those is
  // recomputed here, for the same reason.
  it('agrees with the outcome span METHODS.md states', () => {
    const methods = readFileSync(resolve(process.cwd(), 'METHODS.md'), 'utf8');
    let cumulativeLow = Infinity;
    let cumulativeHigh = -Infinity;
    let warmingLow = Infinity;
    let warmingHigh = -Infinity;
    // Each factor moves the total in one direction, so the extremes sit at
    // the corners: 2^6 of them, min and max on every slider.
    const axes = INPUT_SPECS.map((spec) => [spec.min, spec.max]);
    for (const population of axes[0] ?? []) {
      for (const income of axes[1] ?? []) {
        for (const energyPerDollar of axes[2] ?? []) {
          for (const co2PerEnergy of axes[3] ?? []) {
            for (const landUse of axes[4] ?? []) {
              for (const methane of axes[5] ?? []) {
                const path = computePath({ population, income, energyPerDollar,
                  co2PerEnergy, landUse, methane } as ScenarioInputs);
                const t = warming(path.cumulativeGt, methane);
                cumulativeLow = Math.min(cumulativeLow, path.cumulativeGt);
                cumulativeHigh = Math.max(cumulativeHigh, path.cumulativeGt);
                warmingLow = Math.min(warmingLow, t);
                warmingHigh = Math.max(warmingHigh, t);
              }
            }
          }
        }
      }
    }
    const totals = Math.round(cumulativeHigh - cumulativeLow + 1);
    const degrees = Math.round((warmingHigh - warmingLow) * 100 + 1);
    for (const figure of [
      cumulativeLow.toFixed(0),
      Math.round(cumulativeHigh).toLocaleString('en-US'),
      warmingLow.toFixed(2),
      warmingHigh.toFixed(2),
      totals.toLocaleString('en-US'),
      String(degrees),
    ]) {
      expect(methods, `METHODS.md no longer states ${figure}`).toContain(figure);
    }
  });
});

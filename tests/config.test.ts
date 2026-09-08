import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DISTINCT_SCENARIO_COUNT, INPUT_SPECS, SCENARIO_COUNT, sliderPositions } from '../src/model/config.js';
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
    const expected = INPUT_SPECS.reduce(
      (total, spec) => total * BigInt(sliderPositions(spec)), 1n,
    );
    expect(SCENARIO_COUNT).toBe(expected);
    expect(SCENARIO_COUNT).toBe(2_412_174_456_707_806_791n);
  });

  // The product outgrew exact double arithmetic when timing and removal joined
  // the six, which is why it is a BigInt. As a number it came out ...806700 for
  // a true ...806791: whole scenarios lost in the last digits, silently. This
  // holds that the count stays exact rather than that it stays small.
  it('counts exactly, past where doubles stop being able to', () => {
    expect(typeof SCENARIO_COUNT).toBe('bigint');
    expect(SCENARIO_COUNT).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    expect(BigInt(Number(SCENARIO_COUNT))).not.toBe(SCENARIO_COUNT);
  });

  // METHODS.md quotes the figure. A slider range moving would change the
  // page and leave the document behind, which is how its preset table went
  // stale once already.
  it('agrees with the figures METHODS.md states', () => {
    const methods = readFileSync(resolve(process.cwd(), 'METHODS.md'), 'utf8');
    expect(methods).toContain(SCENARIO_COUNT.toLocaleString('en-US'));
    expect(methods).toContain(DISTINCT_SCENARIO_COUNT.toLocaleString('en-US'));
  });

  // Settings are not scenarios: swapping the two technology rates leaves the
  // path byte-identical, so roughly half of all settings repeat another. The
  // front page says "distinct scenarios", so it has to print the smaller one.
  it('separates settings from the scenarios they reach', () => {
    expect(DISTINCT_SCENARIO_COUNT).toBeLessThan(SCENARIO_COUNT);
    const ratio = Number(SCENARIO_COUNT) / Number(DISTINCT_SCENARIO_COUNT);
    expect(ratio).toBeGreaterThan(1.9);
    expect(ratio).toBeLessThan(2.1);
  });

  // The same paragraph quotes the span of the answers. Every one of those is
  // recomputed here, for the same reason.
  it('agrees with the outcome span METHODS.md states', () => {
    const methods = readFileSync(resolve(process.cwd(), 'METHODS.md'), 'utf8');
    let cumulativeLow = Infinity;
    let cumulativeHigh = -Infinity;
    let warmingLow = Infinity;
    let warmingHigh = -Infinity;
    // Each factor moves the total in one direction, so the extremes sit at the
    // corners: min and max on every slider. Enumerated from INPUT_SPECS rather
    // than nested by hand, so adding an input widens the search instead of
    // leaving the new slider at undefined and every total at NaN.
    const specs = [...INPUT_SPECS];
    const corners = 2 ** specs.length;
    for (let mask = 0; mask < corners; mask += 1) {
      const inputs = Object.fromEntries(specs.map((spec, i) => [
        spec.id, (mask >> i) & 1 ? spec.max : spec.min,
      ])) as unknown as ScenarioInputs;
      const path = computePath(inputs);
      const t = warming(path.cumulativeGt, inputs.methane);
      cumulativeLow = Math.min(cumulativeLow, path.cumulativeGt);
      cumulativeHigh = Math.max(cumulativeHigh, path.cumulativeGt);
      warmingLow = Math.min(warmingLow, t);
      warmingHigh = Math.max(warmingHigh, t);
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

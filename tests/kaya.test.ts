import { describe, expect, it } from 'vitest';
import { BASE, BASE_YEAR, END_YEAR, defaultInputs } from '../src/model/config.js';
import { computePath } from '../src/model/kaya.js';
import { MARKERS } from '../src/model/markers.js';
import { populationAt } from '../src/model/population.js';
import { at } from '../src/model/types.js';

describe('computePath', () => {
  const path = computePath(defaultInputs());

  it('runs one point per year from the base year to 2100', () => {
    expect(path.points).toHaveLength(END_YEAR - BASE_YEAR + 1);
    expect(at(path.points, 0).year).toBe(BASE_YEAR);
    expect(path.final.year).toBe(END_YEAR);
  });

  it('starts from the base-year state', () => {
    const first = at(path.points, 0);
    expect(first.gdpPerPersonUsd).toBeCloseTo(BASE.gdpPerPersonUsd, 6);
    expect(first.landUseGt).toBeCloseTo(BASE.landUseGt, 6);
    // Population comes from the SSP curves, not from config.base.populationBn.
    expect(first.populationBn).toBeCloseTo(populationAt(BASE_YEAR, defaultInputs().population), 6);
  });

  it('compounds the three rate inputs annually', () => {
    const inputs = { ...defaultInputs(), income: 2, energyPerDollar: -1, co2PerEnergy: -0.5 };
    const p = computePath(inputs);
    const tenYears = at(p.points, 10);
    expect(tenYears.gdpPerPersonUsd).toBeCloseTo(BASE.gdpPerPersonUsd * 1.02 ** 10, 6);
  });

  it('moves land use linearly to the value set for 2100', () => {
    const p = computePath({ ...defaultInputs(), landUse: -6 });
    expect(at(p.points, 0).landUseGt).toBeCloseTo(BASE.landUseGt, 6);
    expect(p.final.landUseGt).toBeCloseTo(-6, 6);
    const span = END_YEAR - BASE_YEAR;
    for (const t of [1, 25, 50, 74]) {
      expect(at(p.points, t).landUseGt)
        .toBeCloseTo(BASE.landUseGt + (-6 - BASE.landUseGt) * (t / span), 9);
    }
  });

  it('adds land use to fossil CO₂ rather than folding it in', () => {
    for (const point of path.points) {
      expect(point.co2Gt).toBeCloseTo(point.fossilGt + point.landUseGt, 9);
    }
  });

  // Land use and engineered removal are the two terms that can take carbon out
  // of the air, and they are separate additive terms on purpose: land use nets
  // regrowth and restoration in, removal counts what stores carbon outside that
  // account. Neither may touch the other's series, or a reader who set both
  // would have the same tonne subtracted twice. See "Where removal is counted"
  // in METHODS.md.
  it('keeps land use and engineered removal as separate additive terms', () => {
    const p = computePath({ ...defaultInputs(), landUse: -6, removals: 8 });
    for (const point of p.points) {
      expect(point.co2Gt).toBeCloseTo(point.fossilGt + point.landUseGt + point.removalsGt, 9);
    }

    const land = computePath({ ...defaultInputs(), landUse: -6 });
    const both = computePath({ ...defaultInputs(), landUse: -6, removals: 8 });
    for (let t = 0; t < land.points.length; t += 1) {
      expect(at(both.points, t).landUseGt).toBeCloseTo(at(land.points, t).landUseGt, 9);
      expect(at(both.points, t).fossilGt).toBeCloseTo(at(land.points, t).fossilGt, 9);
    }
  });

  // The square ramp is what earns removal a control rather than a second way
  // to move land use: a straight ramp to the same 2100 level would reproduce
  // the land use slider exactly, and the two would be interchangeable.
  it('ramps removal as a square, so it is not the land use slider again', () => {
    const p = computePath({ ...defaultInputs(), removals: 10 });
    const span = END_YEAR - BASE_YEAR;
    expect(at(p.points, 0).removalsGt).toBeCloseTo(0, 9);
    expect(p.final.removalsGt).toBeCloseTo(-10, 9);
    for (const t of [1, 25, 50, 74]) {
      expect(at(p.points, t).removalsGt).toBeCloseTo(-10 * (t / span) ** 2, 9);
      // A straight ramp would put it here; the two must differ.
      expect(at(p.points, t).removalsGt).not.toBeCloseTo(-10 * (t / span), 3);
    }
  });

  it('sums cumulative CO₂ over every year of the path', () => {
    const summed = path.points.reduce((total, p) => total + p.co2Gt, 0);
    expect(path.cumulativeGt).toBeCloseTo(summed, 6);
  });

  // The whole chart is the reader's line against the seven marker lines, so
  // the base year has to put it among them rather than below them all. This
  // is what the 2026-09-04 recalibration bought, and what guards it.
  it('starts inside the range the markers start in', () => {
    const starts = MARKERS.map((m) => at(m.co2Gt, 0, `${m.id} 2025`));
    const start = at(path.points, 0).co2Gt;
    expect(start).toBeGreaterThanOrEqual(Math.min(...starts) - 0.1);
    expect(start).toBeLessThanOrEqual(Math.max(...starts) + 0.1);
  });

  it('counts the industrial CO₂ the markers count', () => {
    // Cement and other process CO2 push base CO2 per unit of energy well
    // above EI's energy-only 60.5 kg/GJ. See src/data/base.json.
    expect(BASE.co2PerEnergyKgGj).toBeGreaterThan(64);
    expect(BASE.co2PerEnergyKgGj).toBeLessThan(66);
  });

  it('reports CO₂ per dollar consistent with the two technology terms', () => {
    const final = path.final;
    const gdpUsd = final.populationBn * 1e9 * final.gdpPerPersonUsd;
    expect(final.kgCo2PerUsd).toBeCloseTo((final.fossilGt * 1e12) / gdpUsd, 6);
  });
});

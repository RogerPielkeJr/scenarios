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

  it('adds land use to fossil CO2 rather than folding it in', () => {
    for (const point of path.points) {
      expect(point.co2Gt).toBeCloseTo(point.fossilGt + point.landUseGt, 9);
    }
  });

  it('sums cumulative CO2 over every year of the path', () => {
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

  it('counts the industrial CO2 the markers count', () => {
    // Cement and other process CO2 push base CO2 per unit of energy well
    // above EI's energy-only 60.5 kg/GJ. See src/data/base.json.
    expect(BASE.co2PerEnergyKgGj).toBeGreaterThan(64);
    expect(BASE.co2PerEnergyKgGj).toBeLessThan(66);
  });

  it('reports CO2 per dollar consistent with the two technology terms', () => {
    const final = path.final;
    const gdpUsd = final.populationBn * 1e9 * final.gdpPerPersonUsd;
    expect(final.kgCo2PerUsd).toBeCloseTo((final.fossilGt * 1e12) / gdpUsd, 6);
  });
});

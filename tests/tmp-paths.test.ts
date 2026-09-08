import { describe, expect, it } from 'vitest';
import { SCENARIO_COUNT } from '../src/model/config.js';
import { computePath } from '../src/model/kaya.js';
import type { ScenarioInputs } from '../src/model/types.js';

const mk = (o: Partial<ScenarioInputs>) => ({ population: 10.2, income: 1.91,
  energyPerDollar: -1.62, co2PerEnergy: -0.48, landUse: 1, methane: 300,
  improvementTiming: 50, removals: 0,
  ...o } as ScenarioInputs);

const pathKey = (i: ScenarioInputs) =>
  computePath(i).points.map((p) => p.co2Gt.toFixed(9)).join('|');

describe('what actually makes two scenarios different', () => {
  it('the three rate sliders act only through their product, over the whole path', () => {
    const cases: Array<[number, number, number]> = [
      [1.91, -1.62, -0.48], [1.91, -0.48, -1.62], [-0.48, -1.62, 1.91],
      [-1.62, 1.91, -0.48], [-0.48, 1.91, -1.62], [-1.62, -0.48, 1.91],
    ];
    const keys = new Set(cases.map(([income, energyPerDollar, co2PerEnergy]) =>
      pathKey(mk({ income, energyPerDollar, co2PerEnergy }))));
    console.log(`\n6 permutations of one rate triple -> ${keys.size} distinct path(s)`);
    expect(keys.size).toBe(1);
  });

  it('methane changes no CO₂ point at all', () => {
    const keys = new Set([80, 300, 380, 600].map((methane) => pathKey(mk({ methane }))));
    console.log(`4 methane settings -> ${keys.size} distinct CO₂ path(s)`);
    expect(keys.size).toBe(1);
  });

  it('population and land use do move the path', () => {
    expect(new Set([6, 10.2, 14].map((population) => pathKey(mk({ population })))).size).toBe(3);
    expect(new Set([-10, 1, 5].map((landUse) => pathKey(mk({ landUse })))).size).toBe(3);
  });

  it('counts what that leaves', () => {
    const POP = 81; const LU = 151; const CH4 = 521;
    const G = 36_961_039; // distinct (1+a)(1+b)(1+c), computed by exhaustive product
    // Timing reshapes the path without moving its 2100 level, and removal adds
    // a term the rates cannot reach, so both multiply the count of distinct
    // paths rather than collapsing into the product above.
    const TIMING = 91; const REMOVALS = 51;
    const paths = POP * G * LU * TIMING * REMOVALS;
    const states = paths * CH4;
    const raw = Number(SCENARIO_COUNT);
    console.log(`\ndistinct CO₂ paths          : ${paths.toLocaleString('en-US')}`);
    console.log(`   with warming (x methane)  : ${states.toLocaleString('en-US')}`);
    console.log(`raw slider settings          : ${raw.toLocaleString('en-US')}`);
    console.log(`settings per distinct path   : ${(raw / paths).toFixed(1)}`);
    console.log(`settings per distinct state  : ${(raw / states).toFixed(2)}`);
    expect(paths).toBeLessThan(raw);
  });
});

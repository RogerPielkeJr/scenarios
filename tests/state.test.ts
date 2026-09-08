import { describe, expect, it } from 'vitest';
import {
  cleanName, decodeScenario, encodeScenario, hashFor,
  learnHref, returnHref,
} from '../src/state.js';
import { INPUT_SPECS, fitToSlider, roundToStep, withInput } from '../src/model/config.js';
import { INPUT_IDS } from '../src/model/types.js';

const SCENARIO = {
  inputs: {
    population: 10.2, income: 1.91, energyPerDollar: -1.62,
    co2PerEnergy: -0.48, landUse: 1, methane: 300,
    improvementTiming: 50, removals: 0,
  },
  name: 'Fast electrification',
};

describe('the scenario encoding', () => {
  it('round-trips the six numbers and the name', () => {
    const decoded = decodeScenario(`?${encodeScenario(SCENARIO)}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.inputs).toEqual(SCENARIO.inputs);
    expect(decoded?.name).toBe(SCENARIO.name);
  });

  it('reads a hash and a query string alike', () => {
    const query = decodeScenario(`?${encodeScenario(SCENARIO)}`);
    const hash = decodeScenario(hashFor(SCENARIO));
    expect(hash).toEqual(query);
  });

  // Links written before scenarios could be named have no n= at all.
  it('still opens a link with no name on it', () => {
    const decoded = decodeScenario('#s=10.2_1.91_-1.62_-0.48_1_300');
    expect(decoded?.inputs.population).toBe(10.2);
    expect(decoded?.name).toBe('');
  });

  it('returns null for anything malformed', () => {
    for (const text of ['', '#', '#s=', '#s=1_2_3', '#s=a_b_c_d_e_f', '?x=1']) {
      expect(decodeScenario(text), text).toBeNull();
    }
  });

  it('carries a name with punctuation through a link', () => {
    const awkward = { ...SCENARIO, name: 'Coal & gas: "steady" 50% #2' };
    const decoded = decodeScenario(`?${encodeScenario(awkward)}`);
    expect(decoded?.name).toBe(awkward.name);
    expect(decoded?.inputs).toEqual(awkward.inputs);
  });

  it('trims, collapses and caps a name', () => {
    expect(cleanName('  two   spaces  ')).toBe('two spaces');
    expect(cleanName('x'.repeat(200))).toHaveLength(60);
  });

  it('clamps values that arrive outside a slider range', () => {
    const decoded = decodeScenario('#s=99_1.91_-1.62_-0.48_1_300');
    expect(decoded?.inputs.population).toBe(14);
  });
});

describe('the hand-off links', () => {
  it('points a learn link at the page with the state on it', () => {
    expect(learnHref('population', SCENARIO))
      .toBe(`/learn/population/?${encodeScenario(SCENARIO)}`);
  });

  it('names the field a builder replaced on the way back', () => {
    const href = returnHref(SCENARIO, 'population');
    expect(href.startsWith('/?applied=population#s=')).toBe(true);
  });

  it('returns an unchanged scenario with no marker on it', () => {
    expect(returnHref(SCENARIO)).toBe(`/${hashFor(SCENARIO)}`);
  });
});

describe('fitting a builder value to a slider', () => {
  it('lands every input on its own step', () => {
    for (const spec of INPUT_SPECS) {
      const value = roundToStep(spec.id, (spec.min + spec.max) / 2 + spec.step / 3);
      const steps = (value - spec.min) / spec.step;
      expect(Math.abs(steps - Math.round(steps)), spec.id).toBeLessThan(1e-6);
    }
  });

  it('clamps and says which end it hit', () => {
    expect(fitToSlider('population', 99)).toEqual({ value: 14, clamped: 'max' });
    expect(fitToSlider('population', 1)).toEqual({ value: 6, clamped: 'min' });
    expect(fitToSlider('population', 10.24)).toEqual({ value: 10.2, clamped: null });
  });

  it('replaces one field and leaves the other five alone', () => {
    const changed = withInput(SCENARIO.inputs, 'population', 11.3);
    expect(changed.population).toBe(11.3);
    for (const id of INPUT_IDS) {
      if (id === 'population') continue;
      expect(changed[id], id).toBe(SCENARIO.inputs[id]);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { ANALOGUES, ANALOGUE_BAND, analogueFor } from '../src/model/analogue.js';
import { analogueTile } from '../src/ui/stats.js';
import { PRESETS } from '../src/model/bounds.js';
import { computePath } from '../src/model/kaya.js';

const byName = (name: string) => {
  const country = ANALOGUES.find((entry) => entry.name === name);
  if (country === undefined) throw new Error(`no economy named ${name}`);
  return country;
};

const inBand = (target: number) => ANALOGUES.filter(
  (c) => Math.abs(c.kg_co2_per_usd - target) <= ANALOGUE_BAND * target,
);

/** Every 0.001 from below the table to above it. */
function sweep(): number[] {
  const out: number[] = [];
  for (let t = 0.001; t <= 0.70; t += 0.001) out.push(Number(t.toFixed(3)));
  return out;
}

describe('the country the 2100 world resembles', () => {
  // The reason the rule changed: nearest alone handed back whichever economy
  // happened to sit on the number, however small.
  it('prefers the larger economy over the one that merely sits closest', () => {
    const target = 0.126;
    const newZealand = byName('New Zealand');
    const netherlands = byName('Netherlands');
    expect(Math.abs(newZealand.kg_co2_per_usd - target))
      .toBeLessThan(Math.abs(netherlands.kg_co2_per_usd - target));
    expect(netherlands.gdp_ppp_bn_usd).toBeGreaterThan(newZealand.gdp_ppp_bn_usd * 4);

    const verdict = analogueFor(target);
    expect(verdict?.kind).toBe('match');
    if (verdict?.kind === 'match') expect(verdict.country.name).toBe('Netherlands');
  });

  // The tile states a likeness, so a named economy has to hold it. Anything
  // outside the band is reported as no match rather than named.
  it('names an economy only when one sits inside the band', () => {
    for (const target of sweep()) {
      const verdict = analogueFor(target);
      const band = inBand(target);
      if (band.length === 0) {
        expect(verdict?.kind, `${target} should not name an economy`).not.toBe('match');
        continue;
      }
      expect(verdict?.kind, `${target} should name one`).toBe('match');
      if (verdict?.kind !== 'match') continue;
      expect(Math.abs(verdict.country.kg_co2_per_usd - target))
        .toBeLessThanOrEqual(ANALOGUE_BAND * target);
      expect(verdict.country.gdp_ppp_bn_usd)
        .toBe(Math.max(...band.map((c) => c.gdp_ppp_bn_usd)));
    }
  });

  // A 2100 world at 0.011 kg/$ resembles nothing on earth. Saying
  // "Switzerland", which emits 0.043, was worse than saying nothing.
  it('says so when the world is cleaner than every economy', () => {
    const verdict = analogueFor(0.011);
    expect(verdict?.kind).toBe('cleaner');
    if (verdict?.kind === 'cleaner') expect(verdict.nearest.name).toBe('Switzerland');
    expect(analogueTile(0.011).value).toBe('below every economy today');
    expect(analogueTile(0.011).note).toContain('the lowest today is Switzerland');
  });

  it('says so when the world sits in a gap inside the table', () => {
    // Between France at 0.067 and Romania at 0.081, nothing within 5%.
    expect(inBand(0.074)).toEqual([]);
    const verdict = analogueFor(0.074);
    expect(verdict?.kind).toBe('gap');
    expect(analogueTile(0.074).value).toBe('no close match');
    expect(analogueTile(0.074).note).toContain('the nearest is');
  });

  it('says so when the world is beyond every economy', () => {
    const verdict = analogueFor(0.9);
    expect(verdict?.kind).toBe('dirtier');
    if (verdict?.kind === 'dirtier') expect(verdict.nearest.name).toBe('Turkmenistan');
    expect(analogueTile(0.9).value).toBe('above every economy today');
  });

  // Whatever the verdict, both lines have to say something, and the note has
  // to carry the reader's own number so the gap stays visible.
  it('always fills both lines of the tile, and always prints the ratio', () => {
    for (const target of sweep()) {
      const tile = analogueTile(target);
      expect(tile.value.length, `${target} value`).toBeGreaterThan(0);
      expect(tile.note, `${target} note`).toContain('kg CO₂ per dollar');
      expect(tile.value).not.toContain('undefined');
      expect(tile.note).not.toContain('undefined');
      expect(tile.note).not.toContain('NaN');
    }
  });

  // Three of the eight presets land below the whole table. Before this they
  // all claimed Switzerland.
  it('reports the presets honestly', () => {
    const named: string[] = [];
    for (const preset of PRESETS) {
      const intensity = computePath(preset.inputs).final.kgCo2PerUsd;
      const tile = analogueTile(intensity);
      if (analogueFor(intensity)?.kind !== 'match') named.push(preset.label);
      expect(tile.value.length, preset.label).toBeGreaterThan(0);
    }
    expect(named).toContain('CMIP7 MEDIUM-to-LOW');
    expect(named).toContain('CMIP7 VERY LOW');
    expect(named).toContain('Ausubel methane economy');
  });
});

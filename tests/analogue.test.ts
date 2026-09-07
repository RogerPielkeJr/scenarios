import { describe, expect, it } from 'vitest';
import {
  ANALOGUES, ANALOGUE_BAND, CLEANER_THAN_ANYWHERE, analogueFor,
} from '../src/model/analogue.js';
import { PRESETS } from '../src/model/bounds.js';
import { computePath } from '../src/model/kaya.js';

const byName = (name: string) => {
  const country = ANALOGUES.find((entry) => entry.name === name);
  if (country === undefined) throw new Error(`no economy named ${name}`);
  return country;
};

describe('the country the 2100 world resembles', () => {
  // The reason the rule changed: nearest alone handed back whichever economy
  // happened to sit on the number, however small.
  it('prefers the larger economy over the one that merely sits closest', () => {
    const target = 0.126;
    const newZealand = byName('New Zealand');
    const netherlands = byName('Netherlands');
    // New Zealand is nearer on the ratio and a fifth of the size.
    expect(Math.abs(newZealand.kg_co2_per_usd - target))
      .toBeLessThan(Math.abs(netherlands.kg_co2_per_usd - target));
    expect(netherlands.gdp_ppp_bn_usd).toBeGreaterThan(newZealand.gdp_ppp_bn_usd * 4);

    expect(analogueFor(target)?.name).toBe('Netherlands');
  });

  // The tile states a likeness, so the economy it names has to hold it.
  it('never names an economy outside the band while one sits inside it', () => {
    for (let target = 0.01; target <= 0.62; target += 0.001) {
      const picked = analogueFor(target);
      if (picked === null) continue;
      const inBand = ANALOGUES.filter(
        (c) => Math.abs(c.kg_co2_per_usd - target) <= ANALOGUE_BAND * target,
      );
      if (inBand.length === 0) continue;
      expect(Math.abs(picked.kg_co2_per_usd - target), `${target.toFixed(3)} → ${picked.name}`)
        .toBeLessThanOrEqual(ANALOGUE_BAND * target);
    }
  });

  it('names the largest economy in the band, never a smaller one', () => {
    for (let target = 0.01; target <= 0.62; target += 0.001) {
      const picked = analogueFor(target);
      if (picked === null) continue;
      const inBand = ANALOGUES.filter(
        (c) => Math.abs(c.kg_co2_per_usd - target) <= ANALOGUE_BAND * target,
      );
      if (inBand.length === 0) continue;
      const largest = Math.max(...inBand.map((c) => c.gdp_ppp_bn_usd));
      expect(picked.gdp_ppp_bn_usd, `${target.toFixed(3)} → ${picked.name}`).toBe(largest);
    }
  });

  // An empty band is not a failure: at the clean end of the table no economy
  // of any size sits within 5%, and the nearest still says something true.
  it('falls back to the nearest economy when nothing sits within the band', () => {
    const target = 0.037;
    const inBand = ANALOGUES.filter(
      (c) => Math.abs(c.kg_co2_per_usd - target) <= ANALOGUE_BAND * target,
    );
    expect(inBand).toEqual([]);
    expect(analogueFor(target)?.name).toBe('Switzerland');
  });

  it('says nothing rather than something wrong below the whole table', () => {
    expect(analogueFor(CLEANER_THAN_ANYWHERE)).toBeNull();
    expect(analogueFor(0)).toBeNull();
    expect(analogueFor(-1)).toBeNull();
  });

  // Whatever the reader builds, the tile has to name an economy.
  it('names one for every preset', () => {
    for (const preset of PRESETS) {
      const intensity = computePath(preset.inputs).final.kgCo2PerUsd;
      if (intensity <= CLEANER_THAN_ANYWHERE) continue;
      expect(analogueFor(intensity), preset.label).not.toBeNull();
    }
  });
});

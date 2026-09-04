import { describe, expect, it } from 'vitest';
import { ANCHORS, addedWarming, warming } from '../src/model/emulator.js';
import { MARKERS, placeAmongMarkers } from '../src/model/markers.js';

/** Emulator minus FaIR, per marker. */
const errors = MARKERS.map((m) => ({
  id: m.id,
  label: m.label,
  error: warming(m.cumulativeGt, m.methaneMt) - m.warmingC,
}));

const rms = Math.sqrt(errors.reduce((s, e) => s + e.error ** 2, 0) / errors.length);

describe('emulator', () => {
  it('reproduces the seven FaIR marker runs with an RMS of 0.12 C', () => {
    expect(rms).toBeCloseTo(0.12, 2);
    expect(rms).toBeLessThan(0.13);
  });

  it('reproduces six of the seven markers within 0.15 C', () => {
    const within = errors.filter((e) => Math.abs(e.error) <= 0.15).map((e) => e.id);
    expect(within.sort()).toEqual(['H', 'L', 'LN', 'M', 'ML', 'VL']);
  });

  // The brief asks for all seven within 0.15 C. Six are; HIGH-to-LOW is not,
  // and this test pins the size of that miss so it cannot drift unnoticed.
  // HIGH-to-LOW overshoots then falls steeply and carries the second-lowest
  // methane of the seven, and a fit that reads only cumulative CO2 and
  // methane has no way to see the difference. Raised with the author; see
  // METHODS.md, "What the emulator cannot see".
  it('misses HIGH-to-LOW by 0.26 C, the known limit of a cumulative-only fit', () => {
    const hl = errors.find((e) => e.id === 'HL');
    expect(hl).toBeDefined();
    expect(hl?.error).toBeCloseTo(-0.256, 2);
  });

  it('is monotonic in cumulative CO2 and in methane', () => {
    expect(warming(3000, 380)).toBeGreaterThan(warming(2000, 380));
    expect(warming(2000, 500)).toBeGreaterThan(warming(2000, 380));
  });

  it('treats negative cumulative CO2 as zero rather than taking log of a negative', () => {
    expect(Number.isFinite(warming(-500, 380))).toBe(true);
    expect(warming(-500, 380)).toBe(warming(0, 380));
  });

  it('measures added warming against the 2015-2024 average', () => {
    expect(ANCHORS.recentMeanC).toBe(1.24);
    expect(addedWarming(3777, 533.1)).toBeCloseTo(warming(3777, 533.1) - 1.24, 9);
  });
});

describe('placeAmongMarkers', () => {
  it('names the two markers a value falls between', () => {
    expect(placeAmongMarkers(3.05)).toBe('between CMIP7 MEDIUM and HIGH');
  });

  it('says when a value is above the warmest marker', () => {
    expect(placeAmongMarkers(4.0)).toBe('above CMIP7 HIGH');
  });

  it('says when a value is below the coolest marker', () => {
    expect(placeAmongMarkers(1.2)).toBe('below every CMIP7 scenario');
  });

  it('says "about" when a value sits on a marker', () => {
    expect(placeAmongMarkers(3.26)).toBe('about CMIP7 HIGH');
  });
});

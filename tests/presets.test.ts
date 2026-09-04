import { describe, expect, it } from 'vitest';
import { DOCUMENTED_PRESETS, PRESETS } from '../src/model/bounds.js';
import { warming } from '../src/model/emulator.js';
import { computePath } from '../src/model/kaya.js';
import { INPUT_IDS } from '../src/model/types.js';
import { SPEC_BY_ID } from '../src/model/config.js';
import { MARKER_BY_ID } from '../src/model/markers.js';

describe('presets', () => {
  it('offers the four the brief documents', () => {
    expect(DOCUMENTED_PRESETS.map((p) => p.label)).toEqual([
      'Kaya at observed rates',
      'Trend continues',
      'Slowest technical progress',
      'Ausubel methane economy',
    ]);
  });

  it('sets all six inputs, each inside its slider range', () => {
    for (const preset of PRESETS) {
      for (const id of INPUT_IDS) {
        const value = preset.inputs[id];
        expect(value, `${preset.label}.${id}`).toBeTypeOf('number');
        expect(value, `${preset.label}.${id}`).toBeGreaterThanOrEqual(SPEC_BY_ID[id].min);
        expect(value, `${preset.label}.${id}`).toBeLessThanOrEqual(SPEC_BY_ID[id].max);
      }
    }
  });

  it.each(DOCUMENTED_PRESETS.map((p) => [p.label, p] as const))(
    'reproduces the documented cumulative CO2 and warming for %s',
    (_label, preset) => {
      const expected = preset.expected;
      expect(expected).toBeDefined();
      if (!expected) return;
      const path = computePath(preset.inputs);
      const t = warming(path.cumulativeGt, preset.inputs.methane);
      expect(Math.abs(path.cumulativeGt - expected.cumulative_gt))
        .toBeLessThanOrEqual(expected.tolerance_gt);
      expect(Math.abs(t - expected.warming_c)).toBeLessThanOrEqual(expected.tolerance_c);
    },
  );

  // The two bounds bracket what technological trajectories permit, so they
  // bracket the Kaya-based presets. They do not bracket the CMIP7 marker
  // presets: VERY LOW reaches 1,168 Gt, below the fast bound, by leaning on a
  // 4.7 Gt land sink rather than on any technology rate.
  it('puts the two technology bounds either side of the other documented presets', () => {
    const totals = new Map(DOCUMENTED_PRESETS.map(
      (p) => [p.label, computePath(p.inputs).cumulativeGt] as const));
    const slowest = totals.get('Slowest technical progress') ?? 0;
    const ausubel = totals.get('Ausubel methane economy') ?? 0;
    expect(slowest).toBeGreaterThan(ausubel);
    for (const preset of DOCUMENTED_PRESETS) {
      if (preset.label === 'Slowest technical progress') continue;
      if (preset.label === 'Ausubel methane economy') continue;
      const total = totals.get(preset.label) ?? 0;
      expect(total, `${preset.label} below the slow bound`).toBeLessThan(slowest);
      expect(total, `${preset.label} above the fast bound`).toBeGreaterThan(ausubel);
    }
  });

  // The three CMIP7 presets load a marker's Kaya factors into the sliders.
  // Two land close to the marker they name; VERY LOW cannot, because the
  // Kaya identity has no term for engineered carbon removal and that marker
  // goes net negative after 2050. Pinned so the size of each gap is visible.
  // See METHODS.md, "What the tool does not represent".
  it.each([
    ['CMIP7 HIGH', 'H', 300],
    ['CMIP7 MEDIUM', 'M', 60],
    ['CMIP7 VERY LOW', 'VL', 950],
  ])('reproduces %s to within %i Gt of its marker', (label, markerId, toleranceGt) => {
    const preset = PRESETS.find((p) => p.label === label);
    expect(preset).toBeDefined();
    if (!preset) return;
    const marker = MARKER_BY_ID[markerId];
    expect(marker).toBeDefined();
    const path = computePath(preset.inputs);
    expect(Math.abs(path.cumulativeGt - (marker?.cumulativeGt ?? 0)))
      .toBeLessThanOrEqual(Number(toleranceGt));
  });
});

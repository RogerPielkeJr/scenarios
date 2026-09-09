import { describe, expect, it } from 'vitest';
import { DOCUMENTED_PRESETS, PRESETS, presetByLabel } from '../src/model/bounds.js';
import { warming } from '../src/model/emulator.js';
import { computePath } from '../src/model/kaya.js';
import { INPUT_IDS } from '../src/model/types.js';
import {
  DEFAULT_PRESET, INPUT_SPECS, OBSERVED_RATES, SPEC_BY_ID, defaultInputs,
} from '../src/model/config.js';
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

  // The page has to open on a scenario that has a name, so that the reader's
  // first view is something they can look up rather than an unlabelled set of
  // numbers. The prototype opened on observed rates but with land use at zero,
  // which matched nothing.
  it('opens on a named preset, with every slider defaulted to it', () => {
    const preset = presetByLabel(DEFAULT_PRESET);
    expect(preset, DEFAULT_PRESET).toBeDefined();
    expect(defaultInputs()).toEqual(preset?.inputs);
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
    'reproduces the documented cumulative CO₂ and warming for %s',
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

  // The four CMIP7 presets load a marker's Kaya factors into the sliders.
  // Every CMIP7 preset now reproduces its own marker's century total, because
  // the timing and removal values come from fitting that marker's published
  // path in scripts/build_carried_data.py. Before those two controls existed
  // the same four presets missed by -12, +325, -480 and +1,031 GtCO2: a
  // constant rate carried one improvement evenly across 75 years while the
  // markers bend, and a product of positive Kaya terms never reached the
  // net-negative emissions two of them end on.
  //
  // VERY LOW keeps the widest gap in absolute terms and the smallest in
  // consequence: 55 GtCO2 on a total of 268, which the logarithmic emulator
  // turns into three hundredths of a degree.
  it.each([
    { label: 'CMIP7 HIGH', markerId: 'H', toleranceGt: 20 },
    { label: 'CMIP7 MEDIUM', markerId: 'M', toleranceGt: 20 },
    { label: 'CMIP7 MEDIUM-to-LOW', markerId: 'ML', toleranceGt: 20 },
    // VERY LOW is the one marker the 2026-09-09 land-use base made worse,
    // from 55 to 68 GtCO2: its own land use is a sink of -4.71, so raising the
    // base raises the whole early ramp against it. The other three improved.
    { label: 'CMIP7 VERY LOW', markerId: 'VL', toleranceGt: 70 },
  ])('reproduces $label to within $toleranceGt Gt of its marker',
    ({ label, markerId, toleranceGt }) => {
      const preset = PRESETS.find((p) => p.label === label);
      expect(preset).toBeDefined();
      if (!preset) return;
      const marker = MARKER_BY_ID[markerId];
      expect(marker).toBeDefined();
      const path = computePath(preset.inputs);
      expect(Math.abs(path.cumulativeGt - (marker?.cumulativeGt ?? 0)))
        .toBeLessThanOrEqual(toleranceGt);
    });

  // What is left between a preset's warming and its marker's is the emulator's
  // own residual, not the path's. Feeding the emulator the marker's published
  // cumulative gives nearly the same answer as feeding it the reconstruction,
  // which is what says the reconstruction has stopped being the source of the
  // difference. The emulator misses the markers by up to 0.26 C on its own;
  // no arrangement of sliders reaches past that.
  it.each([
    { label: 'CMIP7 HIGH', markerId: 'H' },
    { label: 'CMIP7 MEDIUM', markerId: 'M' },
    { label: 'CMIP7 MEDIUM-to-LOW', markerId: 'ML' },
    { label: 'CMIP7 VERY LOW', markerId: 'VL' },
  ])('leaves only the emulator between $label and its marker', ({ label, markerId }) => {
    const preset = PRESETS.find((p) => p.label === label);
    const marker = MARKER_BY_ID[markerId];
    expect(preset).toBeDefined();
    expect(marker).toBeDefined();
    if (!preset || !marker) return;
    const ours = warming(computePath(preset.inputs).cumulativeGt, preset.inputs.methane);
    const onMarkerTotal = warming(marker.cumulativeGt, preset.inputs.methane);
    // VERY LOW is the loosest at 0.031: its 55 GtCO2 gap sits on a total of
    // 268, where the logarithm is steepest.
    expect(Math.abs(ours - onMarkerTotal), label).toBeLessThanOrEqual(0.04);
  });


  // The brief states 4,600 Gt and 3.4 degC for the slow bound and 1,400 and
  // 2.2 for the fast one. Recalibrating the base year moved the totals but
  // barely moved the warming, because the emulator is logarithmic in
  // cumulative CO2. Pinned so the gap against the published figures stays
  // visible rather than being quietly absorbed.
  it('moves cumulative CO₂ away from the figures the brief states, but not warming', () => {
    for (const preset of DOCUMENTED_PRESETS) {
      const stated = preset.expected?.brief_stated;
      if (!stated || !preset.expected) continue;
      const path = computePath(preset.inputs);
      const t = warming(path.cumulativeGt, preset.inputs.methane);
      expect(path.cumulativeGt / stated.cumulative_gt).toBeGreaterThan(1.09);
      // The slow bound is the widest at 1.17, because it took the land-use
      // base and the fuel-mix basis together; the fast bound sits at 1.15.
      expect(path.cumulativeGt / stated.cumulative_gt).toBeLessThan(1.18);
      expect(Math.abs(t - stated.warming_c)).toBeLessThan(0.14);
    }
  });
});

describe('the corrected carbon-intensity rate', () => {
  it('marks the slider with the basis the slider measures', () => {
    const spec = INPUT_SPECS.find((input) => input.id === 'co2PerEnergy');
    expect(spec?.reference.value).toBeCloseTo(-0.15, 2);
    expect(OBSERVED_RATES.co2PerEnergy).toBeCloseTo(-0.15, 2);
  });

  it('reproduces the rate from the fuel mix data rather than restating it', async () => {
    const fuelMix = (await import('../src/data/learn_fuel_mix.json')).default;
    expect(OBSERVED_RATES.co2PerEnergy)
      .toBeCloseTo(Number(fuelMix.constants.rates.sliderBasis1990.toFixed(2)), 6);
  });

  // Anything published against an older figure has to stay traceable, and each
  // recalibration has to leave the one before it readable. The 2026-09-09
  // land-use change briefly wrote over the 2026-09-05 carbon-intensity one,
  // which is why this is a chain rather than a slot.
  it('keeps every figure the presets carried before a correction', async () => {
    const config = (await import('../src/data/config.json')).default;
    expect(config.supersededRates.co2PerEnergy).toBeCloseTo(-0.21, 2);
    const observed = PRESETS.find((preset) => preset.id === 'kaya-at-observed-rates');
    expect(observed?.inputs.co2PerEnergy).toBeCloseTo(-0.15, 2);
    const chain = observed?.expected?.superseded ?? [];
    expect(chain.map((entry) => entry.cumulative_gt)).toEqual([4177.7, 4083.9]);
    expect(chain.map((entry) => entry.until)).toEqual(['2026-09-09', '2026-09-05']);
    // Newest first, and every entry says what changed.
    for (const entry of chain) expect(entry.why.length).toBeGreaterThan(20);
  });
});

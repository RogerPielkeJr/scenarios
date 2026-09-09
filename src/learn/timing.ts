/**
 * Learn More: when the improvement arrives.
 *
 * Every number comes from src/data/learn_timing.json, which
 * scripts/build_timing.py derives from the observed energy-intensity and fuel-mix
 * paths this site already carries, and from each marker's own timing value as
 * fitted in scripts/build_carried_data.py.
 */
import data from '../data/learn_timing.json';
import { BASE_YEAR, END_YEAR, SPEC_BY_ID } from '../model/config.js';
import { accumulatedYears } from '../model/rates.js';
import type { PlotSpec } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';
import { TIMING_SOURCES } from './sources/timing.js';

const SPEC = SPEC_BY_ID['improvementTiming'];
const EI = data.observed.energyPerDollar;
const CI = data.observed.co2PerEnergy;
const SPAN = END_YEAR - BASE_YEAR;
const MID_YEAR = BASE_YEAR + Math.round(SPAN / 2);

const pc = (value: number) => `${Math.round(value)}%`;
const rate = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}% a year`;

function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_timing.json`);
  return found;
}

/**
 * A worked path for one share, as a percentage of the improvement banked by
 * each year. This is the slider's own arithmetic, drawn.
 */
function bankedCurve(share: number): Array<{ year: number; value: number }> {
  const points: Array<{ year: number; value: number }> = [];
  for (let year = BASE_YEAR; year <= END_YEAR; year += 5) {
    points.push({
      year,
      value: (accumulatedYears(year - BASE_YEAR, SPAN, share) / SPAN) * 100,
    });
  }
  return points;
}

const PARTS: BuilderPart[] = [
  {
    id: 'share',
    label: `Share of the improvement delivered by ${MID_YEAR}`,
    min: SPEC.min,
    max: SPEC.max,
    step: SPEC.step,
    default: SPEC.default,
    decimals: 0,
    unitSuffix: '%',
    note: `Half by the midpoint gives a constant rate. The record shows `
      + `${pc(EI.sharePercent)} for energy per dollar over ${EI.firstYear} to ${EI.lastYear} `
      + `and ${pc(CI.sharePercent)} for the fuel mix over the same years.`,
    marks: [
      { value: 50, label: 'steady', kind: 'observed' },
      { value: Math.round(EI.sharePercent), label: 'energy', kind: 'low' },
      { value: Math.round(CI.sharePercent), label: 'fuel mix', kind: 'high' },
    ],
  },
];

export const TIMING_PAGE: LearnPageSpec = {
  slug: 'timing',
  accent: '#0f6f74',
  input: 'improvementTiming',
  title: 'When the improvement arrives',
  standfirst: 'The two technology sliders set the 2100 level of energy per dollar and CO₂ '
    + 'per unit of energy. This one sets how that change spreads across the years between. '
    + 'Every setting gives the same 2100 level and a different cumulative total.',

  definition: {
    quantity: `Share of the century's technology improvement delivered by ${MID_YEAR}`,
    units: 'per cent',
    place: 'On the two technology factors, redistributing their rates across the century at '
      + 'a fixed 2100 level',
    today: '50%, a constant annual rate, and the model’s behaviour before this control',
    paragraphs: [
      'Two scenarios can end the century at the same annual emissions after very different '
      + 'paths. Warming follows the cumulative CO₂, so a path that cuts early and then '
      + 'flattens accumulates less than one that stays high and then falls, at the same 2100 '
      + 'figure.',
      `This control sets that difference as one number: the share of the century's `
      + `improvement in energy per dollar and CO₂ per unit of energy that lands by `
      + `${MID_YEAR}. At 50 the annual rate holds constant. Above 50 the rate runs faster in `
      + 'the first half of the century and slower in the second; below 50 the order reverses.',
      'Every setting gives the same 2100 level. The rate sliders fix that level and this '
      + 'control changes only the shape of the path to it, so moving it changes the '
      + 'cumulative total and the warming at a fixed endpoint.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The record, timed.',
    paragraphs: [
      `The two factors differ in the record. Energy per dollar `
      + `improved ${rate(EI.firstHalf.rate)} over `
      + `${EI.firstHalf.from} to ${EI.firstHalf.to} and ${rate(EI.secondHalf.rate)} over `
      + `${EI.secondHalf.from} to ${EI.secondHalf.to}, so it banked ${pc(EI.sharePercent)} of `
      + 'its improvement by the midpoint.',
      `The fuel mix did the reverse. It improved ${rate(CI.firstHalf.rate)} over `
      + `${CI.firstHalf.from} to ${CI.firstHalf.to} and ${rate(CI.secondHalf.rate)} over `
      + `${CI.secondHalf.from} to ${CI.secondHalf.to}, banking ${pc(CI.sharePercent)} of it by `
      + `the midpoint. Coal's share of a growing energy system accounts for the slowdown `
      + 'after that.',
      'One factor therefore ran late and the other early, and neither at a constant rate. A '
      + 'constant rate rests on assumption; nothing in the record shows one.',
    ],
    caption: `Each factor as a share of its ${EI.firstYear}-to-${EI.lastYear} improvement, `
      + 'banked year by year, against the straight line of a constant rate. A curve above the '
      + 'line marks an early path, one below it a late path.',
    dataSource: 'Energy Institute Statistical Review and World Bank GDP, 1965 to 2024',
    key: [
      { label: 'Energy per dollar', color: '#b8860b' },
      { label: 'CO₂ per unit of energy', color: '#7b3fa0' },
      { label: 'A constant rate', color: 'var(--dim)', dash: true },
    ],
    spec(): PlotSpec {
      const banked = (id: string) => {
        const s = series(id);
        const first = s.values[0] ?? 1;
        const last = s.values[s.values.length - 1] ?? 1;
        const total = Math.log(last / first);
        return s.years.map((year, i) => ({
          year,
          value: total === 0 ? 0 : (Math.log((s.values[i] ?? first) / first) / total) * 100,
        }));
      };
      const first = EI.firstYear;
      const last = EI.lastYear;
      return {
        xMin: first,
        xMax: last,
        xTicks: [first, 1980, 1994, 2010, last],
        yLabel: '% of the improvement banked',
        yDecimals: 0,
        yMin: 0,
        yMax: 100,
        series: [
          { id: 'steady',
            label: 'A constant rate',
            points: [{ year: first, value: 0 }, { year: last, value: 100 }],
            color: 'var(--dim)', width: 1.4, dash: '4 4' },
          { id: 'ei', label: 'Energy per dollar', points: banked('energyPerDollar'),
            color: '#b8860b', width: 2.4, labelAtEnd: true },
          { id: 'ci', label: 'CO₂ per unit of energy', points: banked('co2PerEnergy'),
            color: '#7b3fa0', width: 2.4, labelAtEnd: true },
        ],
        rightGutter: 96,
      };
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Capital stock, and the order of replacement.',
    paragraphs: [
      'Energy systems change when operators replace their equipment, and equipment lasts '
      + 'decades. A power station built this year still runs in the 2060s, a building shell for '
      + 'longer than that. Timing therefore carries a cost either way: an early improvement '
      + 'takes the retirement of capital before the end of its life, and a late one takes the '
      + 'continued operation of the existing stock.',
      'That difference in capital accounts for the divergence between the two factors. '
      + 'Energy per dollar improves through many small substitutions across the economy, and '
      + 'its rate rose as services grew relative to heavy industry. The fuel mix improves by '
      + 'replacing primary energy plant, which takes longer and more capital per unit, and '
      + 'its rate fell through the build-out of coal capacity.',
      'A scenario weighted toward the first half of the century therefore assumes a faster '
      + 'turnover of capital than one weighted toward the second, at the same 2100 level. The '
      + 'timing and the rate together give the requirement decade by decade.',
      'A late improvement arrives at the same 2100 level with a larger cumulative total. '
      + 'The overshoot-and-remove scenarios follow that arithmetic: they take late paths, and '
      + 'the removal offsets the extra accumulation.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Fitted from their published paths, not stated by them.',
    paragraphs: [
      `The markers publish a CO₂ path and six Kaya rates. They do not publish a timing figure, `
      + `so this tool derives one: the value that makes this model's reconstruction follow `
      + `that marker year by year, at the marker's published rates. `
      + data.markers.map((m) => `${m.label} ${pc(m.timing)}`).join(', ') + '.',
      'MEDIUM takes an early path. Its emissions fall 0.77% a year to 2050 and hold nearly '
      + 'flat after that. MEDIUM-to-LOW takes a late path, and its large removal in the second '
      + 'half of the century offsets the earlier emissions.',
      'Before this control existed, every preset compounded at a constant rate. CMIP7 MEDIUM '
      + 'then came within 1% of its 2100 emissions and 12% above its cumulative total: the '
      + 'same endpoint on a different path, and the cumulative total sets the warming.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'One control, and the resulting path.',
    paragraphs: [
      `Set the share of the century's improvement that lands by ${MID_YEAR}. The readout `
      + 'beneath the slider gives the annual rate at each end of the century, and the chart '
      + 'below gives the recorded share for each factor.',
      'This control leaves the 2100 level of the technology sliders unchanged. The endpoint '
      + 'holds exact at every setting, and the cumulative total moves.',
    ],
    action: 'Use this timing in my scenario',
    modes: [{
      id: 'share',
      label: 'By midpoint share',
      parts: PARTS,
      combine(values) {
        const share = values['share'] ?? SPEC.default;
        // The weight the model puts on the annual rate at each end, which is
        // the derivative of accumulatedYears at t=0 and t=span.
        const early = accumulatedYears(1, SPAN, share);
        const late = SPAN - accumulatedYears(SPAN - 1, SPAN, share);
        const curve = bankedCurve(share);
        const byMid = curve.find((p) => p.year >= MID_YEAR)?.value ?? share;
        return {
          value: share,
          headline: share === 50
            ? 'A steady rate, unchanged through the century'
            : `${pc(share)} of the improvement by ${MID_YEAR}`,
          detail: [
            share === 50
              ? 'The annual rate never changes, which is what this model assumed before this '
                + 'control existed'
              : `The first year moves ${(early / late).toFixed(1)} times as much as the last`,
            `${pc(byMid)} of the century's improvement banked by ${MID_YEAR}`,
            share > 50
              ? 'An early push that eases off, like CMIP7 MEDIUM'
              : share < 50
                ? 'A slow start that builds, like CMIP7 MEDIUM-to-LOW'
                : 'Neither early nor late',
          ],
          values: { share },
        };
      },
    }],
  },

  sources: TIMING_SOURCES,
};

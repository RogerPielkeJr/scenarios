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
    note: `Half by the midpoint is a steady rate. The world managed `
      + `${pc(EI.sharePercent)} on energy per dollar over ${EI.firstYear} to ${EI.lastYear} `
      + `and ${pc(CI.sharePercent)} on the fuel mix over the same years.`,
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
  standfirst: 'The two technology sliders set where energy per dollar and CO₂ per unit of '
    + 'energy end up in 2100. This one sets when they get there. It never moves the '
    + 'destination, only the route, and the route is what decides the century total.',

  definition: {
    quantity: `Share of the century's technology improvement delivered by ${MID_YEAR}`,
    units: 'per cent',
    place: 'On the two technology factors, redistributing their rates through time while '
      + 'holding their 2100 levels exactly',
    today: `50% is a constant rate, which is what this model assumed before this control `
      + 'existed',
    paragraphs: [
      'Two scenarios can end the century at the same emissions and reach it along very '
      + 'different routes, and the route is what the atmosphere responds to. Warming follows '
      + 'the total CO₂ emitted, so a path that cuts early and levels off accumulates far less '
      + 'than one that drifts and then falls, even where both arrive at the same 2100 figure.',
      `This control names that difference in one number: of the whole century's improvement `
      + `in energy per dollar and CO₂ per unit of energy, how much lands by ${MID_YEAR}. At 50 `
      + 'the annual rate never changes. Above 50 the improvement front-loads and then eases; '
      + 'below 50 it builds slowly and arrives late.',
      'The 2100 level stays put whatever you choose. The rate sliders own the destination and '
      + 'this one owns nothing but the shape, so moving it changes the century total and the '
      + 'warming that follows without touching where the path ends.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The record, timed.',
    paragraphs: [
      `Ask the record the question this slider asks and the two technology factors answer it `
      + `in opposite directions. Energy per dollar improved ${rate(EI.firstHalf.rate)} over `
      + `${EI.firstHalf.from} to ${EI.firstHalf.to} and ${rate(EI.secondHalf.rate)} over `
      + `${EI.secondHalf.from} to ${EI.secondHalf.to}: it accelerated, banking only `
      + `${pc(EI.sharePercent)} of its improvement by the midpoint.`,
      `The fuel mix did the reverse. It improved ${rate(CI.firstHalf.rate)} over `
      + `${CI.firstHalf.from} to ${CI.firstHalf.to} and ${rate(CI.secondHalf.rate)} over `
      + `${CI.secondHalf.from} to ${CI.secondHalf.to}, banking ${pc(CI.sharePercent)} of it by `
      + `the midpoint and slowing to almost nothing since. Coal's share of a growing energy `
      + 'system is what stalled it.',
      'So the world has run one factor late and the other early, and neither at a steady rate. '
      + 'That is the honest reason this control exists: a constant rate is a convenient '
      + 'assumption rather than an observed one.',
    ],
    caption: `Each factor as a share of its own ${EI.firstYear}-to-${EI.lastYear} improvement, `
      + 'banked year by year, against the straight line a constant rate would have drawn. '
      + 'A curve above the line ran early; one below it ran late.',
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
    note: 'Capital stock, and the order things get replaced in.',
    paragraphs: [
      'Energy systems change when their equipment is replaced, and equipment lasts decades. A '
      + 'power station built this year is still running in the 2060s, a building shell for '
      + 'longer than that. Timing is therefore not a free choice: front-loading an improvement '
      + 'means retiring capital before it wears out, and deferring one means living with what '
      + 'is already built.',
      'That asymmetry is why the two observed factors diverged. Energy per dollar improves '
      + 'through a thousand small substitutions across the whole economy, and it accelerated '
      + 'as services grew relative to heavy industry. The fuel mix improves by replacing '
      + 'primary energy plant, which is slower, lumpier and more capital-intensive, and it '
      + 'stalled while coal capacity grew.',
      'A scenario that front-loads its improvement therefore assumes a faster turnover of '
      + 'capital than a scenario that defers it, whatever both say about 2100. Reading the '
      + 'timing alongside the rate says what a trajectory asks of the world in the decades a '
      + 'reader will actually live through.',
      'It cuts the other way too. Deferring an improvement puts the same 2100 level in reach '
      + 'while emitting far more along the way, which is the arithmetic behind the '
      + 'overshoot-and-remove scenarios: they are late paths, and they need removal to pay '
      + 'back what the delay accumulated.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Fitted from their published paths, not stated by them.',
    paragraphs: [
      `The markers publish a CO₂ path and six Kaya rates. They do not publish a timing figure, `
      + `so this tool derives one: the value that makes this model's own reconstruction follow `
      + `that marker year by year, at the marker's own rates. `
      + data.markers.map((m) => `${m.label} ${pc(m.timing)}`).join(', ') + '.',
      'MEDIUM front-loads. Its own emissions fall 0.77% a year to 2050 and then almost stop '
      + 'falling, which is a scenario that does its work early and coasts. MEDIUM-to-LOW runs '
      + 'the other way and defers, which is what its large late removal pays for.',
      'Before this control existed, every preset compounded at a constant rate, and the '
      + 'mismatch showed: CMIP7 MEDIUM landed within 1% of its own 2100 emissions and 12% '
      + 'above its century total. Same destination, wrong route, and the total is what warms '
      + 'the planet.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'One control, and the curve it draws.',
    paragraphs: [
      `Set how much of the century's improvement lands by ${MID_YEAR}. The chart above shows `
      + 'what the world managed on each factor; the readout below shows what your choice does '
      + 'to the annual rate at each end of the century.',
      'Nothing here changes where the technology sliders end up in 2100. The endpoint is '
      + 'exact for every setting, which is what makes this a question about route rather than '
      + 'about ambition.',
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

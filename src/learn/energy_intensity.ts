/**
 * Learn More: energy per dollar.
 *
 * Every number comes from src/data/learn_energy_intensity.json, which
 * scripts/build_energy_intensity.py writes from the Energy Institute
 * Statistical Review, the World Bank and the Maddison Project Database.
 */
import data from '../data/learn_energy_intensity.json';
import { BASE, BASE_YEAR, END_YEAR, OBSERVED_RATES } from '../model/config.js';
import { MARKERS, MARKER_BY_ID, markerValueFor } from '../model/markers.js';
import { cagr, compound } from '../model/rates.js';
import { readerLabel } from '../state.js';
import type { PlotSeries, PlotSpec, Point, StripSpec } from '../ui/plot.js';
import type { BuilderOutcome, BuilderPart, LearnPageSpec } from './types.js';
import { ENERGY_INTENSITY_SOURCES } from './sources/energy_intensity.js';

const C = data.constants;
const WINDOWS = data.windows;
const WINDOW_RATES = WINDOWS.rates.map((window) => window.value);

const rate = (value: number) => `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%/yr`;
const mj = (value: number) => `${value.toFixed(2)} MJ per dollar`;

function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_energy_intensity.json`);
  return found;
}

const INTENSITY = series('intensity');

/** The observed intensity in one year, from the record. */
function levelIn(year: number): number {
  const index = INTENSITY.years.indexOf(year);
  if (index < 0) throw new Error(`no observation for ${year}`);
  return INTENSITY.values[index] ?? Number.NaN;
}

/** Share of the 25-year windows that improved more slowly than a rate. */
function percentileOf(value: number): number {
  const slower = WINDOW_RATES.filter((observed) => observed > value).length;
  return (slower / WINDOW_RATES.length) * 100;
}

/** How a rate sits among the windows, in words a reader can act on. */
function placeAmongWindows(value: number): string {
  const faster = WINDOW_RATES.filter((observed) => observed > value).length;
  if (faster === WINDOW_RATES.length) {
    return `faster than every one of the ${WINDOW_RATES.length} `
      + `${WINDOWS.span}-year windows on record`;
  }
  if (faster === 0) {
    return `slower than every one of the ${WINDOW_RATES.length} `
      + `${WINDOWS.span}-year windows on record`;
  }
  return `faster than ${faster} of the ${WINDOW_RATES.length} `
    + `${WINDOWS.span}-year windows on record`;
}

function points(years: readonly number[], values: readonly number[]): Point[] {
  return years.map((year, index) => ({ year, value: values[index] ?? 0 }));
}

/** A constant rate compounding forward from the base year, as a line. */
function forwardPath(ratePercent: number): Point[] {
  const out: Point[] = [];
  for (let year = BASE_YEAR; year <= END_YEAR; year += 5) {
    out.push({ year, value: compound(BASE.energyPerDollarMj, ratePercent, year - BASE_YEAR) });
  }
  return out;
}

function markerSeries(): PlotSeries[] {
  return MARKERS.flatMap((marker) => {
    const value = markerValueFor(marker, 'energyPerDollar');
    if (value === null) return [];
    return [{
      id: marker.id,
      label: marker.id,
      points: forwardPath(value),
      color: marker.color,
      width: 1.6,
      opacity: 0.5,
      labelAtEnd: true,
    }];
  });
}

const OBSERVED = OBSERVED_RATES.energyPerDollar;

/** CMIP7 HIGH's own rate for this term, the one the page argues with. */
const HIGH = MARKER_BY_ID['H'];
const HIGH_RATE = HIGH === undefined ? 0 : markerValueFor(HIGH, 'energyPerDollar') ?? 0;

const WINDOW_PARTS: BuilderPart[] = [
  {
    id: 'start',
    label: 'Window opens',
    min: C.firstYear,
    max: C.lastYear - 10,
    step: 1,
    default: 1990,
    decimals: 0,
    unitSuffix: '',
    note: 'The first year of the window.',
    marks: [
      { value: C.firstYear, label: String(C.firstYear), kind: 'low' },
      { value: 1990, label: '1990', kind: 'observed' },
    ],
  },
  {
    id: 'end',
    label: 'Window closes',
    min: C.firstYear + 10,
    max: C.lastYear,
    step: 1,
    default: C.lastYear,
    decimals: 0,
    unitSuffix: '',
    note: 'At least ten years after the first, so the rate covers a trend.',
    marks: [
      { value: 2000, label: '2000', kind: 'low' },
      { value: C.lastYear, label: String(C.lastYear), kind: 'observed' },
    ],
  },
];

const MULTIPLE_PARTS: BuilderPart[] = [{
  id: 'multiple',
  label: 'Multiple of the observed rate',
  min: 0,
  max: 3,
  step: 0.05,
  default: 1,
  decimals: 2,
  unitSuffix: '×',
  note: `The world improved ${rate(OBSERVED)} from 1990 to ${C.lastYear}. `
    + 'A multiple of one holds that rate, two doubles it, zero gives no change.',
  marks: [
    { value: 0, label: 'halted', kind: 'low' },
    { value: 1, label: 'observed', kind: 'observed' },
    { value: 2, label: 'twice', kind: 'high' },
  ],
}];

/** The rate a start and end year imply, with the ten-year floor applied. */
function windowRate(values: Readonly<Record<string, number>>): {
  from: number; to: number; value: number;
} {
  const from = Math.round(values['start'] ?? 1990);
  const to = Math.max(Math.round(values['end'] ?? C.lastYear), from + 10);
  return { from, to, value: cagr(levelIn(from), levelIn(to), to - from) };
}

export const ENERGY_INTENSITY_PAGE: LearnPageSpec = {
  slug: 'energy-intensity',
  accent: '#1f5fa8',
  input: 'energyPerDollar',
  title: 'Energy per dollar',
  standfirst: 'One slider sets the rate of change in energy used per dollar of output. This '
    + 'page gives the record since 1965, this term’s share of the fall in CO₂ per dollar, '
    + 'and where a candidate rate falls among the rates on record.',

  definition: {
    quantity: 'Primary energy per dollar of world output',
    units: `megajoules per dollar; the slider sets how fast it changes, in %/yr`,
    place: 'The third of the four factors that multiply',
    today: `${mj(BASE.energyPerDollarMj)} (${C.lastYear})`,
    paragraphs: [
      'Energy intensity counts the primary energy used to produce a dollar of output. Three '
      + 'separate movements push it down: higher conversion efficiency in devices, a shift in '
      + 'output from steel, cement and freight toward services and software, and a shift '
      + 'inside each sector toward lighter goods.',
      `The slider sets how fast the term falls each year, compounding from `
      + `${mj(BASE.energyPerDollarMj)} in ${BASE_YEAR}. Continuing the observed `
      + `${rate(OBSERVED)} for 75 years gives `
      + `${mj(compound(BASE.energyPerDollarMj, OBSERVED, END_YEAR - BASE_YEAR))} in 2100. `
      + `CMIP7 HIGH's ${rate(HIGH_RATE)} gives `
      + `${mj(compound(BASE.energyPerDollarMj, HIGH_RATE, END_YEAR - BASE_YEAR))}.`,
      `Between 1990 and ${C.lastYear} this term improved ${rate(OBSERVED)} while the fuel `
      + `mix improved ${rate(OBSERVED_RATES.co2PerEnergy)}. Of the fall in CO₂ per dollar of `
      + `output across those 34 years, energy intensity supplied `
      + `${((OBSERVED / (OBSERVED + OBSERVED_RATES.co2PerEnergy)) * 100).toFixed(0)}%.`,
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The record to 2024, then each scenario’s assumed rate.',
    paragraphs: [
      `World energy intensity fell from ${mj(C.levels.first)} in ${C.firstYear} to `
      + `${mj(C.levels.last)} in ${C.lastYear}, a fall of `
      + `${(100 * (1 - C.levels.last / C.levels.first)).toFixed(0)}% across 59 years. `
      + `Primary energy grew ${rate(C.energy.growth)} over that span and world output `
      + `${rate(C.gdp.growth)}; the gap between those two rates gives this term.`,
      `The whole record improves at ${rate(C.rates.wholeRecord)}, the 34 years the World `
      + `Bank covers at ${rate(C.rates.longRecord)}, and the past decade at `
      + `${rate(C.rates.recentDecade)}.`,
      `Before 1990 no purchasing-power GDP series exists, so the build carries the level `
      + 'back on Maddison Project growth rates. That choice moves the '
      + `whole-record rate: adjusting Maddison's growth to match the World Bank over the 32 `
      + `years they share gives ${rate(C.spliceSensitivity.wholeRecordRate)} instead of `
      + `${rate(C.rates.wholeRecord)}. Every figure from 1990 on comes from the World Bank.`,
    ],
    caption: `World energy intensity, ${C.firstYear} to ${C.lastYear}, then each rate `
      + 'from 2025 on: your rate, the observed rate, and the four CMIP7 markers that publish '
      + 'a rate for this term.',
    dataSource: 'Energy Institute Statistical Review 2026; World Bank purchasing-power GDP; Maddison Project Database 2023 before 1990',
    key: [
      { label: `Record, ${C.firstYear} to ${C.lastYear}`, color: 'var(--ink)' },
      { label: 'Observed rate, continued', color: 'var(--navy)', dash: true },
      { label: 'Your rate', color: 'var(--you)' },
      { label: 'CMIP7 markers', color: 'var(--dim)', dash: true },
    ],
    spec(outcome, scenario): PlotSpec {
      return {
        xMin: C.firstYear,
        xMax: END_YEAR,
        xTicks: [C.firstYear, 1990, 2010, 2025, 2050, 2075, END_YEAR],
        yLabel: 'MJ per dollar',
        yDecimals: 1,
        series: [
          {
            id: 'record',
            label: 'Record',
            points: points(INTENSITY.years, INTENSITY.values),
            color: 'var(--ink)',
            width: 2.4,
          },
          ...markerSeries(),
          {
            id: 'observed',
            label: 'observed',
            points: forwardPath(OBSERVED),
            color: 'var(--navy)',
            width: 1.8,
            dash: '5 4',
            labelAtEnd: true,
          },
          {
            id: 'reader',
            label: readerLabel(scenario, 'Your rate'),
            points: forwardPath(outcome.value),
            color: 'var(--you)',
            width: 3.4,
            labelAtEnd: true,
          },
        ],
        divider: { year: C.lastYear, label: 'assumed' },
      };
    },
    extra: {
      kind: 'strip',
      caption: `Every ${WINDOWS.span}-year window in the record, one tick each, from `
        + `${rate(WINDOWS.fastest.value)} in ${WINDOWS.fastest.from}-${WINDOWS.fastest.to} to `
        + `${rate(WINDOWS.slowest.value)} in ${WINDOWS.slowest.from}-${WINDOWS.slowest.to}. `
        + 'Ticks further left mark faster improvement.',
      dataSource: 'Energy Institute Statistical Review 2026 over World Bank and Maddison output',
      spec(outcome: BuilderOutcome, scenario): StripSpec {
        const chosen = outcome.value;
        const min = Math.min(-2.6, Math.floor((chosen - 0.3) * 2) / 2);
        const max = Math.max(0.2, Math.ceil((chosen + 0.3) * 2) / 2);

        return {
          values: WINDOW_RATES,
          highlights: [
            { id: 'observed', label: 'observed', value: OBSERVED, color: 'var(--navy)' },
            { id: 'high', label: 'CMIP7 HIGH', value: HIGH_RATE, color: 'var(--scenario-high)' },
            {
              id: 'reader',
              label: readerLabel(scenario, 'your rate'),
              value: chosen,
              color: 'var(--you)',
            },
          ],
          min,
          max,
          ticks: [-2.5, -2, -1.5, -1, -0.5, 0].filter((t) => t >= min && t <= max),
          axisLabel: '%/yr, improvement to the left',
          decimals: 1,
        };
      },
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Efficiency, structural change, and the range in the record.',
    paragraphs: [
      'Efficiency accounts for part of it. A combined-cycle gas turbine converts more of its '
      + 'fuel into electricity than the plant it replaces, an electric motor converts more of '
      + 'its electricity into motion than an engine converts fuel, and insulation cuts a '
      + 'building’s heat demand. Each of those lowers the energy per unit of output.',
      'Structural change accounts for a comparable share. A country building out its steel, '
      + 'cement and chemical capacity raises its energy intensity for a decade or two, and a '
      + 'country whose growth moves toward services lowers it. China did the first in the '
      + '2000s, and the world average moved with it.',
      'Sectoral mix moves the term inside each of those sectors: aluminium substituting for '
      + 'steel, road freight shifting to rail, an economy making more pharmaceuticals and '
      + 'less fertiliser. Decomposition studies separate the three and attribute most of the '
      + 'recorded fall to efficiency, with structural change second.',
      `The record gives a range. Across ${WINDOW_RATES.length} `
      + `${WINDOWS.span}-year windows since ${C.firstYear}, the fastest improved `
      + `${rate(WINDOWS.fastest.value)} (${WINDOWS.fastest.from} to ${WINDOWS.fastest.to}) and `
      + `the slowest ${rate(WINDOWS.slowest.value)} (${WINDOWS.slowest.from} to `
      + `${WINDOWS.slowest.to}). Every window falls inside that range of `
      + `${Math.abs(WINDOWS.slowest.value - WINDOWS.fastest.value).toFixed(2)} percentage `
      + 'points. No other Kaya factor varies across a narrower range.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Four of the seven publish a rate for this term.',
    paragraphs: [
      `CMIP7 HIGH assumes ${rate(HIGH_RATE)}, `
      + `${(HIGH_RATE / OBSERVED * 100).toFixed(0)}% of the observed rate and `
      + `${placeAmongWindows(HIGH_RATE)}. Its emissions total therefore rests in part on a `
      + 'near-halt in the term with the narrowest range in the record.',
      'The low markers assume the opposite. HIGH-to-LOW takes 2.29% a year and VERY LOW '
      + '2.11%, both faster than any 25-year window on record. The same term therefore runs '
      + 'above the record in those two scenarios and below it in HIGH.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Take a window from the record, or scale the observed rate.',
    paragraphs: [
      'Two ways in. Pick a window from the record and take the rate across it, or set a '
      + 'multiple of the rate observed since 1990. Either way the page '
      + 'reports where the answer falls among the '
      + `${WINDOW_RATES.length} ${WINDOWS.span}-year windows on record.`,
      'A window shorter than ten years measures a business cycle rather than a trend, so the '
      + 'builder holds the two years at least a decade apart.',
    ],
    action: 'Use this rate in my scenario',
    modes: [
      {
        id: 'window',
        label: 'A window from the record',
        note: 'The rate the world achieved between two years you choose.',
        parts: WINDOW_PARTS,
        combine(values) {
          const window = windowRate(values);
          const level2100 = compound(
            BASE.energyPerDollarMj, window.value, END_YEAR - BASE_YEAR,
          );
          return {
            value: window.value,
            headline: `${rate(window.value)}, the rate of ${window.from} to ${window.to}`,
            detail: [
              `${mj(levelIn(window.from))} in ${window.from}, `
              + `${mj(levelIn(window.to))} in ${window.to}`,
              `Held to 2100, ${mj(BASE.energyPerDollarMj)} today becomes ${mj(level2100)}`,
              `${placeAmongWindows(window.value)}, at the `
              + `${percentileOf(window.value).toFixed(0)}th percentile`,
            ],
          };
        },
      },
      {
        id: 'multiple',
        label: 'A multiple of the observed rate',
        note: `Scaled from the ${rate(OBSERVED)} recorded from 1990 to ${C.lastYear}.`,
        parts: MULTIPLE_PARTS,
        combine(values) {
          const multiple = values['multiple'] ?? 1;
          const value = OBSERVED * multiple;
          const level2100 = compound(BASE.energyPerDollarMj, value, END_YEAR - BASE_YEAR);
          return {
            value,
            headline: `${rate(value)}, ${multiple.toFixed(2)}× the observed rate`,
            detail: [
              `Held to 2100, ${mj(BASE.energyPerDollarMj)} today becomes ${mj(level2100)}`,
              `${placeAmongWindows(value)}, at the ${percentileOf(value).toFixed(0)}th percentile`,
              multiple === 0
                ? 'A halted term: every dollar of extra output brings its full energy with it'
                : `${(100 / multiple).toFixed(0)}% of the years the observed rate needs to `
                  + 'reach the same improvement',
            ],
          };
        },
      },
    ],
  },

  sources: ENERGY_INTENSITY_SOURCES,
};


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
import { displayName } from '../state.js';
import type { PlotSeries, PlotSpec, Point, StripSpec } from '../ui/plot.js';
import type { BuilderOutcome, BuilderPart, LearnPageSpec } from './types.js';

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
    note: 'The first year of the stretch of record you want to borrow.',
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
    note: 'At least ten years after it opens, so a rate means something.',
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
    + 'One times that rate continues it; two doubles it; zero halts it.',
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
  input: 'energyPerDollar',
  title: 'Energy per dollar',
  standfirst: 'One slider sets how fast the world squeezes energy out of each dollar of '
    + 'output. This page shows what that term has done since 1965, why it has carried most '
    + 'of the decarbonisation on record, and where any candidate rate falls among the rates '
    + 'the world has actually run.',

  definition: {
    quantity: 'Primary energy per dollar of world output',
    units: `megajoules per dollar; the slider sets how fast it changes, in %/yr`,
    place: 'The third of the four factors that multiply',
    today: `${mj(BASE.energyPerDollarMj)} (${C.lastYear})`,
    paragraphs: [
      'Energy intensity counts the primary energy the world burns to produce a dollar of '
      + 'output. Three separate movements push it down. Devices convert fuel into useful '
      + 'work more completely; output shifts from steel, cement and freight toward services '
      + 'and software; and within each sector the product mix moves toward lighter goods.',
      `The slider sets how fast the term falls each year, compounding from `
      + `${mj(BASE.energyPerDollarMj)} in ${BASE_YEAR}. Continuing the observed `
      + `${rate(OBSERVED)} for 75 years reaches `
      + `${mj(compound(BASE.energyPerDollarMj, OBSERVED, END_YEAR - BASE_YEAR))} by 2100. `
      + `CMIP7 HIGH's ${rate(HIGH_RATE)} reaches `
      + `${mj(compound(BASE.energyPerDollarMj, HIGH_RATE, END_YEAR - BASE_YEAR))}.`,
      `Between 1990 and ${C.lastYear} this term improved ${rate(OBSERVED)} while the fuel `
      + `mix improved ${rate(OBSERVED_RATES.co2PerEnergy)}. Of the fall in CO2 per dollar of `
      + `output across those 34 years, energy intensity supplied `
      + `${((OBSERVED / (OBSERVED + OBSERVED_RATES.co2PerEnergy)) * 100).toFixed(0)}%.`,
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'History to 2024, then the rates each scenario assumes, compounding forward.',
    paragraphs: [
      `World energy intensity fell from ${mj(C.levels.first)} in ${C.firstYear} to `
      + `${mj(C.levels.last)} in ${C.lastYear}, a fall of `
      + `${(100 * (1 - C.levels.last / C.levels.first)).toFixed(0)}% across 59 years. `
      + `Primary energy grew ${rate(C.energy.growth)} over that span and world output `
      + `${rate(C.gdp.growth)}; the gap between those two rates is this term.`,
      `The whole record improves at ${rate(C.rates.wholeRecord)}. The 34 years the World `
      + `Bank covers on its own improve faster, at ${rate(C.rates.longRecord)}, and the past `
      + `decade faster still, at ${rate(C.rates.recentDecade)}.`,
      `Before 1990 no purchasing-power GDP series exists, so the level is carried back on `
      + 'the growth rates of the Maddison Project Database. That choice moves the '
      + `whole-record rate: adjusting Maddison's growth to match the World Bank over the 32 `
      + `years they share gives ${rate(C.spliceSensitivity.wholeRecordRate)} instead of `
      + `${rate(C.rates.wholeRecord)}. Everything from 1990 onward rests on the World Bank alone.`,
    ],
    caption: `World energy intensity, ${C.firstYear} to ${C.lastYear}, then each rate `
      + 'compounding forward from 2025: your own, the observed rate, and the four CMIP7 '
      + 'markers that publish one.',
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
            label: scenario.name === '' ? 'Your rate' : displayName(scenario.name),
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
        + 'Faster improvement sits to the left.',
      spec(outcome: BuilderOutcome): StripSpec {
        const chosen = outcome.value;
        const min = Math.min(-2.6, Math.floor((chosen - 0.3) * 2) / 2);
        const max = Math.max(0.2, Math.ceil((chosen + 0.3) * 2) / 2);

        return {
          values: WINDOW_RATES,
          highlights: [
            { id: 'observed', label: 'observed', value: OBSERVED, color: 'var(--navy)' },
            { id: 'high', label: 'CMIP7 HIGH', value: HIGH_RATE, color: 'var(--scenario-high)' },
            { id: 'reader', label: 'your rate', value: chosen, color: 'var(--you)' },
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
    note: 'Efficiency, structural change, and what the record permits.',
    paragraphs: [
      'Efficiency does the visible work. A combined-cycle gas turbine converts more of its '
      + 'fuel into electricity than the plant it replaces, an electric motor converts more '
      + 'of its electricity into motion than an engine converts fuel, and insulation cuts '
      + 'the heat a building needs. Each improvement lowers the energy behind a given amount '
      + 'of output.',
      'Structural change does as much and attracts less notice. When a country builds out '
      + 'its steel, cement and chemical capacity, its energy intensity rises for a decade or '
      + 'two; when growth moves toward services, it falls. China ran the first of those '
      + 'movements through the 2000s and the world average followed.',
      'Sectoral mix moves the term inside each of those sectors: aluminium substituting for '
      + 'steel, road freight shifting to rail, an economy making more pharmaceuticals and '
      + 'less fertiliser. Decomposition studies separate the three, and they attribute the '
      + 'bulk of the recorded fall to efficiency with structural change second.',
      `The record bounds the answer. Across ${WINDOW_RATES.length} `
      + `${WINDOWS.span}-year windows since ${C.firstYear}, the fastest improved `
      + `${rate(WINDOWS.fastest.value)} (${WINDOWS.fastest.from} to ${WINDOWS.fastest.to}) and `
      + `the slowest ${rate(WINDOWS.slowest.value)} (${WINDOWS.slowest.from} to `
      + `${WINDOWS.slowest.to}). Every window falls inside that range of `
      + `${Math.abs(WINDOWS.slowest.value - WINDOWS.fastest.value).toFixed(2)} percentage `
      + 'points, which makes this the best-behaved of the four Kaya factors and the one a '
      + 'reader can most fairly extrapolate.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Four of the seven publish a rate for this term.',
    paragraphs: [
      `CMIP7 HIGH assumes ${rate(HIGH_RATE)}, `
      + `${(HIGH_RATE / OBSERVED * 100).toFixed(0)}% of the observed rate and `
      + `${placeAmongWindows(HIGH_RATE)}. A scenario that emits a great `
      + 'deal reaches that total partly by assuming the world stops improving the term that '
      + 'has improved most reliably.',
      'The low markers push the other way. HIGH-to-LOW assumes 2.29% a year and VERY LOW '
      + '2.11%, both faster than any window the world has run for 25 years. Those two '
      + 'scenarios ask for sustained improvement beyond the record in exactly the term the '
      + 'high scenario asks the world to abandon.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Borrow a stretch of the record, or scale the observed rate.',
    paragraphs: [
      'Two ways in. Pick a window from the record and take the rate the world actually ran '
      + 'across it, or set a multiple of the rate observed since 1990. Either way the page '
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
        note: 'The rate the world ran between two years you choose.',
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
        note: `Scaled from the ${rate(OBSERVED)} the world managed from 1990 to ${C.lastYear}.`,
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

  sources: [
    {
      title: 'Statistical Review of World Energy 2026',
      publisher: 'Energy Institute',
      vintage: '2026 edition, data to 2024',
      url: 'https://www.energyinst.org/statistical-review',
      used: 'World primary energy supply, 1965 to 2024, in exajoules.',
    },
    {
      title: 'GDP, PPP (constant 2021 international $), indicator NY.GDP.MKTP.PP.KD',
      publisher: 'World Bank, International Comparison Program',
      vintage: 'accessed 2026',
      url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD',
      used: 'World output from 1990 onward, the denominator of the intensity series and the '
        + 'basis every rate on this page is measured against.',
    },
    {
      title: 'Maddison-style estimates of the evolution of the world economy: A new 2023 update',
      publisher: 'Bolt and van Zanden, Journal of Economic Surveys 38(5)',
      vintage: '2024, database release 2023',
      url: 'https://doi.org/10.1111/joes.12618',
      used: 'World output before 1990, used only for its growth rates, which carry the World '
        + 'Bank level back to 1965.',
    },
    {
      title: 'Decomposition analysis for policymaking in energy: which is the preferred method?',
      publisher: 'Ang, Energy Policy 32(9)',
      vintage: '2004',
      url: 'https://doi.org/10.1016/S0301-4215(03)00076-4',
      used: 'The index methods that separate efficiency from structural change and sectoral '
        + 'mix inside a change in energy intensity.',
    },
    {
      title: 'Energy and Economic Growth: The Stylized Facts',
      publisher: 'Csereklyei, Rubio-Varas and Stern, The Energy Journal 37(2)',
      vintage: '2016',
      url: 'https://doi.org/10.5547/01956574.37.2.zcse',
      used: 'The regularity of energy intensity decline across countries and income levels.',
    },
    {
      title: 'The role of energy in economic growth',
      publisher: 'Stern, Annals of the New York Academy of Sciences 1219',
      vintage: '2011',
      url: 'https://doi.org/10.1111/j.1749-6632.2010.05921.x',
      used: 'How energy use and output move together, and what breaks the link between them.',
    },
    {
      title: 'Emissions Trends and Drivers (Chapter 2, IPCC AR6 Working Group III)',
      publisher: 'Intergovernmental Panel on Climate Change',
      vintage: '2022',
      url: 'https://doi.org/10.1017/9781009157926.004',
      used: 'The Kaya decomposition of recorded emissions growth, including the shares '
        + 'energy intensity and carbon intensity each supplied.',
    },
  ],
};

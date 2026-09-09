/**
 * Learn More: income per person.
 *
 * Every number comes from src/data/learn_income.json, which
 * scripts/build_income.py writes from the World Bank aggregates and the
 * Maddison Project Database.
 */
import data from '../data/learn_income.json';
import { BASE, BASE_YEAR, END_YEAR, SPEC_BY_ID } from '../model/config.js';
import { MARKERS, MARKER_BY_ID, markerValueFor } from '../model/markers.js';
import { cagr, compound } from '../model/rates.js';
import { readerLabel } from '../state.js';
import type { PlotSeries, PlotSpec, Point } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';
import { INCOME_SOURCES } from './sources/income.js';

const C = data.constants;
const GROUPS = data.groups;
const SPAN = END_YEAR - BASE_YEAR;
const SPEC = SPEC_BY_ID['income'];

const rate = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%/yr`;
const dollars = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
const times = (value: number) => `${value.toFixed(1)}×`;

function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_income.json`);
  return found;
}

const WORLD = series('world');

function group(id: string) {
  const found = GROUPS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no income group "${id}"`);
  return found;
}

const HIGH_INCOME = group('high');
const MIDDLE_INCOME = group('middle');
const LOW_INCOME = group('low');

/**
 * The three groups reconstruct today's world average to within a third of a
 * percent. The builder scales by that ratio so a mode that starts from the
 * groups lands on the same 2025 figure as the two that start from the world.
 */
const GROUP_CALIBRATION = BASE.gdpPerPersonUsd
  / GROUPS.reduce((sum, g) => sum + (g.populationShare / 100) * g.gdpPerPerson, 0);

function points(years: readonly number[], values: readonly number[]): Point[] {
  return years.map((year, index) => ({ year, value: values[index] ?? 0 }));
}

function forwardPath(ratePercent: number): Point[] {
  const out: Point[] = [];
  for (let year = BASE_YEAR; year <= END_YEAR; year += 5) {
    out.push({ year, value: compound(BASE.gdpPerPersonUsd, ratePercent, year - BASE_YEAR) });
  }
  return out;
}

function markerSeries(): PlotSeries[] {
  return MARKERS.flatMap((marker) => {
    const value = markerValueFor(marker, 'income');
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

const OBSERVED = C.rates.longRecord;
const HIGH = MARKER_BY_ID['H'];
const HIGH_RATE = HIGH === undefined ? 0 : markerValueFor(HIGH, 'income') ?? 0;
const OBSERVED_2100 = compound(BASE.gdpPerPersonUsd, OBSERVED, SPAN);
const HIGH_2100 = compound(BASE.gdpPerPersonUsd, HIGH_RATE, SPAN);

const RATE_PART: BuilderPart = {
  id: 'rate',
  label: 'Growth in income per person',
  min: SPEC.min,
  max: SPEC.max,
  step: 0.01,
  default: Number(OBSERVED.toFixed(2)),
  decimals: 2,
  unitSuffix: '%/yr',
  note: `The world averaged ${rate(OBSERVED)} from 1990 to ${C.lastYear}, `
    + `${rate(C.rates.recentDecade)} over the past decade, and `
    + `${rate(C.rates.wholeRecord)} across the whole record since ${C.firstYear}.`,
  marks: [
    { value: HIGH_RATE, label: 'CMIP7 HIGH', kind: 'low' },
    { value: Number(OBSERVED.toFixed(2)), label: 'observed', kind: 'observed' },
    { value: 3, label: '3%', kind: 'high' },
  ],
};

const LEVEL_PART: BuilderPart = {
  id: 'level',
  label: 'Income per person in 2100',
  min: 15000,
  max: 290000,
  step: 1000,
  default: Math.round(OBSERVED_2100 / 1000) * 1000,
  decimals: 0,
  unitSuffix: ' per person',
  note: `The world average stands at ${dollars(BASE.gdpPerPersonUsd)} today, in constant 2021 `
    + `international dollars. High-income countries average `
    + `${dollars(HIGH_INCOME.gdpPerPerson)} now.`,
  marks: [
    { value: Math.round(HIGH_2100), label: 'CMIP7 HIGH', kind: 'low' },
    { value: Math.round(OBSERVED_2100), label: 'observed rate', kind: 'observed' },
  ],
};

const GROUP_PARTS: BuilderPart[] = GROUPS.map((entry) => ({
  id: entry.id,
  label: `${entry.label} growth`,
  min: -1,
  max: 6,
  step: 0.05,
  default: Number(entry.growth.toFixed(2)),
  decimals: 2,
  unitSuffix: '%/yr',
  note: `${entry.populationShare.toFixed(1)}% of the world's people and `
    + `${entry.gdpShare.toFixed(1)}% of its output, at ${dollars(entry.gdpPerPerson)} per `
    + `person. Grew ${rate(entry.growth)} since 1990, ${rate(entry.growthRecentDecade)} over `
    + 'the past decade.',
  marks: [
    { value: Number(entry.growth.toFixed(2)), label: 'since 1990', kind: 'observed' },
    { value: Number(entry.growthRecentDecade.toFixed(2)), label: 'past decade', kind: 'low' },
  ],
}));

/** The world average implied by three group rates, on today's population shares. */
function weightedWorld(values: Readonly<Record<string, number>>): number {
  const total = GROUPS.reduce((sum, entry) => {
    const growth = values[entry.id] ?? entry.growth;
    return sum + (entry.populationShare / 100) * compound(entry.gdpPerPerson, growth, SPAN);
  }, 0);
  return total * GROUP_CALIBRATION;
}

export const INCOME_PAGE: LearnPageSpec = {
  slug: 'income',
  accent: '#8a5a00',
  input: 'income',
  title: 'Income per person',
  standfirst: 'One slider sets the growth rate of income per person. Over seventy-five years '
    + 'of compounding, a difference of a few tenths of a point in that rate changes the 2100 '
    + 'level by a factor of two or more, and energy demand follows the level.',

  definition: {
    quantity: 'World GDP per person, at purchasing power parity',
    units: 'constant 2021 international dollars; the slider sets its growth rate in %/yr',
    place: 'The second of the four factors that multiply',
    today: `${dollars(BASE.gdpPerPersonUsd)} (${C.lastYear})`,
    paragraphs: [
      'Income per person does two things in the identity. It measures output per person, and '
      + 'it sets demand for the energy services that output takes: heating, cooling, travel, '
      + 'materials and machines.',
      `The world grew ${rate(OBSERVED)} a year from 1990 to ${C.lastYear}. Compounded over 75 `
      + `years, that rate takes ${dollars(BASE.gdpPerPersonUsd)} to `
      + `${dollars(OBSERVED_2100)}. One percentage point lower, ${rate(OBSERVED - 1)}, gives `
      + `${dollars(compound(BASE.gdpPerPersonUsd, OBSERVED - 1, SPAN))}, a factor of `
      + `${times(OBSERVED_2100 / compound(BASE.gdpPerPersonUsd, OBSERVED - 1, SPAN))} between `
      + 'the two. The slider covers a wider range of rates.',
      `The world average covers a wide spread. High-income countries average `
      + `${dollars(HIGH_INCOME.gdpPerPerson)} today and low-income countries `
      + `${dollars(LOW_INCOME.gdpPerPerson)}, a ratio of ${times(C.ratios.highOverLow)}.`,
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The record, then each scenario’s rate from 2025 on.',
    paragraphs: [
      `World output per person rose from ${dollars(C.levels.first)} in ${C.firstYear} to `
      + `${dollars(C.levels.last)} in ${C.lastYear}, at ${rate(C.rates.wholeRecord)} across `
      + `the whole record. The past decade averaged ${rate(C.rates.recentDecade)}.`,
      `The seven markers spread from ${rate(HIGH_RATE)} to `
      + `${rate(Math.max(...MARKERS.map((m) => markerValueFor(m, 'income') ?? 0)))}. `
      + `CMIP7 HIGH sits at the low end. Its rate gives ${dollars(HIGH_2100)} per person in `
      + `2100, against ${dollars(OBSERVED_2100)} at the observed rate: a factor of `
      + `${times(OBSERVED_2100 / HIGH_2100)}. The scenario with the highest emissions of the `
      + `seven also has the largest population, at `
      + `${MARKER_BY_ID['H']?.kaya.populationBn.toFixed(2) ?? ''} billion people.`,
      `Before 1990 the level comes from Maddison Project growth rates rather than the World `
      + 'Bank, as on the energy per dollar page. Every figure from 1990 on comes from the '
      + 'World Bank.',
    ],
    caption: `World GDP per person, ${C.firstYear} to ${C.lastYear}, then your rate and the `
      + 'seven CMIP7 markers compounding forward from 2025. Constant 2021 international '
      + 'dollars at purchasing power parity.',
    dataSource: 'World Bank purchasing-power GDP and population; Maddison Project Database 2023 before 1990; ScenarioMIP CMIP7 markers',
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
        yLabel: 'dollars per person, log scale',
        yDecimals: 0,
        yScale: 'log',
        series: [
          {
            id: 'record',
            label: 'Record',
            points: points(WORLD.years, WORLD.values),
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
      kind: 'plot',
      caption: 'The same question inside the three World Bank income groups: the average '
        + 'today, and the 2100 average at the growth rate you set.',
      dataSource: 'World Bank purchasing-power GDP and population, by income group',
      key: GROUPS.map((entry, index) => ({
        label: entry.label,
        color: ['var(--scenario-low)', 'var(--scenario-medium)', 'var(--scenario-high)'][index]
          ?? 'var(--dim)',
      })),
      spec(outcome): PlotSpec {
        const values = outcome.values ?? {};
        const colors = ['var(--scenario-low)', 'var(--scenario-medium)', 'var(--scenario-high)'];
        return {
          xMin: 1990,
          xMax: END_YEAR,
          xTicks: [1990, 2010, 2025, 2050, 2075, END_YEAR],
          yLabel: 'dollars per person, log scale',
          yDecimals: 0,
          yScale: 'log',
          series: GROUPS.map((entry, index) => {
            const growth = values[entry.id] ?? entry.growth;
            const forward: Point[] = [];
            for (let year = BASE_YEAR; year <= END_YEAR; year += 5) {
              forward.push({
                year,
                value: compound(entry.gdpPerPerson, growth, year - BASE_YEAR),
              });
            }
            return {
              id: entry.id,
              label: entry.label,
              points: [...points(entry.years, entry.values), ...forward],
              color: colors[index] ?? 'var(--dim)',
              width: 2.2,
              labelAtEnd: true,
            };
          }),
          divider: { year: C.lastYear, label: 'assumed' },
        };
      },
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Convergence between the income groups, and its limits.',
    paragraphs: [
      `Convergence explains most of the world average's movement. Middle-income countries, `
      + `${MIDDLE_INCOME.populationShare.toFixed(0)}% of the world's people, grew `
      + `${rate(MIDDLE_INCOME.growth)} a year since 1990 against `
      + `${rate(HIGH_INCOME.growth)} in high-income countries. The ratio between the two `
      + `averages is ${times(C.ratios.highOverMiddle)} today.`,
      `Low-income countries did not converge. They grew ${rate(LOW_INCOME.growth)} a year `
      + `since 1990 and ${rate(LOW_INCOME.growthRecentDecade)} over the past decade, while `
      + `holding ${LOW_INCOME.populationShare.toFixed(1)}% of the world's people and `
      + `${LOW_INCOME.gdpShare.toFixed(1)}% of its output. The same countries account for `
      + 'most of the remaining population growth.',
      'Energy demand follows income through the services people buy. A household at middle '
      + 'income buys a refrigerator, then air conditioning, then a vehicle, and each purchase '
      + 'raises that household’s energy use for decades. The models represent this as a '
      + 'demand relationship that saturates: the first thousand dollars of extra income adds '
      + 'more energy demand than the twentieth thousand.',
      `Extrapolate those two rates and they cross. Middle-income countries at `
      + `${rate(MIDDLE_INCOME.growth)} and high-income countries at `
      + `${rate(HIGH_INCOME.growth)} converge completely around `
      + `${Math.round(BASE_YEAR + Math.log(HIGH_INCOME.gdpPerPerson / MIDDLE_INCOME.gdpPerPerson)
        / Math.log((1 + MIDDLE_INCOME.growth / 100) / (1 + HIGH_INCOME.growth / 100)))}, `
      + 'converge, and the middle-income average passes the high-income one after that date. '
      + 'The second figure shows the crossing. It is the arithmetic of a steady rate held for '
      + '75 years rather than a forecast.',
      'Saturation ties income to energy intensity. A scenario can pair fast income growth '
      + 'with fast intensity decline and reach the same energy demand as one pairing slow '
      + 'growth with slow decline. The four factors multiply, so the product is what fixes '
      + 'the emissions.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Seven scenarios, six of them near the recorded rate.',
    paragraphs: [
      `Six of the seven markers assume between ${rate(1.24)} and ${rate(1.97)}, straddling the `
      + `${rate(OBSERVED)} recorded since 1990. HIGH-to-LOW assumes `
      + `${rate(2.63)}, the fastest of the seven.`,
      `CMIP7 HIGH sits at ${rate(HIGH_RATE)}, a third of the observed rate, with the largest `
      + 'population of the seven. Its emissions are the highest of the seven and its income '
      + 'per person the lowest. A high-emissions scenario built here can take that form or '
      + 'the opposite one, high income with slow decarbonisation, and the two set different '
      + 'values on the other five sliders.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Three ways in: from the rate, from the level, or from the groups.',
    paragraphs: [
      'Set a rate and the builder gives the 2100 level, set a 2100 level and it gives the '
      + 'rate, or set growth for each income group and it weights them by population.',
      `The third mode holds each group's share of world population where it stands today, so `
      + 'the answer isolates the effect of growth rates. The UN projects the low-income share '
      + 'rising through the century, so this mode gives the slowest-growing group less '
      + 'weight than the UN projects and puts the world average slightly above it.',
    ],
    action: 'Use this rate in my scenario',
    modes: [
      {
        id: 'rate',
        label: 'Set a rate',
        note: 'The 2100 level follows from the rate.',
        parts: [RATE_PART],
        combine(values) {
          const value = values['rate'] ?? OBSERVED;
          const level = compound(BASE.gdpPerPersonUsd, value, SPAN);
          return {
            value,
            headline: `${rate(value)}, reaching ${dollars(level)} per person in 2100`,
            detail: [
              `${dollars(BASE.gdpPerPersonUsd)} today becomes ${dollars(level)}, `
              + `${times(level / BASE.gdpPerPersonUsd)} today's average`,
              `${times(Math.abs(value / OBSERVED))} the rate observed since 1990`,
              `Today's high-income average of ${dollars(HIGH_INCOME.gdpPerPerson)} arrives `
              + (level >= HIGH_INCOME.gdpPerPerson
                ? `for the world in ${Math.round(BASE_YEAR
                    + Math.log(HIGH_INCOME.gdpPerPerson / BASE.gdpPerPersonUsd)
                    / Math.log(1 + value / 100))}`
                : 'for the world after 2100 at this rate'),
            ],
          };
        },
      },
      {
        id: 'level',
        label: 'Set a 2100 level',
        note: 'The rate follows from the 2100 level.',
        parts: [LEVEL_PART],
        combine(values) {
          const level = values['level'] ?? OBSERVED_2100;
          const value = cagr(BASE.gdpPerPersonUsd, level, SPAN);
          return {
            value,
            headline: `${rate(value)}, the rate that reaches ${dollars(level)} per person`,
            detail: [
              `${times(level / BASE.gdpPerPersonUsd)} today's world average of `
              + `${dollars(BASE.gdpPerPersonUsd)}`,
              `${times(level / HIGH_INCOME.gdpPerPerson)} today's high-income average of `
              + `${dollars(HIGH_INCOME.gdpPerPerson)}`,
              `${times(Math.abs(value / OBSERVED))} the rate observed since 1990`,
            ],
          };
        },
      },
      {
        id: 'groups',
        label: 'By income group',
        note: 'Growth for each group, weighted by population.',
        parts: GROUP_PARTS,
        combine(values) {
          const level = weightedWorld(values);
          const value = cagr(BASE.gdpPerPersonUsd, level, SPAN);
          const low = compound(
            LOW_INCOME.gdpPerPerson, values['low'] ?? LOW_INCOME.growth, SPAN,
          );
          const high = compound(
            HIGH_INCOME.gdpPerPerson, values['high'] ?? HIGH_INCOME.growth, SPAN,
          );
          return {
            value,
            headline: `${rate(value)}, a world average of ${dollars(level)} per person`,
            detail: [
              `Weighted by today's population shares: `
              + GROUPS.map((entry) => `${entry.label.toLowerCase()} `
                + `${entry.populationShare.toFixed(0)}%`).join(', '),
              `Low income reaches ${dollars(low)}, high income ${dollars(high)}, a ratio of `
              + `${times(high / low)} against ${times(C.ratios.highOverLow)} today`,
              `${times(Math.abs(value / OBSERVED))} the world rate observed since 1990`,
            ],
          };
        },
      },
    ],
  },

  sources: INCOME_SOURCES,
};


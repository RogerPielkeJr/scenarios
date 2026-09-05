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
import { displayName } from '../state.js';
import type { PlotSeries, PlotSpec, Point } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';

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
  note: `The world managed ${rate(OBSERVED)} from 1990 to ${C.lastYear}, `
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
  input: 'income',
  title: 'Income per person',
  standfirst: 'One slider sets how fast the average person gets richer. Seventy-five years '
    + 'of compounding turns a small difference in that rate into a large difference in the '
    + 'world of 2100, and every scenario’s energy demand rests on it.',

  definition: {
    quantity: 'World GDP per person, at purchasing power parity',
    units: 'constant 2021 international dollars; the slider sets its growth rate in %/yr',
    place: 'The second of the four factors that multiply',
    today: `${dollars(BASE.gdpPerPersonUsd)} (${C.lastYear})`,
    paragraphs: [
      'Income per person carries two jobs in the identity. It measures how much output each '
      + 'person commands, and it sets the demand for the energy services that output '
      + 'requires: heating, cooling, travel, materials and machines.',
      `Compounding does the work. The world grew ${rate(OBSERVED)} a year from 1990 to `
      + `${C.lastYear}, which sounds modest and turns ${dollars(BASE.gdpPerPersonUsd)} into `
      + `${dollars(OBSERVED_2100)} across 75 years. A rate one percentage point lower, `
      + `${rate(OBSERVED - 1)}, reaches ${dollars(compound(BASE.gdpPerPersonUsd, OBSERVED - 1, SPAN))} `
      + `instead, ${times(OBSERVED_2100 / compound(BASE.gdpPerPersonUsd, OBSERVED - 1, SPAN))} `
      + 'less. The slider spans a wider range than that.',
      `The world average hides most of what matters. High-income countries average `
      + `${dollars(HIGH_INCOME.gdpPerPerson)} today and low-income countries `
      + `${dollars(LOW_INCOME.gdpPerPerson)}, a ratio of ${times(C.ratios.highOverLow)}.`,
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The record, then each scenario’s rate compounding forward.',
    paragraphs: [
      `World output per person rose from ${dollars(C.levels.first)} in ${C.firstYear} to `
      + `${dollars(C.levels.last)} in ${C.lastYear}, at ${rate(C.rates.wholeRecord)} across `
      + `the whole record. The past decade ran slightly faster, at ${rate(C.rates.recentDecade)}.`,
      `The seven markers spread from ${rate(HIGH_RATE)} to `
      + `${rate(Math.max(...MARKERS.map((m) => markerValueFor(m, 'income') ?? 0)))}. `
      + `CMIP7 HIGH takes the low end, reaching ${dollars(HIGH_2100)} per person in 2100 `
      + `against ${dollars(OBSERVED_2100)} if the observed rate simply continued. The scenario `
      + 'that emits the most describes a world where people end the century '
      + `${times(OBSERVED_2100 / HIGH_2100)} poorer than continuing the recorded rate implies, `
      + `and where ${MARKER_BY_ID['H']?.kaya.populationBn.toFixed(2) ?? ''} billion of them `
      + 'share it.',
      `Before 1990 the level rests on Maddison Project growth rates rather than the World `
      + 'Bank, as it does on the energy per dollar page; every figure from 1990 onward comes '
      + 'from the World Bank alone.',
    ],
    caption: `World GDP per person, ${C.firstYear} to ${C.lastYear}, then your rate and the `
      + 'seven CMIP7 markers compounding forward from 2025. Constant 2021 international '
      + 'dollars at purchasing power parity.',
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
      kind: 'plot',
      caption: 'The same question inside the three World Bank income groups: what each '
        + 'averages now, and where the growth you set for it lands by 2100.',
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
    note: 'Convergence, and what it has and has not done.',
    paragraphs: [
      `Convergence explains most of the world average's movement. Middle-income countries, `
      + `${MIDDLE_INCOME.populationShare.toFixed(0)}% of the world's people, grew `
      + `${rate(MIDDLE_INCOME.growth)} a year since 1990 against `
      + `${rate(HIGH_INCOME.growth)} in high-income countries. That gap closed part of the `
      + `distance between them: the ratio between the two averages stands at `
      + `${times(C.ratios.highOverMiddle)} today.`,
      `Low-income countries did not converge. They grew ${rate(LOW_INCOME.growth)} a year `
      + `since 1990 and ${rate(LOW_INCOME.growthRecentDecade)} over the past decade, while `
      + `holding ${LOW_INCOME.populationShare.toFixed(1)}% of the world's people and `
      + `${LOW_INCOME.gdpShare.toFixed(1)}% of its output. Whether that changes is the single `
      + 'largest question inside any 2100 income figure, and it is also where most of the '
      + 'remaining population growth happens.',
      'Energy demand follows income through the services people buy with it. A household that '
      + 'reaches middle income buys a refrigerator, then air conditioning, then a vehicle, '
      + 'and each purchase raises the energy behind that household for decades. The models '
      + 'represent this as a demand relationship that saturates: the first thousand dollars '
      + 'of extra income adds more energy demand than the twentieth thousand.',
      `Extrapolating those rates has consequences worth seeing. Middle-income countries `
      + `growing ${rate(MIDDLE_INCOME.growth)} and high-income countries `
      + `${rate(HIGH_INCOME.growth)} converge completely around `
      + `${Math.round(BASE_YEAR + Math.log(HIGH_INCOME.gdpPerPerson / MIDDLE_INCOME.gdpPerPerson)
        / Math.log((1 + MIDDLE_INCOME.growth / 100) / (1 + HIGH_INCOME.growth / 100)))}, `
      + 'after which the middle-income average passes the high-income one. The second figure '
      + 'above shows it. Treat that as a demonstration of what steady extrapolation does '
      + 'across 75 years rather than as a forecast.',
      'That saturation is why income and energy intensity have to be read together. A '
      + 'scenario can pair fast income growth with fast intensity decline and land on modest '
      + 'energy demand, or pair slow growth with slow decline and land in the same place. The '
      + 'four factors multiply, so only the product is determined.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Seven scenarios, none above the recorded rate by much.',
    paragraphs: [
      `Six of the seven markers assume between ${rate(1.24)} and ${rate(1.97)}, straddling the `
      + `${rate(OBSERVED)} the world has managed since 1990. HIGH-to-LOW assumes `
      + `${rate(2.63)}, the fastest of the seven.`,
      `CMIP7 HIGH stands apart at ${rate(HIGH_RATE)}, a third of the observed rate. Combined `
      + 'with the largest population of the seven, it describes the century’s highest '
      + 'emissions arising in a world whose people stay comparatively poor. A reader building '
      + 'their own high-emissions scenario has to decide whether they mean that world, or a '
      + 'rich one that fails to decarbonise, and the two make very different demands on the '
      + 'other five sliders.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Three ways in: from the rate, from the level, or from the groups.',
    paragraphs: [
      'Set the rate and read what it reaches, set the 2100 level and read the rate it '
      + 'requires, or set growth for each income group and let the builder weight them by '
      + 'population.',
      `The third mode holds each group's share of world population where it stands today, so `
      + 'the answer isolates the effect of growth rates. The UN projects the low-income share '
      + 'rising through the century, which means this mode understates the weight of the '
      + 'slowest-growing group and so overstates the world average a little.',
    ],
    action: 'Use this rate in my scenario',
    modes: [
      {
        id: 'rate',
        label: 'Set a rate',
        note: 'Read off what it reaches by 2100.',
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
        note: 'Read off the rate it takes to get there.',
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
        note: 'Growth for each group, weighted by the people in it.',
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

  sources: [
    {
      title: 'GDP, PPP (constant 2021 international $), indicator NY.GDP.MKTP.PP.KD',
      publisher: 'World Bank, International Comparison Program',
      vintage: 'accessed 2026',
      url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD',
      used: 'World output and the high-, middle- and low-income aggregates from 1990, '
        + 'divided by population for the levels on this page.',
    },
    {
      title: 'Population, total, indicator SP.POP.TOTL',
      publisher: 'World Bank, from the UN World Population Prospects',
      vintage: 'accessed 2026',
      url: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
      used: 'World and income-group population, the denominator of every figure here and '
        + 'the weights in the third builder mode.',
    },
    {
      title: 'World Bank country and lending groups',
      publisher: 'World Bank',
      vintage: '2026 classification',
      url: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/906519',
      used: 'Which economies count as high, middle and low income. The current '
        + 'classification is applied across the whole record, so no country moves group '
        + 'mid-series.',
    },
    {
      title: 'Maddison-style estimates of the evolution of the world economy: A new 2023 update',
      publisher: 'Bolt and van Zanden, Journal of Economic Surveys 38(5)',
      vintage: '2024, database release 2023',
      url: 'https://doi.org/10.1111/joes.12618',
      used: 'World output before 1990, used only for its growth rates.',
    },
    {
      title: 'The Shared Socioeconomic Pathways and their energy, land use, and greenhouse '
        + 'gas emissions implications: An overview',
      publisher: 'Riahi and colleagues, Global Environmental Change 42',
      vintage: '2017',
      url: 'https://doi.org/10.1016/j.gloenvcha.2016.05.009',
      used: 'How the marker scenarios set income growth and tie it to energy demand.',
    },
    {
      title: 'The human core of the shared socioeconomic pathways: Population scenarios by '
        + 'age, sex and level of education for all countries to 2100',
      publisher: 'KC and Lutz, Global Environmental Change 42',
      vintage: '2017',
      url: 'https://doi.org/10.1016/j.gloenvcha.2014.06.004',
      used: 'The education and demographic assumptions the SSP income trajectories rest on.',
    },
    {
      title: 'Emissions Trends and Drivers (Chapter 2, IPCC AR6 Working Group III)',
      publisher: 'Intergovernmental Panel on Climate Change',
      vintage: '2022',
      url: 'https://doi.org/10.1017/9781009157926.004',
      used: 'The contribution of income growth to recorded emissions growth, against the '
        + 'contributions of the other three factors.',
    },
  ],
};

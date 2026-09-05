/**
 * Learn More: population.
 *
 * Every number on the page comes from src/data/learn_population.json, which
 * scripts/build_wpp.py writes from the UN World Population Prospects 2024
 * revision. Nothing is typed in here.
 */
import data from '../data/learn_population.json';
import { BASE_YEAR, END_YEAR } from '../model/config.js';
import { MARKERS, markerValueFor } from '../model/markers.js';
import { ANCHORS_2100, SSP_CURVES, SSP_YEARS, populationAt } from '../model/population.js';
import { displayName } from '../state.js';
import type { PlotPoint, PlotSeries, PlotSpec, Point } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';

const C = data.constants;
const PARTS = data.parts;
const FERTILITY = C.fertility;

const bn = (value: number) => `${value.toFixed(2)} billion`;
const one = (value: number) => value.toFixed(1);

/** Region ids, so a lookup that misses fails loudly rather than reading zero. */
function region(id: string) {
  const part = PARTS.find((candidate) => candidate.id === id);
  if (part === undefined) throw new Error(`no region "${id}" in learn_population.json`);
  return part;
}

/** One named series out of the data file, so a rename fails loudly. */
function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_population.json`);
  return found;
}

const HISTORY = series('un-history');
const MEDIUM = series('un-medium');
const FIRST_YEAR = HISTORY.years[0] ?? 1950;
const FIRST_VALUE = HISTORY.values[0] ?? 0;

const SSA = region('sub-saharan-africa');
const ASIA = region('asia');
const EUROPE = region('europe');

const WORLD_GROWTH = C.world2100.medium - C.today.worldBn;
const SSA_GROWTH = SSA.default - SSA.today;

function points(years: readonly number[], values: readonly number[]): Point[] {
  return years.map((year, index) => ({ year, value: values[index] ?? 0 }));
}

/**
 * One dot per marker at 2100, drawn without labels.
 *
 * Every marker rests on an SSP population, so four of them share a single
 * point; labelling each would print four names on one pixel and crowd the
 * SSP labels out. The table below the chart carries the exact values.
 */
function markerPoints(): PlotPoint[] {
  const dots: PlotPoint[] = [];
  for (const marker of MARKERS) {
    const value = markerValueFor(marker, 'population');
    if (value === null) continue;
    dots.push({ id: marker.id, label: '', year: END_YEAR, value, color: marker.color });
  }
  return dots;
}

const SSP_COLORS: Record<string, string> = {
  SSP1: 'var(--scenario-very-low)',
  SSP2: 'var(--scenario-medium)',
  SSP3: 'var(--scenario-high)',
};

function sspSeries(): PlotSeries[] {
  return (Object.keys(SSP_CURVES) as Array<keyof typeof SSP_CURVES>).map((id) => ({
    id,
    label: id,
    points: points(SSP_YEARS, SSP_CURVES[id]),
    color: SSP_COLORS[id] ?? 'var(--dim)',
    width: 1.6,
    dash: '5 4',
    opacity: 0.9,
    labelAtEnd: true,
  }));
}

/** The reader's own curve, drawn with the model the top page uses. */
function readerSeries(target: number, label: string): PlotSeries {
  const years: number[] = [];
  for (let year = BASE_YEAR; year <= END_YEAR; year += 1) years.push(year);
  return {
    id: 'reader',
    label,
    points: years.map((year) => ({ year, value: populationAt(year, target) })),
    color: 'var(--you)',
    width: 3.4,
    labelAtEnd: true,
  };
}

function total(values: Readonly<Record<string, number>>): number {
  return PARTS.reduce((sum, part) => sum + (values[part.id] ?? part.default), 0);
}

const BUILDER_PARTS: BuilderPart[] = PARTS.map((part) => ({
  id: part.id,
  label: part.label,
  min: part.min,
  max: part.max,
  step: part.step,
  default: part.default,
  decimals: 2,
  unitSuffix: ' bn',
  note: `${bn(part.today)} in ${C.today.year}. The UN's medium variant reaches `
    + `${bn(part.default)} in 2100.`,
  marks: part.marks.map((mark) => ({
    value: mark.value,
    label: mark.label,
    kind: mark.kind as 'low' | 'medium' | 'high',
  })),
}));

export const POPULATION_PAGE: LearnPageSpec = {
  slug: 'population',
  input: 'population',
  title: 'Population',
  standfirst: 'One slider fixes how many people share the world in 2100. This page shows '
    + 'what demographers already know about that number, how far it can move, and how to '
    + 'assemble it region by region.',

  definition: {
    quantity: 'World population in 2100',
    units: 'billions of people',
    place: 'The first of the four factors that multiply',
    today: `${bn(C.today.worldBn)} in ${C.today.year}`,
    paragraphs: [
      'Population multiplies everything downstream of it. Each person in a scenario earns '
      + 'an income, that income calls for energy, and that energy carries carbon, so the '
      + 'number of people scales the whole chain.',
      `The UN's low and high variants differ by a factor of ${(C.world2100.high / C.world2100.low).toFixed(1)} `
      + `by 2100, ${bn(C.world2100.low)} against ${bn(C.world2100.high)}. Holding the other five `
      + 'assumptions still, emissions move by that same factor.',
      `Demographers narrow the range further than that. The UN's medium projection reaches `
      + `${bn(C.world2100.medium)} in 2100 with a 95% prediction interval of ${bn(C.world2100.lo95)} `
      + `to ${bn(C.world2100.hi95)}, a spread of ${bn(C.world2100.hi95 - C.world2100.lo95)} `
      + 'around a number 75 years away.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The IHME projection joins this chart in a later revision.',
    paragraphs: [
      `World population grew from ${bn(FIRST_VALUE)} in ${FIRST_YEAR} to ${bn(C.today.worldBn)} in `
      + `${C.today.year}. The UN's medium projection peaks at ${bn(C.today.peakBn)} in `
      + `${C.today.peakYear} and declines from there, reaching ${bn(C.world2100.medium)} in 2100.`,
      `The three SSP trajectories the climate scenarios run on spread wider than the UN's `
      + `own interval: ${bn(ANCHORS_2100.SSP1)} in SSP1 against ${bn(ANCHORS_2100.SSP3)} in `
      + 'SSP3. Those three describe '
      + 'different development stories, so their spread measures disagreement about how the '
      + 'century unfolds rather than statistical uncertainty about one projection.',
    ],
    caption: `World population, ${FIRST_YEAR} to ${END_YEAR}: UN estimates and the medium `
      + 'projection with its '
      + '95% prediction interval, the three SSP trajectories the CMIP7 markers use, the seven '
      + 'markers as dots at 2100, and your own value. Each marker sits on an SSP trajectory, '
      + 'so four of the seven share one point.',
    key: [
      { label: `Estimates to ${HISTORY.years[HISTORY.years.length - 1] ?? 2023}`,
        color: 'var(--ink)' },
      { label: 'UN medium and its 95% interval', color: 'var(--navy)' },
      { label: 'SSP1', color: 'var(--scenario-very-low)', dash: true },
      { label: 'SSP2', color: 'var(--scenario-medium)', dash: true },
      { label: 'SSP3', color: 'var(--scenario-high)', dash: true },
      { label: 'Your value', color: 'var(--you)' },
      { label: 'The seven CMIP7 markers at 2100', color: 'var(--dim)', dot: true },
    ],
    spec(outcome, scenario): PlotSpec {
      const band = data.bands[0];
      if (band === undefined) throw new Error('learn_population.json has no band');
      return {
        xMin: FIRST_YEAR,
        xMax: END_YEAR,
        xTicks: [FIRST_YEAR, 1975, 2000, 2025, 2050, 2075, END_YEAR],
        yLabel: 'billions of people',
        yDecimals: 0,
        bands: [{
          id: band.id,
          label: band.label,
          years: band.years,
          lo: band.lo,
          hi: band.hi,
          color: 'var(--navy)',
          opacity: 0.14,
        }],
        series: [
          {
            id: 'history',
            label: 'Estimates',
            points: points(HISTORY.years, HISTORY.values),
            color: 'var(--ink)',
            width: 2.4,
          },
          {
            id: 'un-medium',
            label: 'UN medium',
            points: points(MEDIUM.years, MEDIUM.values),
            color: 'var(--navy)',
            width: 2.2,
            labelAtEnd: true,
          },
          ...sspSeries(),
          readerSeries(outcome.value, scenario.name === '' ? 'Your value'
            : displayName(scenario.name)),
        ],
        points: markerPoints(),
        divider: { year: MEDIUM.years[0] ?? 2023, label: 'projection' },
      };
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Births, the age structure already alive, and where both sit.',
    paragraphs: [
      `Fertility carries the projection. The world averaged ${FERTILITY.world['1950']} births `
      + `per woman in 1950, ${FERTILITY.world['1990']} in 1990 and ${FERTILITY.world['2024']} `
      + `in 2024, and the UN's medium projection takes it to ${FERTILITY.world['2100']} by 2100. `
      + `Holding the 2024 rate instead produces ${bn(C.heldStill2100.constantFertility)} people `
      + 'in 2100, so births separate a crowded world from a stable one far more sharply than '
      + 'deaths or migration do.',
      `The age structure already alive sets a floor. The UN's momentum variant drops fertility `
      + `to replacement level in 2024, freezes mortality and stops migration, and world `
      + `population still reaches ${bn(C.heldStill2100.momentum)} in 2100, because a large `
      + 'generation of children has yet to reach the age of having children of its own.',
      `Sub-Saharan Africa accounts for the growth. The region holds ${bn(SSA.today)} people in `
      + `${C.today.year} and reaches ${bn(SSA.default)} in the medium projection, an increase of `
      + `${bn(SSA_GROWTH)} against a world increase of ${bn(WORLD_GROWTH)}. Asia shrinks by `
      + `${bn(ASIA.today - ASIA.default)} over the same span and Europe by `
      + `${bn(EUROPE.today - EUROPE.default)}. Fertility explains the split: `
      + `${FERTILITY.byRegion2024['sub-saharan-africa']} births per woman in sub-Saharan Africa `
      + `in 2024, against ${FERTILITY.byRegion2024['asia']} in Asia and `
      + `${FERTILITY.byRegion2024['europe']} in Europe.`,
      'The projections disagree about how fast fertility falls in the countries where it '
      + 'remains highest. That single question moves the 2100 world total by billions, and it '
      + 'turns on schooling, contraceptive access, child mortality and the age at which women '
      + 'marry, each of which national governments influence directly.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Seven scenarios, three population trajectories.',
    paragraphs: [
      `The markers borrow their populations from the SSPs. HIGH takes SSP3 at ${bn(12.977)}, `
      + `which exceeds the top of the UN's 95% interval of ${bn(C.world2100.hi95)}. Four markers `
      + `take SSP2 at ${bn(9.887)}, close to the UN medium. HIGH-to-LOW and VERY LOW take SSP1 at `
      + `about ${bn(8.092)}, below the bottom of that interval.`,
      `A scenario carrying ${bn(12.977)} people assumes the fertility decline of the past 35 `
      + 'years stalls across Asia and Africa alike. The UN reaches that figure only on its high '
      + 'variant, which adds half a child per woman to the medium at every date and every place.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Seven regions that add up to the UN’s own world figures.',
    paragraphs: [
      'Set each region and the builder adds them up. Every control opens at the UN medium '
      + 'variant and runs from the UN low variant to the UN high variant, which the UN builds '
      + 'by subtracting and adding half a child per woman at every date.',
      `The seven regions reproduce the UN's world figures exactly at each of those variants: `
      + `${bn(C.world2100.low)} at low, ${bn(C.world2100.medium)} at medium, `
      + `${bn(C.world2100.high)} at high. Every region at its low variant still gives `
      + `${bn(C.world2100.low)}, so the builder stops above the slider's floor of 6 billion.`,
      `The 95% prediction interval works differently and does not add up this way. Summing the `
      + `regional lower bounds gives ${bn(C.world2100.regionalLo95Sum)} against the UN's world `
      + `figure of ${bn(C.world2100.lo95)}, because the regions do not all land at the bottom of `
      + 'their own ranges in the same century.',
    ],
    action: 'Use this population in my scenario',
    modes: [{
      id: 'by-region',
      label: 'Region by region',
      parts: BUILDER_PARTS,
      combine(values) {
        const world = total(values);
        const ssa = values[SSA.id] ?? SSA.default;
        const change = world - C.today.worldBn;
        const versusMedium = world - C.world2100.medium;
        return {
          value: world,
          headline: `${bn(world)} people in 2100`,
          detail: [
            `${bn(Math.abs(change))} ${change >= 0 ? 'more' : 'fewer'} than the `
            + `${bn(C.today.worldBn)} alive in ${C.today.year}`,
            Math.abs(versusMedium) < 0.005
              ? `level with the UN medium of ${bn(C.world2100.medium)}`
              : `${versusMedium > 0 ? '+' : '−'}${Math.abs(versusMedium).toFixed(2)} billion `
                + `against the UN medium of ${bn(C.world2100.medium)}`,
            `Sub-Saharan Africa: ${bn(ssa)}, ${one((ssa / world) * 100)}% of the world total`,
          ],
        };
      },
    }],
  },

  sources: [
    {
      title: 'World Population Prospects 2024, Total Population by Sex (standard projections)',
      publisher: 'UN Department of Economic and Social Affairs, Population Division',
      vintage: '2024 revision, file dated 13 December 2024',
      url: 'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)'
        + '/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz',
      used: 'World estimates 1950 to 2023, the medium projection to 2100, the low, high, '
        + 'momentum and constant-fertility variants, the 95% prediction interval, and the '
        + 'seven regional totals the builder adds up.',
    },
    {
      title: 'World Population Prospects 2024, Demographic Indicators (medium variant)',
      publisher: 'UN Department of Economic and Social Affairs, Population Division',
      vintage: '2024 revision',
      url: 'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)'
        + '/CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz',
      used: 'Total fertility for the world in 1950, 1990, 2024 and 2100, and for each of the '
        + 'seven regions in 2024.',
    },
    {
      title: 'World Population Prospects 2024: Methodology of the United Nations population '
        + 'estimates and projections',
      publisher: 'UN DESA/POP/2024/DC/NO.10',
      vintage: 'July 2024',
      url: 'https://population.un.org/wpp/assets/Files/WPP2024_Methodology.pdf',
      used: 'How the UN builds the low, high and momentum variants, and how it derives the '
        + 'probabilistic intervals.',
    },
    {
      title: 'World Population Prospects 2024: Summary of Results',
      publisher: 'UN Department of Economic and Social Affairs, Population Division',
      vintage: '2024',
      url: 'https://population.un.org/wpp/assets/Files/WPP2024_Summary-of-Results.pdf',
      used: 'The projected peak and the regional pattern behind it.',
    },
    {
      title: 'Bayesian probabilistic population projections for all countries',
      publisher: 'Raftery, Li, Ševčíková, Gerland and Heilig, PNAS 109(35)',
      vintage: '2012',
      url: 'https://doi.org/10.1073/pnas.1211452109',
      used: 'The method that produces the 95% prediction interval drawn on the chart.',
    },
    {
      title: 'World population stabilization unlikely this century',
      publisher: 'Gerland and colleagues, Science 346(6206)',
      vintage: '2014',
      url: 'https://doi.org/10.1126/science.1257469',
      used: 'The probabilistic result that reset expectations of an early plateau.',
    },
    {
      title: 'The human core of the shared socioeconomic pathways: Population scenarios by age, '
        + 'sex and level of education for all countries to 2100',
      publisher: 'KC and Lutz, Global Environmental Change 42',
      vintage: '2017',
      url: 'https://doi.org/10.1016/j.gloenvcha.2014.06.004',
      used: 'The SSP population trajectories, including SSP1, SSP2 and SSP3 drawn here.',
    },
    {
      title: 'The Shared Socioeconomic Pathways and their energy, land use, and greenhouse gas '
        + 'emissions implications: An overview',
      publisher: 'Riahi and colleagues, Global Environmental Change 42',
      vintage: '2017',
      url: 'https://doi.org/10.1016/j.gloenvcha.2016.05.009',
      used: 'How the CMIP7 markers inherit their populations from the SSP framework.',
    },
  ],
};

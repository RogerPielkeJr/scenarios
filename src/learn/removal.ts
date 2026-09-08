/**
 * Learn More: engineered CO₂ removal.
 *
 * Every number comes from src/data/learn_removal.json, which
 * scripts/build_removal.py parses out of the State of Carbon Dioxide Removal
 * executive summary, and from each marker's own 2100 removal level as fitted in
 * scripts/build_carried_data.py.
 */
import data from '../data/learn_removal.json';
import { BASE_YEAR, END_YEAR } from '../model/config.js';
import { readerLabel } from '../state.js';
import type { PlotSpec } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';
import { REMOVAL_SOURCES } from './sources/removal.js';

const TODAY = data.today;
const AHEAD = data.ahead;

const gt = (value: number) => `${value.toFixed(1)} GtCO₂ a year`;
const mt = (value: number) => `${Math.round(value * 1000)} MtCO₂ a year`;

/** Removal in a given year, on the square ramp the model uses. */
function rampAt(year: number, target2100: number): number {
  const f = (year - BASE_YEAR) / (END_YEAR - BASE_YEAR);
  return target2100 * f * f;
}

/**
 * The four CMIP7 markers as ticks, for either control.
 *
 * Each marker's figure is its whole 2100 removal, because that is what the fit
 * in scripts/build_carried_data.py recovers from a published CO2 path: the
 * markers do not publish a split between forests and machinery. So the same
 * tick belongs on both controls, and both notes say it is a total rather than
 * that family's share.
 */
const MARKER_MARKS = data.markers
  .filter((m) => m.removals > 0)
  .map((m) => ({
    value: m.removals,
    label: `${m.id} ${m.removals.toFixed(1)}`,
    kind: 'high' as const,
    color: m.color,
  }));

const PARTS: BuilderPart[] = [
  {
    id: 'conventional',
    label: 'Forests and soils in 2100',
    min: 0,
    max: 12,
    step: 0.5,
    default: 2,
    decimals: 1,
    unitSuffix: ' GtCO₂',
    note: `Planting, restoration, soil carbon and durable wood products. These already take `
      + `back ${gt(TODAY.conventionalGt)}, ${TODAY.shareOfGrossPercent}% of gross CO₂ `
      + 'emissions, and they compete for the same land the land-use slider covers. The '
      + 'scenario ticks give each marker’s whole removal, not the part of it that comes '
      + 'from land.',
    marks: [
      { value: TODAY.conventionalGt, label: `today ${TODAY.conventionalGt.toFixed(1)}`,
        kind: 'observed' },
      ...MARKER_MARKS,
    ],
  },
  {
    id: 'novel',
    label: 'Capture and storage in 2100',
    min: 0,
    max: 12,
    step: 0.5,
    default: 0,
    decimals: 1,
    unitSuffix: ' GtCO₂',
    note: `Bioenergy with carbon capture, direct air capture, biochar and enhanced `
      + `weathering. These run at ${mt(TODAY.novelGt)} today, `
      + `${TODAY.novelSharePercent}% of all removal, growing `
      + `${TODAY.novelGrowthPercent}% a year. The scenario ticks give each marker’s whole `
      + 'removal, not the part of it that comes from machinery.',
    marks: [
      { value: 0, label: 'today 0.0', kind: 'observed' },
      ...MARKER_MARKS,
    ],
  },
];

export const REMOVAL_PAGE: LearnPageSpec = {
  slug: 'removal',
  accent: '#1f6f3f',
  input: 'removals',
  title: 'Engineered CO₂ removal',
  standfirst: 'Four factors multiplied together stay positive, so nothing in the Kaya '
    + 'identity reaches a negative number however fast the fuel mix changes. This slider is '
    + 'what carries a path below zero, and two of the seven CMIP7 markers end the century '
    + 'there.',

  definition: {
    quantity: 'Carbon dioxide deliberately removed from the atmosphere and stored, in 2100',
    units: 'GtCO₂ a year',
    place: 'Added to the four Kaya factors and to land use, as a term of its own',
    today: `${gt(TODAY.totalGt)} across all methods, of which ${mt(TODAY.novelGt)} from `
      + 'capture and storage',
    paragraphs: [
      'The identity at the heart of this tool multiplies four positive quantities: people, '
      + 'income each, energy per dollar, carbon per unit of energy. Drive any of them toward '
      + 'zero and the product approaches zero without ever crossing it. A world that emits '
      + 'less than nothing cannot be described that way, and two CMIP7 markers describe '
      + 'exactly that world.',
      'So removal enters as its own term, added rather than multiplied. It is the only '
      + 'control here that can take the whole path below the axis, and the deep-mitigation '
      + 'scenarios need it: they overshoot on the way and pay the overshoot back.',
      `It ramps as the square of elapsed time rather than in a straight line: close to nothing `
      + `before the 2040s, then accelerating. That matches how the scenarios deploy it, and it `
      + `is also what earns this control its place. A straight ramp to a 2100 level would be `
      + `arithmetically identical to moving the land use slider by the same amount, and would `
      + 'reach no path the six sliders could not.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'Almost all of it is forests.',
    paragraphs: [
      `The world removes ${gt(TODAY.totalGt)} today, about ${TODAY.shareOfGrossPercent}% of `
      + `gross CO₂ emissions. Nearly all of it is conventional: planting, restoration and soil `
      + `carbon, the things countries already report under land use. Capture and storage `
      + `accounts for ${mt(TODAY.novelGt)}, ${TODAY.novelSharePercent}% of the total.`,
      `That small number is growing ${TODAY.novelGrowthPercent}% a year, and everything built `
      + `or under construction would reach ${mt(AHEAD.pipeline2030Gt)} by 2030. Country `
      + `pledges add to ${gt(AHEAD.pledges2030Gt)} of removal in 2030, still almost entirely `
      + 'conventional.',
      `Set that against what the scenarios ask. Assessed pathways scale capture and storage `
      + `past ${gt(AHEAD.novel2050Gt)} by 2050, from ${mt(TODAY.novelGt)} today: a factor of `
      + `${Math.round(AHEAD.novel2050Gt / TODAY.novelGt).toLocaleString('en-US')}. The gap `
      + 'between the two is the thing this slider makes you state.',
    ],
    caption: 'What your 2100 removal implies year by year, on the square ramp the model uses, '
      + 'against removal running today and the levels the CMIP7 markers reach.',
    dataSource: 'The State of Carbon Dioxide Removal, June 2026; ScenarioMIP CMIP7 markers',
    key: [
      { label: 'Your removal', color: 'var(--you)' },
      { label: 'All removal today', color: 'var(--dim)', dash: true },
    ],
    spec(outcome, scenario): PlotSpec {
      const values = outcome.values ?? {};
      const total = (values['conventional'] ?? 0) + (values['novel'] ?? 0);
      const years: number[] = [];
      for (let y = BASE_YEAR; y <= END_YEAR; y += 5) years.push(y);
      return {
        xMin: BASE_YEAR,
        xMax: END_YEAR,
        xTicks: [BASE_YEAR, 2050, 2075, END_YEAR],
        yLabel: 'GtCO₂ removed a year',
        yDecimals: 1,
        includeZero: true,
        series: [
          { id: 'today',
            label: 'All removal today',
            points: [{ year: BASE_YEAR, value: TODAY.totalGt },
                     { year: END_YEAR, value: TODAY.totalGt }],
            color: 'var(--dim)', width: 1.4, dash: '4 4' },
          { id: 'reader',
            label: readerLabel(scenario, 'Your removal'),
            points: years.map((year) => ({ year, value: rampAt(year, total) })),
            color: 'var(--you)', width: 2.4, labelAtEnd: true },
        ],
        points: data.markers.map((m) => ({
          id: m.id, label: m.id, year: END_YEAR, value: m.removals, color: m.color,
        })),
        rightGutter: 96,
      };
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Land, energy, storage and who pays.',
    paragraphs: [
      'Conventional removal competes for land. Planting forests and building soil carbon uses '
      + 'the same hectares as food, and the land-use slider on this site already carries that '
      + 'trade. It also releases what it stored if the forest burns or is cleared, which makes '
      + 'permanence a policy problem rather than a technical one.',
      'Capture and storage escapes the land constraint and hits an energy one. Direct air '
      + 'capture works against a very dilute gas, which costs energy that has to come from '
      + 'somewhere clean, or the removal is partly self-cancelling. Bioenergy with capture '
      + 'needs the biomass grown first, so it returns to land after all.',
      'Storage has to hold for centuries to count, which means geology rather than vegetation, '
      + 'and geology means surveys, permits and monitoring in places that agree to host it. '
      + `Contracts for ${gt(0.04)} of removal were signed in the voluntary market last year, `
      + 'against pledges measured in gigatonnes.',
      'The honest summary is that removal at the scale the scenarios assume has no precedent '
      + 'and no market. That does not make it impossible. It does mean a scenario leaning on '
      + 'it is making a claim about the second half of this century that nothing in the record '
      + 'yet supports, and this slider is where you decide how large that claim is.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Two of the seven end below zero.',
    paragraphs: [
      `The markers publish a CO₂ path, not a removal figure, so this tool derives one: the `
      + `value that makes the reconstruction follow that marker's own path. `
      + data.markers.map((m) => `${m.label} ${m.removals.toFixed(1)}`).join(', ')
      + ' GtCO₂ a year by 2100.',
      `MEDIUM needs none. HIGH needs a little. MEDIUM-to-LOW and VERY LOW end the century at `
      + `${data.markers.find((m) => m.id === 'ML')?.co2In2100.toFixed(1) ?? '−9.2'} and `
      + `${data.markers.find((m) => m.id === 'VL')?.co2In2100.toFixed(1) ?? '−5.8'} GtCO₂ a `
      + 'year, below zero, which no arrangement of the four Kaya factors reaches.',
      `VERY LOW's ${data.markers.find((m) => m.id === 'VL')?.removals.toFixed(1) ?? '11'} `
      + `GtCO₂ a year is roughly `
      + `${Math.round((data.markers.find((m) => m.id === 'VL')?.removals ?? 11) / TODAY.totalGt)} `
      + 'times all the removal happening today, and it comes on top of cutting emissions '
      + 'faster than any scenario in the set. Both halves of that have to hold.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Two families, added.',
    paragraphs: [
      'Set what forests and soils take back in 2100, and what capture and storage takes back '
      + 'beside them. The builder adds the two into the single figure the slider carries.',
      'The split matters for judging plausibility rather than for the arithmetic: the first '
      + 'competes for land and can be reversed, the second competes for clean energy and '
      + 'storage and currently barely exists. The model treats their sum.',
    ],
    action: 'Use this removal in my scenario',
    modes: [{
      id: 'families',
      label: 'By method',
      parts: PARTS,
      combine(values) {
        const conventional = values['conventional'] ?? 0;
        const novel = values['novel'] ?? 0;
        const total = conventional + novel;
        const multiple = total / TODAY.totalGt;
        return {
          value: total,
          headline: total === 0
            ? 'No engineered removal'
            : `${gt(total)} removed in 2100`,
          detail: [
            total === 0
              ? 'The path can still go below zero through the land use slider alone'
              : `${multiple.toFixed(1)} times all the removal running today`,
            `Forests and soils ${gt(conventional)}, capture and storage ${gt(novel)}`,
            novel > AHEAD.novel2050Gt
              ? `Capture and storage above the ${gt(AHEAD.novel2050Gt)} assessed pathways `
                + 'reach by 2050'
              : `Cumulatively about ${Math.round(total * (END_YEAR - BASE_YEAR) / 3)} GtCO₂ `
                + 'taken back over the century on this ramp',
          ],
          values: { conventional, novel },
        };
      },
    }],
  },

  sources: REMOVAL_SOURCES,
};

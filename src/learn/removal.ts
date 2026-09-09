/**
 * Learn More: engineered CO₂ removal.
 *
 * Every number comes from src/data/learn_removal.json, which
 * scripts/build_removal.py parses out of the State of Carbon Dioxide Removal
 * executive summary, and from each marker's own 2100 removal level as fitted in
 * scripts/build_carried_data.py.
 */
import data from '../data/learn_removal.json';
import landUseData from '../data/learn_land_use.json';
import { BASE, BASE_YEAR, END_YEAR, SPEC_BY_ID } from '../model/config.js';
import { computePath } from '../model/kaya.js';
import { MARKER_BY_ID } from '../model/markers.js';
import type { ScenarioInputs } from '../model/types.js';
import presets from '../data/presets.json';
import { readerLabel } from '../state.js';
import type { PlotSpec } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';
import { REMOVAL_SOURCES } from './sources/removal.js';

const SPEC = SPEC_BY_ID['removals'];
const LAND = landUseData.constants.decomposition;
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
 * The four CMIP7 markers as ticks: where loading each preset puts this slider.
 *
 * Each figure is what scripts/build_carried_data.py fits on top of that
 * marker's own land-use flux, not the marker's whole removal. MEDIUM-to-LOW
 * already carries a land sink of 8.79 GtCO2 a year and needs 5.5 beyond it;
 * putting that 5.5 on a forests control would count the land twice, which is
 * why this page has no forests control.
 */
const MARKER_MARKS = data.markers
  .filter((m) => m.removals > 0)
  .map((m) => ({
    value: m.removals,
    label: `${m.id} ${m.removals.toFixed(1)}`,
    kind: 'high' as const,
    color: m.color,
  }));

const ML_LAND = MARKER_BY_ID['ML']?.kaya.landUse ?? -8.79;
const VL_LAND = MARKER_BY_ID['VL']?.kaya.landUse ?? -4.71;

/**
 * What HIGH's 2100 CO2 comes to with this slider at zero, against the marker.
 *
 * Computed rather than typed. The CMIP7 HIGH preset carries a fitted removal of
 * 1.5 GtCO2 a year, and running the same preset without it shows what that
 * figure is doing: a constant rate overshoots HIGH's published path, and the
 * fit takes the difference off on this slider. Nothing in HIGH assumes removal
 * on that scale.
 */
const HIGH_OVERSHOOT = (() => {
  const preset = presets.presets.find((p) => p.id === 'cmip7-high');
  if (preset === undefined) throw new Error('no cmip7-high preset');
  const path = computePath({ ...preset.inputs, removals: 0 } as ScenarioInputs);
  const published = MARKER_BY_ID['H']?.co2Gt ?? [];
  return {
    without: path.final.co2Gt,
    marker: published[published.length - 1] ?? 55.04,
  };
})();

function marker(id: string) {
  const found = data.markers.find((m) => m.id === id);
  if (found === undefined) throw new Error(`no marker "${id}" in learn_removal.json`);
  return found;
}

/** The sustained growth from today's level that reaches a 2100 level, %/yr. */
function impliedGrowthPercent(target: number): number {
  return ((target / TODAY.novelGt) ** (1 / (END_YEAR - BASE_YEAR)) - 1) * 100;
}

/**
 * One control, and only one.
 *
 * Forests and soils belong to the land-use term, which nets regrowth and
 * restoration against clearing before anything reaches this page. A control for
 * them here would add a second place to set the same carbon, so the land-use
 * page keeps them and this page keeps the machinery.
 */
const PARTS: BuilderPart[] = [
  {
    id: 'novel',
    label: 'Capture and storage in 2100',
    min: SPEC.min,
    max: SPEC.max,
    step: SPEC.step,
    default: SPEC.default,
    decimals: 1,
    unitSuffix: ' GtCO₂',
    note: `Bioenergy with carbon capture, direct air capture, biochar and enhanced `
      + `weathering: the removal that stores carbon outside the land-use account. These run `
      + `at ${mt(TODAY.novelGt)} today, ${TODAY.novelSharePercent}% of all removal, growing `
      + `${TODAY.novelGrowthPercent}% a year. Planting and soil carbon supply the other `
      + `${gt(TODAY.conventionalGt)}, on the land use slider.`,
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
  standfirst: 'A product of four positive factors stays positive at any rate of change, so '
    + 'the Kaya identity alone has no route below zero. This slider supplies the term that '
    + 'takes a path negative, and two of the seven CMIP7 markers end the century below zero.',

  definition: {
    quantity: 'Carbon dioxide captured and stored, outside the land account, in 2100',
    units: 'GtCO₂ a year',
    place: 'Added to the four Kaya factors, beside land use and not inside it',
    today: `${mt(TODAY.novelGt)}, the capture-and-storage part of ${gt(TODAY.totalGt)} `
      + 'removed across all methods',
    paragraphs: [
      'The identity multiplies four positive quantities: people, income each, energy per '
      + 'dollar, carbon per unit of energy. At any rate of change the product stays above '
      + 'zero. Net negative emissions therefore fall outside the four factors, and two CMIP7 '
      + 'markers end 2100 net negative.',
      'Removal therefore enters as a separate term, added rather than multiplied. It alone '
      + 'takes the path below zero. The deep-mitigation scenarios use it to '
      + 'offset the emissions they accumulate earlier in the century.',
      'This term covers capture and storage. Planting, restoration, soil carbon and wood '
      + 'products belong to the land, and the land-use term nets them against clearing: '
      + `today’s land-use flux of ${gt(BASE.landUseGt)} remains after existing regrowth `
      + `absorbs ${gt(LAND.regrowth)}. Forests go on the land use slider and capture and `
      + 'storage on this one, so no tonne enters the total twice.',
      'The ramp follows the square of elapsed time rather than a straight line: near zero '
      + 'before the 2040s, then steeper. That shape matches the deployment in the scenarios, '
      + 'and it also separates this control from the land use slider. A straight ramp to a '
      + '2100 level gives the same path as moving land use by the same amount, so the two '
      + 'controls would cover one set of paths between them.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'Forests account for almost all of it.',
    paragraphs: [
      `The world removes ${gt(TODAY.totalGt)} today, about ${TODAY.shareOfGrossPercent}% of `
      + `gross CO₂ emissions. Conventional methods account for nearly all of it: planting, `
      + `restoration and soil carbon, the things countries already report under land use. `
      + `Capture and storage `
      + `accounts for ${mt(TODAY.novelGt)}, ${TODAY.novelSharePercent}% of the total.`,
      `That small number grows ${TODAY.novelGrowthPercent}% a year, and everything built `
      + `or under construction would reach ${mt(AHEAD.pipeline2030Gt)} by 2030. Country `
      + `pledges add to ${gt(AHEAD.pledges2030Gt)} of removal in 2030, still almost entirely `
      + 'conventional.',
      `The scenarios assume a larger figure. Assessed pathways scale capture and storage `
      + `past ${gt(AHEAD.novel2050Gt)} by 2050, from ${mt(TODAY.novelGt)} today: a factor of `
      + `${Math.round(AHEAD.novel2050Gt / TODAY.novelGt).toLocaleString('en-US')}. This `
      + 'slider sets a figure against that scale.',
    ],
    caption: 'Your 2100 capture and storage, year by year on the square ramp the model uses, '
      + 'against all removal today, nearly all of it forests on the land use slider, and '
      + 'against the level of each CMIP7 marker.',
    dataSource: 'The State of Carbon Dioxide Removal, June 2026; ScenarioMIP CMIP7 markers',
    key: [
      { label: 'Your capture and storage', color: 'var(--you)' },
      { label: 'All removal today, nearly all forests', color: 'var(--dim)', dash: true },
    ],
    spec(outcome, scenario): PlotSpec {
      const total = outcome.value;
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
            label: 'All removal today, nearly all forests',
            points: [{ year: BASE_YEAR, value: TODAY.totalGt },
                     { year: END_YEAR, value: TODAY.totalGt }],
            color: 'var(--dim)', width: 1.4, dash: '4 4' },
          { id: 'reader',
            label: readerLabel(scenario, 'Your capture and storage'),
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
      + 'the same hectares as food, and a fire or a clearance releases what those hectares '
      + 'stored, which makes permanence a policy question rather than a technical one. That '
      + 'family belongs to the land use slider, so this page leaves it out.',
      'Capture and storage trades the land constraint for an energy constraint. Direct air '
      + 'capture works against a dilute gas and takes low-carbon energy, or part of the '
      + 'removal cancels itself. Bioenergy with capture takes biomass grown first, which '
      + 'returns the question to land. That competition falls on hectares rather than on '
      + 'carbon: those tonnes go into geological storage rather than into the standing '
      + 'biomass the land-use flux measures.',
      'Storage has to hold for centuries to count, which means geology rather than '
      + 'vegetation, and geology means surveys, permits and monitoring in a host '
      + `jurisdiction. The voluntary market signed contracts for ${mt(0.04)} of removal last `
      + 'year, against pledges measured in gigatonnes.',
      'Removal at the scale the scenarios assume has no precedent and no market at present. '
      + 'A scenario that uses it claims something about the second half of the century that '
      + 'the record does not yet cover, and this slider sets the size of that claim.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Two of the seven end below zero.',
    paragraphs: [
      `The markers publish a CO₂ path, not a removal figure, so this tool derives one: the `
      + `value that makes the reconstruction follow that marker's published path, fitted with `
      + `the marker's land use already in place. `
      + data.markers.map((m) => `${m.label} ${m.removals.toFixed(1)}`).join(', ')
      + ' GtCO₂ a year by 2100. Each figure gives what the path needs beyond the land rather '
      + 'than the marker’s whole removal.',
      `The distinction changes the arithmetic. MEDIUM-to-LOW assumes a land sink of `
      + `${gt(Math.abs(ML_LAND))} in 2100, the largest of the seven, and the fit needs `
      + `${gt(marker('ML').removals)} on top of it. VERY LOW assumes `
      + `${gt(Math.abs(VL_LAND))} of land sink and needs ${gt(marker('VL').removals)} beyond `
      + 'that. Read either figure as that scenario’s total removal and its forests enter the '
      + 'total twice.',
      `MEDIUM needs nothing here at all, and HIGH’s ${gt(marker('H').removals)} comes from `
      + 'the fit rather than from the scenario. A constant rate overshoots HIGH’s published '
      + 'path, '
      + `ending 2100 at ${HIGH_OVERSHOOT.without.toFixed(1)} against the marker’s `
      + `${HIGH_OVERSHOOT.marker.toFixed(1)} GtCO₂ a year, and the fit subtracts the `
      + 'difference on this slider. Only the two deep markers carry a figure here that comes '
      + 'from the scenario itself.',
      `MEDIUM-to-LOW and VERY LOW end the century at ${marker('ML').co2In2100.toFixed(1)} and `
      + `${marker('VL').co2In2100.toFixed(1)} GtCO₂ a year, below zero and outside the range `
      + `of any arrangement of the four Kaya factors. VERY LOW’s `
      + `${gt(marker('VL').removals)} comes to roughly `
      + `${Math.round(marker('VL').removals / TODAY.novelGt).toLocaleString('en-US')} times `
      + 'the capture and storage running today, alongside the fastest emissions cuts in the '
      + 'set. The scenario requires both.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'One family. Forests belong to the land use page.',
    paragraphs: [
      'Set the 2100 figure for capture and storage. Forests, soils and wood products stay on '
      + 'the land use page, because the land-use term nets them against clearing already, and '
      + 'a control for them here would subtract the same carbon in two places.',
      `The readout gives the growth rate implied by that figure. Capture and storage runs at `
      + `${mt(TODAY.novelGt)} today and grows ${TODAY.novelGrowthPercent}% a year, so a 2100 `
      + 'level fixes the duration of a growth rate of that order.',
    ],
    action: 'Use this removal in my scenario',
    modes: [{
      id: 'novel',
      label: 'By 2100 level',
      parts: PARTS,
      combine(values) {
        const novel = values['novel'] ?? 0;
        const growth = impliedGrowthPercent(novel);
        return {
          value: novel,
          headline: novel === 0
            ? 'No capture and storage'
            : `${gt(novel)} captured and stored in 2100`,
          detail: [
            novel === 0
              ? 'The path can still go below zero through the land use slider, which carries '
                + 'the forests'
              : `${Math.round(novel / TODAY.novelGt).toLocaleString('en-US')} times the `
                + `${mt(TODAY.novelGt)} running today, reached by growing `
                + `${growth.toFixed(1)}% a year for every year to 2100`,
            novel > AHEAD.novel2050Gt
              ? `Above the ${gt(AHEAD.novel2050Gt)} assessed pathways reach by 2050, and this `
                + 'is a 2100 level rather than a 2050 one'
              : `Below the ${gt(AHEAD.novel2050Gt)} assessed pathways reach by 2050, fifty `
                + 'years earlier than the figure you are setting',
            novel === 0
              ? 'Nothing taken back over the century, and the land account untouched either '
                + 'way'
              : `Cumulatively about ${Math.round(novel * (END_YEAR - BASE_YEAR) / 3)} GtCO₂ `
                + 'taken back over the century on this ramp, with the land account untouched',
          ],
          values: { novel },
        };
      },
    }],
  },

  sources: REMOVAL_SOURCES,

  // The four markers this tool carries a preset for. The other three have no
  // fitted removal, so the table shows a dash for them.
  derivedMarkerValue(markerId) {
    return data.markers.find((m) => m.id === markerId)?.removals ?? null;
  },
};

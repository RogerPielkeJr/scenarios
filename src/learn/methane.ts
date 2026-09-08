/**
 * Learn More: methane.
 *
 * Every number comes from src/data/learn_methane.json, which
 * scripts/build_methane.py writes from EDGAR, and from the emulator
 * coefficients the tool already carries.
 */
import data from '../data/learn_methane.json';
import { BASE, BASE_YEAR, END_YEAR, SPEC_BY_ID } from '../model/config.js';
import { MARKERS, MARKER_BY_ID, markerValueFor } from '../model/markers.js';
import { METHANE } from '../model/emulator.js';
import { readerLabel } from '../state.js';
import type { PlotArea, PlotSpec } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';
import { METHANE_SOURCES } from './sources/methane.js';

const C = data.constants;
const SOURCES = C.sources;
const SPEC = SPEC_BY_ID['methane'];

const mt = (value: number) => `${Math.round(value)} Mt a year`;
const pc = (value: number) => `${value.toFixed(0)}%`;
const degrees = (value: number) => `${value.toFixed(2)} °C`;

/**
 * EDGAR's bottom-up inventory reaches a lower total than the atmospheric
 * estimate the tool's base year uses. Scaling every source by the ratio
 * keeps today's sources adding up to the number the slider starts from.
 */
const CALIBRATION = BASE.methaneMt / C.totals.last;

function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_methane.json`);
  return found;
}

function source(id: string) {
  const found = SOURCES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no methane source "${id}"`);
  return found;
}

const FOSSIL = source('fossil');
const LIVESTOCK = source('livestock');
const RICE = source('rice');
const WASTE = source('waste');

const SOURCE_COLORS: Record<string, string> = {
  fossil: '#3d3936',
  livestock: '#b8860b',
  rice: '#1a7f37',
  waste: '#7b3fa0',
  other: '#5ab4ac',
};

/** Today's level for one source, on the scale the slider starts from. */
function todayOf(id: string): number {
  return source(id).last * CALIBRATION;
}

const SOURCE_PARTS: BuilderPart[] = SOURCES.map((entry) => ({
  id: entry.id,
  label: entry.label,
  min: 0,
  max: Math.ceil((entry.last * CALIBRATION * 2) / 10) * 10,
  step: 1,
  default: Math.round(entry.last * CALIBRATION),
  decimals: 0,
  unitSuffix: ' Mt',
  note: `${pc(entry.share)} of anthropogenic methane today. This source emitted `
    + `${mt(entry.first * CALIBRATION)} in ${C.firstYear} and `
    + `${mt(entry.last * CALIBRATION)} in ${C.lastYear}, a change of `
    + `${entry.growth >= 0 ? '+' : '−'}${Math.abs(entry.growth).toFixed(2)}% a year.`,
  marks: [
    { value: Math.round(entry.first * CALIBRATION), label: String(C.firstYear), kind: 'low' },
    { value: Math.round(entry.last * CALIBRATION), label: 'today', kind: 'observed' },
  ],
}));

const HIGH = MARKER_BY_ID['H'];
const VERY_LOW = MARKER_BY_ID['VL'];
const HIGH_CH4 = HIGH === undefined ? 0 : markerValueFor(HIGH, 'methane') ?? 0;
const VERY_LOW_CH4 = VERY_LOW === undefined ? 0 : markerValueFor(VERY_LOW, 'methane') ?? 0;

/** What the emulator does with a methane figure, in degrees against today. */
function warmingFrom(value: number): number {
  return METHANE.k * (value - METHANE.refMt);
}

export const METHANE_PAGE: LearnPageSpec = {
  slug: 'methane',
  accent: '#5c4a9e',
  input: 'methane',
  title: 'Methane',
  standfirst: 'One slider sets how much methane the world emits in 2100. Methane leaves the '
    + 'atmosphere within a couple of decades, which makes its 2100 level a question about '
    + 'what the world emits that year rather than about everything emitted before it.',

  definition: {
    quantity: 'Anthropogenic methane emissions in 2100',
    units: 'million tonnes of CH4 a year',
    place: 'Alongside the four CO2 factors, reaching the warming figure through its own '
      + 'coefficient',
    today: `${mt(BASE.methaneMt)} (base year ${BASE_YEAR})`,
    paragraphs: [
      'Methane differs from CO2 in the one way that matters most here. A molecule of CO2 '
      + 'emitted today still warms the planet in a century; a molecule of methane breaks down '
      + 'within about a decade. Cumulative methane emissions therefore do little work, and '
      + 'the flow in a given year does almost all of it.',
      'That turns this slider into a level rather than a rate. The four CO2 factors set rates '
      + 'of change and the tool adds up everything they emit. Methane asks one question: how '
      + 'much does the world still emit in 2100?',
      `The tool converts that answer at ${degrees(METHANE.k * 100)} per 100 Mt a year against `
      + `today's ${mt(METHANE.refMt)}. Moving the slider across its whole range, ${SPEC.min} `
      + `to ${SPEC.max} Mt, changes the 2100 warming figure by `
      + `${degrees(METHANE.k * (SPEC.max - SPEC.min))}.`,
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'Five anthropogenic sources, stacked.',
    paragraphs: [
      `Anthropogenic methane rose from ${mt(C.totals.first * CALIBRATION)} in ${C.firstYear} `
      + `to ${mt(C.totals.last * CALIBRATION)} in ${C.lastYear} on EDGAR's inventory, `
      + `${C.totals.growth >= 0 ? '+' : '−'}${Math.abs(C.totals.growth).toFixed(2)}% a year. `
      + `Waste grew fastest at ${WASTE.growth >= 0 ? '+' : '−'}`
      + `${Math.abs(WASTE.growth).toFixed(2)}% a year and rice alone fell, at `
      + `${RICE.growth >= 0 ? '+' : '−'}${Math.abs(RICE.growth).toFixed(2)}%.`,
      `Livestock supplies the largest share at ${pc(LIVESTOCK.share)}, fossil fuel production `
      + `and distribution ${pc(FOSSIL.share)}, waste ${pc(WASTE.share)} and rice `
      + `${pc(RICE.share)}. The first two carry most of the reductions the scenarios assume.`,
      'Natural wetlands emit more than all of these together, and fall outside both the chart '
      + 'and the slider. The Global Methane Budget puts wetlands and inland fresh water at '
      + '248 Tg a year against 369 Tg from direct anthropogenic sources, which lets a '
      + 'scenario cut human methane hard and still leave a large natural flux in place.',
    ],
    caption: `Anthropogenic methane by source, ${C.firstYear} to ${C.lastYear}, in million `
      + 'tonnes a year, then a straight line to the 2100 total you set above. The seven '
      + 'Dots at 2100 mark the seven CMIP7 scenarios.',
    dataSource: 'EDGAR 2024 release, anthropogenic CH4 by sector; ScenarioMIP CMIP7 markers',
    key: [
      ...SOURCES.map((entry) => ({
        label: entry.label,
        color: SOURCE_COLORS[entry.id] ?? 'var(--dim)',
      })),
      { label: 'All sources together', color: 'var(--you)' },
    ],
    spec(outcome, scenario): PlotSpec {
      const values = outcome.values ?? {};
      const forwardYears = [2030, 2040, 2050, 2060, 2070, 2080, 2090, END_YEAR];
      const areas: PlotArea[] = SOURCES.map((entry) => {
        const observed = series(entry.id);
        const last = (observed.values[observed.values.length - 1] ?? 0) * CALIBRATION;
        const target = values[entry.id] ?? last;
        return {
          id: entry.id,
          label: entry.label,
          years: [...observed.years, ...forwardYears],
          values: [
            ...observed.values.map((value) => value * CALIBRATION),
            ...forwardYears.map((year) =>
              last + (target - last) * ((year - C.lastYear) / (END_YEAR - C.lastYear))),
          ],
          color: SOURCE_COLORS[entry.id] ?? 'var(--dim)',
        };
      });
      // A line across the top of the stack, so the reader's own total carries
      // their name rather than sitting as an unlabelled edge.
      const first = areas[0];
      const total = first === undefined ? [] : first.years.map((year, index) => ({
        year,
        value: areas.reduce((sum, area) => sum + (area.values[index] ?? 0), 0),
      }));
      return {
        xMin: C.firstYear,
        xMax: END_YEAR,
        xTicks: [C.firstYear, 2005, 2025, 2050, 2075, END_YEAR],
        yLabel: 'Mt CH4 a year',
        yDecimals: 0,
        areas,
        series: [{
          id: 'reader',
          label: readerLabel(scenario, 'All sources'),
          points: total,
          color: 'var(--you)',
          width: 2.4,
          labelAtEnd: true,
        }],
        points: MARKERS.flatMap((marker) => {
          const value = markerValueFor(marker, 'methane');
          return value === null ? [] : [{
            id: marker.id,
            label: marker.id,
            year: END_YEAR,
            value,
            color: marker.color,
          }];
        }),
        divider: { year: C.lastYear, label: 'your path' },
        rightGutter: 92,
      };
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'A short life, and five sources with different politics.',
    paragraphs: [
      'A short atmospheric life cuts both ways. Methane emitted in the 2030s has stopped '
      + 'warming the planet by 2100, so a scenario can emit a great deal along the way and '
      + 'still reach a low 2100 level. A cut also delivers its cooling within two decades '
      + 'rather than over centuries, which draws attention to methane out of proportion to '
      + 'its share of emissions.',
      'Fossil methane leaks from wells, pipelines, compressors and mines, and stopping it '
      + 'often pays for itself in recovered gas. Satellites now find individual leaks, which '
      + 'has moved this source from an estimate to an observation and revised inventories '
      + 'upward in the process.',
      'Livestock methane comes out of rumen fermentation and manure. It scales with herd '
      + 'size, herd size scales with meat and dairy demand, and that demand rises with income '
      + 'in exactly the countries whose income the projections raise. Feed additives, breeding '
      + 'and manure management each shave a few percent off it; none of them halves it.',
      `Rice paddies emit while flooded, and drainage regimes change that. Rice alone fell `
      + `among the sources on this chart between ${C.firstYear} and ${C.lastYear}, at `
      + `${RICE.growth >= 0 ? '+' : '−'}${Math.abs(RICE.growth).toFixed(2)}% a year, while `
      + `waste methane from landfills and wastewater grew fastest of the five at `
      + `${WASTE.growth >= 0 ? '+' : '−'}${Math.abs(WASTE.growth).toFixed(2)}%. Both stay `
      + 'smaller than fossil fuels or livestock, and both yield more readily.',
      'The Global Methane Budget records that direct anthropogenic methane has tracked the '
      + 'scenarios assuming no or minimal mitigation policy since 2012. That describes the '
      + 'past decade; the slider asks about the seven that follow.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'The widest spread of any of the rate and level sliders.',
    paragraphs: [
      `The markers range from ${mt(VERY_LOW_CH4)} in VERY LOW to ${mt(HIGH_CH4)} in HIGH, a `
      + `spread of ${(HIGH_CH4 / VERY_LOW_CH4).toFixed(1)} times. HIGH assumes `
      + `${((HIGH_CH4 / BASE.methaneMt - 1) * 100).toFixed(0)}% more than today; VERY LOW `
      + `assumes ${((1 - VERY_LOW_CH4 / BASE.methaneMt) * 100).toFixed(0)}% less.`,
      `That whole spread moves this tool's warming figure by `
      + `${degrees(METHANE.k * (HIGH_CH4 - VERY_LOW_CH4))}, against the 1.65 °C separating `
      + 'those two scenarios overall. Methane '
      + 'matters here, and the CO2 factors decide the century.',
      'Treat the coefficient with care. It comes from fitting a straight line to seven FaIR '
      + 'runs, so it reproduces those seven and carries no information about a methane path '
      + 'outside their range. It also ignores when the methane leaves the ground, a real '
      + 'simplification for a gas that clears the atmosphere within a decade.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'One control per source, added up.',
    paragraphs: [
      'Set each source’s emissions in 2100 and the builder adds them up. Every control opens '
      + `at today’s level, with a mark showing where that source stood in ${C.firstYear}.`,
      `EDGAR's inventory totals ${mt(C.totals.last)} for ${C.lastYear}, while the tool's base `
      + `year uses ${mt(BASE.methaneMt)}, which falls inside the Global Methane Budget's `
      + 'top-down estimate of 369 Tg a year for direct anthropogenic sources, range 350 to '
      + `391. The page scales each source by ${CALIBRATION.toFixed(3)} so today's five add `
      + 'up to the number the slider starts from.',
    ],
    action: 'Use this methane figure in my scenario',
    modes: [{
      id: 'sources',
      label: 'By source',
      parts: SOURCE_PARTS,
      combine(values) {
        const total = SOURCES.reduce(
          (sum, entry) => sum + (values[entry.id] ?? todayOf(entry.id)), 0,
        );
        const change = total - BASE.methaneMt;
        const fossil = values['fossil'] ?? todayOf('fossil');
        const livestock = values['livestock'] ?? todayOf('livestock');
        return {
          value: total,
          headline: `${mt(total)} in 2100`,
          detail: [
            Math.abs(change) < 1
              ? `Level with today's ${mt(BASE.methaneMt)}`
              : `${mt(Math.abs(change))} ${change > 0 ? 'more than' : 'less than'} today's `
                + `${mt(BASE.methaneMt)}`,
            `Fossil fuels ${pc((fossil / total) * 100)} of the total, livestock `
            + `${pc((livestock / total) * 100)}`,
            `Worth ${degrees(warmingFrom(total))} against today's level in this tool, on a `
            + `coefficient of ${degrees(METHANE.k * 100)} per 100 Mt`,
          ],
        };
      },
    }],
  },

  sources: METHANE_SOURCES,
};


/**
 * Learn More: CO2 per unit of energy.
 *
 * Every number comes from src/data/learn_fuel_mix.json, which
 * scripts/build_fuel_mix.py writes from the Energy Institute Statistical
 * Review, the IPCC default emission factors and the Global Carbon Budget.
 */
import data from '../data/learn_fuel_mix.json';
import { BASE, BASE_YEAR, END_YEAR } from '../model/config.js';
import { MARKERS, MARKER_BY_ID, markerValueFor } from '../model/markers.js';
import { cagr, compound } from '../model/rates.js';
import { readerLabel } from '../state.js';
import type { PlotArea, PlotSeries, PlotSpec, Point } from '../ui/plot.js';
import type { BuilderOutcome, BuilderPart, LearnPageSpec } from './types.js';

const C = data.constants;
const FACTORS = C.factors;
const SPAN = END_YEAR - BASE_YEAR;

const rate = (value: number) => `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%/yr`;
const kg = (value: number) => `${value.toFixed(1)} kgCO2 per GJ`;
const pc = (value: number) => `${value.toFixed(0)}%`;

function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_fuel_mix.json`);
  return found;
}

const INTENSITY = series('intensity-slider');
const FOSSIL_IDS = ['coal', 'oil', 'gas'];

/** The seven fuels in the order they stack, fossil at the bottom. */
const FUEL_COLORS: Record<string, string> = {
  coal: '#3d3936',
  oil: '#8a6f52',
  gas: '#cfae7c',
  nuclear: '#7b3fa0',
  hydro: '#2b8cbe',
  windsolar: '#1a7f37',
  bioother: '#5ab4ac',
};

function factorFor(id: string): number {
  const found = FACTORS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no emission factor for "${id}"`);
  return found.co2KgPerGj;
}

function labelFor(id: string): string {
  return FACTORS.find((candidate) => candidate.id === id)?.label ?? id;
}

/** Shares that sum to 100, whatever the reader set them to. */
function normalised(values: Readonly<Record<string, number>>): Record<string, number> {
  const total = FACTORS.reduce((sum, factor) => sum + Math.max(values[factor.id] ?? 0, 0), 0);
  if (total <= 0) {
    // Everything at zero: hold today's mix rather than divide by nothing.
    return Object.fromEntries(FACTORS.map((factor) => [factor.id, factor.share2024]));
  }
  return Object.fromEntries(
    FACTORS.map((factor) => [factor.id, (Math.max(values[factor.id] ?? 0, 0) / total) * 100]),
  );
}

/** The whole chain: shares to combustion CO2 to the slider's own basis. */
function intensityOf(shares: Record<string, number>, processMultiple: number): {
  combustion: number; nonCombustion: number; total: number;
} {
  const raw = FACTORS.reduce(
    (sum, factor) => sum + (shares[factor.id] ?? 0) / 100 * factor.co2KgPerGj, 0,
  );
  const combustion = raw * C.calibration.factor;
  const nonCombustion = C.nonCombustion.kgPerGj * processMultiple;
  return { combustion, nonCombustion, total: combustion + nonCombustion };
}

function points(years: readonly number[], values: readonly number[]): Point[] {
  return years.map((year, index) => ({ year, value: values[index] ?? 0 }));
}

function forwardPath(ratePercent: number): Point[] {
  const out: Point[] = [];
  for (let year = BASE_YEAR; year <= END_YEAR; year += 5) {
    out.push({ year, value: compound(BASE.co2PerEnergyKgGj, ratePercent, year - BASE_YEAR) });
  }
  return out;
}

function markerSeries(): PlotSeries[] {
  return MARKERS.flatMap((marker) => {
    const value = markerValueFor(marker, 'co2PerEnergy');
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

/** The years the stack runs over: the record, then a decade at a time to 2100. */
const FORWARD_YEARS = [2030, 2040, 2050, 2060, 2070, 2080, 2090, END_YEAR];

/**
 * The stacked mix: the record as measured, then a straight line from the
 * 2024 mix to the one the reader has built, so the shares they set appear on
 * the chart rather than only in the result.
 */
function areas(shares: Record<string, number>): PlotArea[] {
  const record = series(FACTORS[0]?.id ?? 'coal');
  const years = [...record.years, ...FORWARD_YEARS];
  return FACTORS.map((factor) => {
    const observed = series(factor.id);
    const last = observed.values[observed.values.length - 1] ?? 0;
    const target = shares[factor.id] ?? last;
    const forward = FORWARD_YEARS.map((year) =>
      last + (target - last) * ((year - C.lastYear) / (END_YEAR - C.lastYear)));
    return {
      id: factor.id,
      label: factor.label,
      years,
      values: [...observed.values, ...forward],
      color: FUEL_COLORS[factor.id] ?? 'var(--dim)',
    };
  });
}

const SHARE_PARTS: BuilderPart[] = FACTORS.map((factor) => ({
  id: factor.id,
  label: factor.label,
  min: 0,
  max: 100,
  step: 1,
  default: Math.round(factor.share2024),
  decimals: 0,
  unitSuffix: '%',
  note: `${factor.share1965.toFixed(1)}% of world energy in ${C.firstYear}, `
    + `${factor.share2024.toFixed(1)}% in ${C.lastYear}. Carries `
    + `${factor.co2KgPerGj.toFixed(1)} kgCO2 per GJ.`,
  marks: [
    { value: Math.round(factor.share1965), label: String(C.firstYear), kind: 'low' },
    { value: Math.round(factor.share2024), label: String(C.lastYear), kind: 'observed' },
  ],
}));

const PROCESS_PART: BuilderPart = {
  id: 'process',
  label: 'Cement, flaring and other industrial CO2',
  min: 0,
  max: 150,
  step: 5,
  default: 100,
  decimals: 0,
  unitSuffix: '% of today',
  note: `${kg(C.nonCombustion.kgPerGj)} of the ${kg(C.levels.sliderBasis2024)} the slider `
    + 'measures comes from outside combustion, cement most of it. Burning nothing leaves '
    + 'this behind.',
  marks: [
    { value: 0, label: 'none', kind: 'low' },
    { value: 100, label: 'as today', kind: 'observed' },
  ],
};

const HIGH = MARKER_BY_ID['H'];
const MEDIUM = MARKER_BY_ID['M'];
const HIGH_RATE = HIGH === undefined ? 0 : markerValueFor(HIGH, 'co2PerEnergy') ?? 0;
const MEDIUM_RATE = MEDIUM === undefined ? 0 : markerValueFor(MEDIUM, 'co2PerEnergy') ?? 0;

const FOSSIL_2024 = FOSSIL_IDS.reduce(
  (sum, id) => sum + (FACTORS.find((f) => f.id === id)?.share2024 ?? 0), 0,
);
const FOSSIL_1965 = FOSSIL_IDS.reduce(
  (sum, id) => sum + (FACTORS.find((f) => f.id === id)?.share1965 ?? 0), 0,
);

export const CARBON_INTENSITY_PAGE: LearnPageSpec = {
  slug: 'carbon-intensity',
  accent: '#8c2f39',
  input: 'co2PerEnergy',
  title: 'CO2 per unit of energy',
  standfirst: 'One slider sets how fast the carbon comes out of the world’s energy. '
    + 'This page shows what the fuel mix has done since 1965, why this term has moved so '
    + 'much more slowly than efficiency, and how to build a rate from a mix of your own.',

  definition: {
    quantity: 'CO2 released per unit of primary energy',
    units: 'kilograms of CO2 per gigajoule; the slider sets how fast it changes, in %/yr',
    place: 'The fourth of the four factors that multiply',
    today: `${kg(C.levels.sliderBasis2024)} (${C.lastYear})`,
    paragraphs: [
      'The fuel mix decides this term. Coal releases '
      + `${factorFor('coal').toFixed(1)} kgCO2 for every gigajoule it delivers, oil `
      + `${factorFor('oil').toFixed(1)} and natural gas ${factorFor('gas').toFixed(1)}. `
      + 'Nuclear, hydro, wind and solar release none at the point of use. Shifting energy '
      + "between those columns does the whole of this factor's work.",
      `Two accountings run side by side here. Burning fuel released `
      + `${kg(C.levels.energyBasis2024)} in ${C.lastYear}. The slider measures `
      + `${kg(C.levels.sliderBasis2024)}, because it also carries the cement, flaring and `
      + 'other industrial CO2 the CMIP7 scenarios count, '
      + `${kg(C.nonCombustion.kgPerGj)} of it, spread across every unit of energy. Cement `
      + `alone supplies ${C.nonCombustion.components.cement.toFixed(2)} of that.`,
      `The difference matters for the rate as well as the level. Measured on the slider's own `
      + `basis the world improved ${rate(C.rates.sliderBasis1990)} from 1990 to ${C.lastYear}; `
      + `measured on combustion alone, ${rate(C.rates.energyBasis1990)}. The calibration mark `
      + 'under the slider on the front page uses the second of those.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The mix below, and what it emits above.',
    paragraphs: [
      `Fossil fuels supplied ${pc(FOSSIL_1965)} of world primary energy in ${C.firstYear} and `
      + `${pc(FOSSIL_2024)} in ${C.lastYear}. Fifty-nine years of nuclear build-out, dam `
      + `building and, lately, wind and solar moved that share by `
      + `${(FOSSIL_1965 - FOSSIL_2024).toFixed(0)} percentage points.`,
      `Inside the fossil block the mix did shift: coal fell from `
      + `${pc(FACTORS.find((f) => f.id === 'coal')?.share1965 ?? 0)} to `
      + `${pc(FACTORS.find((f) => f.id === 'coal')?.share2024 ?? 0)} and gas rose from `
      + `${pc(FACTORS.find((f) => f.id === 'gas')?.share1965 ?? 0)} to `
      + `${pc(FACTORS.find((f) => f.id === 'gas')?.share2024 ?? 0)}. Gas carries `
      + `${(100 - (factorFor('gas') / factorFor('coal')) * 100).toFixed(0)}% less CO2 per `
      + 'gigajoule than coal, so that swap alone lowered the intensity.',
      `Together those movements took the term from ${kg(C.levels.sliderBasis1965)} in `
      + `${C.firstYear} to ${kg(C.levels.sliderBasis2024)} in ${C.lastYear}, a fall of `
      + `${(100 * (1 - C.levels.sliderBasis2024 / C.levels.sliderBasis1965)).toFixed(0)}% in `
      + `59 years, or ${rate(C.rates.sliderBasisWhole)}. Energy intensity fell 46% over the `
      + 'same span. That gap explains why the middle two Kaya terms behave so differently.',
    ],
    caption: `Shares of world primary energy, ${C.firstYear} to ${C.lastYear} as measured, `
      + 'then a straight line to the mix you set above. Fossil fuels fill the bottom three '
      + 'bands.',
    key: FACTORS.map((factor) => ({
      label: factor.label,
      color: FUEL_COLORS[factor.id] ?? 'var(--dim)',
    })),
    spec(outcome): PlotSpec {
      return {
        xMin: C.firstYear,
        xMax: END_YEAR,
        xTicks: [C.firstYear, 1990, 2010, 2025, 2050, 2075, END_YEAR],
        yLabel: '% of primary energy',
        yDecimals: 0,
        yMin: 0,
        yMax: 100,
        rightGutter: 96,
        areas: areas(normalised(outcome.values ?? {})),
        series: [],
        divider: { year: C.lastYear, label: 'your mix' },
      };
    },
    extra: {
      kind: 'plot',
      caption: 'CO2 per unit of energy on the basis the slider measures, which includes '
        + 'cement, flaring and other industrial CO2: the record, then each rate compounding '
        + 'forward from 2025.',
      key: [
        { label: `Record, ${C.firstYear} to ${C.lastYear}`, color: 'var(--ink)' },
        { label: 'Observed rate, continued', color: 'var(--navy)', dash: true },
        { label: 'Your mix', color: 'var(--you)' },
        { label: 'CMIP7 markers', color: 'var(--dim)', dash: true },
      ],
      spec(outcome: BuilderOutcome, scenario): PlotSpec {
        return {
          xMin: C.firstYear,
          xMax: END_YEAR,
          xTicks: [C.firstYear, 1990, 2010, 2025, 2050, 2075, END_YEAR],
          yLabel: 'kgCO2 per GJ',
          yDecimals: 0,
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
              points: forwardPath(C.rates.sliderBasis1990),
              color: 'var(--navy)',
              width: 1.8,
              dash: '5 4',
              labelAtEnd: true,
            },
            {
              id: 'reader',
              label: readerLabel(scenario, 'Your mix'),
              points: forwardPath(outcome.value),
              color: 'var(--you)',
              width: 3.4,
              labelAtEnd: true,
            },
          ],
          divider: { year: C.lastYear, label: 'assumed' },
        };
      },
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Adding clean supply, against a growing total.',
    paragraphs: [
      'This term falls when zero-carbon energy grows faster than energy as a whole. It does '
      + 'nothing when both grow together. Between 1965 and 2024 the world added roughly four '
      + 'times as much energy as it consumed in 1965, and fossil fuels supplied most of that '
      + 'addition, so a large absolute build-out of nuclear, hydro, wind and solar still left '
      + `the fossil share at ${pc(FOSSIL_2024)}.`,
      'The arithmetic forgives nothing. To cut this term by half while total energy doubles, '
      + 'zero-carbon supply has to quadruple and then some, because it has to cover both the '
      + 'share it takes from fossil fuels and the growth in the total. Every scenario that '
      + 'decarbonises quickly rests, underneath, on how fast the world builds clean supply.',
      `Fuel switching inside the fossil block helps and runs out. Replacing every remaining `
      + `tonne of coal with gas would cut about `
      + `${((factorFor('coal') - factorFor('gas')) * (FACTORS.find((f) => f.id === 'coal')?.share2024 ?? 0) / 100).toFixed(1)} `
      + 'kgCO2 per GJ, worth roughly a decade of the observed rate, and then the term would '
      + 'sit at the carbon content of gas and stop falling.',
      `A floor sits underneath. Take every fossil fuel out of the mix and the slider still `
      + `reads ${kg(C.zeroCarbonFloor.kgPerGj)}, the cement, flaring and industrial process `
      + `CO2 that no change of fuel touches. Reaching that floor by 2100 implies `
      + `${rate(C.zeroCarbonFloor.impliedRate)}, and no faster rate exists on this page `
      + 'unless those industrial emissions fall too.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'Four of the seven publish a rate for this term.',
    paragraphs: [
      `CMIP7 HIGH assumes ${rate(HIGH_RATE)}, slower than the `
      + `${rate(C.rates.sliderBasis1990)} the world has managed since 1990 and slower still `
      + `than the ${rate(C.rates.sliderBasisDecade)} of the past decade. A world that keeps `
      + 'building energy at that carbon content treats the past ten years of wind, solar and '
      + 'nuclear as an aberration.',
      `CMIP7 MEDIUM assumes ${rate(MEDIUM_RATE)}, about `
      + `${(MEDIUM_RATE / C.rates.sliderBasis1990).toFixed(0)} times the rate since 1990. `
      + `MEDIUM-to-LOW assumes ${rate(markerValueFor(MARKER_BY_ID['ML'] ?? MARKERS[0]!, 'co2PerEnergy') ?? 0)}, `
      + `close to the ${rate(C.zeroCarbonFloor.impliedRate)} that empties the fossil block `
      + 'entirely. Three of the seven publish no rate for this term at all.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Set the 2100 mix; the page converts it.',
    paragraphs: [
      'Set a share for each fuel in 2100. The shares need not add to 100, because the builder '
      + 'normalises them; their proportions carry the answer. Published emission factors turn '
      + 'the mix into kilograms of CO2 per gigajoule, and the distance from today’s '
      + `${kg(C.levels.sliderBasis2024)} across 75 years gives the rate the slider takes.`,
      `Two adjustments sit between the mix and the answer, both of them visible in the result. The `
      + `page scales the emission factors by ${C.calibration.factor.toFixed(3)}, because applied `
      + `raw to the ${C.lastYear} mix they give ${kg(C.calibration.modelled2024)} against the `
      + `${kg(C.calibration.observed2024)} the world actually emitted from energy, the `
      + 'difference falling to oil that becomes plastics, lubricants and bitumen rather than '
      + `exhaust. It then adds ${kg(C.nonCombustion.kgPerGj)} of cement, flaring and `
      + 'industrial CO2 on top, which the last control lets you change.',
    ],
    action: 'Use this rate in my scenario',
    modes: [{
      id: 'shares',
      label: '2100 shares',
      parts: [...SHARE_PARTS, PROCESS_PART],
      combine(values) {
        const shares = normalised(values);
        const process = (values['process'] ?? 100) / 100;
        const intensity = intensityOf(shares, process);
        const value = cagr(BASE.co2PerEnergyKgGj, intensity.total, SPAN);
        const fossil = FOSSIL_IDS.reduce((sum, id) => sum + (shares[id] ?? 0), 0);
        return {
          value,
          headline: `${rate(value)}, from a mix that burns at ${kg(intensity.total)}`,
          detail: [
            `Your 2100 mix: ${FOSSIL_IDS.map((id) => `${labelFor(id).toLowerCase()} `
              + `${pc(shares[id] ?? 0)}`).join(', ')}, everything else ${pc(100 - fossil)}`,
            `Burning it releases ${kg(intensity.combustion)}`,
            `Cement, flaring and other industry add ${kg(intensity.nonCombustion)}, `
            + `giving ${kg(intensity.total)} on the slider's basis`,
            Math.abs(value) < 0.02
              ? `From today's ${kg(BASE.co2PerEnergyKgGj)}, that leaves the term where it `
                + 'stands: no change at all across 75 years'
              : `From today's ${kg(BASE.co2PerEnergyKgGj)}, reaching that by 2100 implies `
                + `${rate(value)}, ${Math.abs(value / C.rates.sliderBasis1990).toFixed(1)}× `
                + 'the rate the world has managed since 1990',
          ],
        };
      },
    }],
  },

  sources: [
    {
      title: 'Statistical Review of World Energy 2026',
      publisher: 'Energy Institute',
      vintage: '2026 edition, data to 2024',
      url: 'https://www.energyinst.org/statistical-review',
      used: 'Consumption of each fuel and total energy supply, world, 1965 to 2024, and CO2 '
        + 'from energy over the same years.',
    },
    {
      title: '2006 IPCC Guidelines for National Greenhouse Gas Inventories, Volume 2 '
        + '(Energy), Chapter 1, Table 1.3',
      publisher: 'Intergovernmental Panel on Climate Change, National Greenhouse Gas '
        + 'Inventories Programme',
      vintage: '2006',
      url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/'
        + 'V2_1_Ch1_Introduction.pdf',
      used: 'Default carbon content by fuel: 25.8 kgC per GJ for other bituminous coal, 20.0 '
        + 'for crude oil, 15.3 for natural gas, converted to CO2 at 44/12.',
    },
    {
      title: 'Global Carbon Budget 2024',
      publisher: 'Friedlingstein and colleagues, Earth System Science Data 17',
      vintage: '2025',
      url: 'https://doi.org/10.5194/essd-17-965-2025',
      used: 'World fossil and industrial CO2 with its cement, flaring and other industry '
        + 'components, which the slider’s basis includes and combustion accounting does not.',
    },
    {
      title: 'Emissions Trends and Drivers (Chapter 2, IPCC AR6 Working Group III)',
      publisher: 'Intergovernmental Panel on Climate Change',
      vintage: '2022',
      url: 'https://doi.org/10.1017/9781009157926.004',
      used: 'The Kaya decomposition of recorded emissions, and how little of it carbon '
        + 'intensity has supplied.',
    },
    {
      title: 'The Shared Socioeconomic Pathways and their energy, land use, and greenhouse '
        + 'gas emissions implications: An overview',
      publisher: 'Riahi and colleagues, Global Environmental Change 42',
      vintage: '2017',
      url: 'https://doi.org/10.1016/j.gloenvcha.2016.05.009',
      used: 'The energy-system assumptions behind the marker scenarios’ rates for this term.',
    },
    {
      title: 'Carbon dioxide emissions in a methane economy',
      publisher: 'Ausubel, Grübler and Nakicenovic, Climatic Change 12(3)',
      vintage: '1988',
      url: 'https://doi.org/10.1007/BF00139432',
      used: 'The decarbonisation trajectory behind the tool’s Ausubel preset, and the '
        + 'long view of fuel switching this page draws on.',
    },
  ],
};

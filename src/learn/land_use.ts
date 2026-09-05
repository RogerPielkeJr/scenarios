/**
 * Learn More: land use CO2.
 *
 * Every number comes from src/data/learn_land_use.json, which
 * scripts/build_land_use.py writes from the Global Carbon Budget and the
 * IPCC 2006 Guidelines.
 */
import data from '../data/learn_land_use.json';
import { BASE, BASE_YEAR, END_YEAR } from '../model/config.js';
import { MARKERS, MARKER_BY_ID, markerValueFor } from '../model/markers.js';
import type { PlotSpec, Point } from '../ui/plot.js';
import type { BuilderPart, LearnPageSpec } from './types.js';

const C = data.constants;
const D = C.decomposition;

const gt = (value: number) => `${value.toFixed(2)} GtCO2 a year`;
const signedGt = (value: number) =>
  `${value >= 0 ? '' : '−'}${Math.abs(value).toFixed(2)} GtCO2 a year`;

function series(id: string) {
  const found = data.series.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no series "${id}" in learn_land_use.json`);
  return found;
}

const FLUX = series('flux');

function points(years: readonly number[], values: readonly number[]): Point[] {
  return years.map((year, index) => ({ year, value: values[index] ?? 0 }));
}

const PARTS: BuilderPart[] = [
  {
    id: 'deforestation',
    label: 'Deforestation and other land-use sources in 2100',
    min: 0,
    max: 150,
    step: 5,
    default: 100,
    decimals: 0,
    unitSuffix: '% of today',
    note: `Gross deforestation runs ${gt(D.deforestation)} today, with another `
      + `${gt(D.otherAndPeat)} from other land-use transitions, peat drainage and peat fire. `
      + 'Zero means the world stops clearing forest altogether.',
    marks: [
      { value: 0, label: 'halted', kind: 'low' },
      { value: 100, label: 'as today', kind: 'observed' },
    ],
  },
  {
    id: 'regrowth',
    label: 'Regrowth on land already recovering',
    min: 0,
    max: 200,
    step: 5,
    default: 100,
    decimals: 0,
    unitSuffix: '% of today',
    note: `Forests already regrowing take up ${gt(D.regrowth)}, which offsets two-thirds of `
      + 'the deforestation above. This control scales that sink.',
    marks: [
      { value: 100, label: 'as today', kind: 'observed' },
      { value: 200, label: 'twice', kind: 'high' },
    ],
  },
  {
    id: 'area',
    label: 'Land restored to forest by 2100',
    min: 0,
    max: 800,
    step: 10,
    default: 0,
    decimals: 0,
    unitSuffix: ' Mha',
    note: 'Newly restored land, over and above what is already regrowing. For scale, the '
      + 'world holds about 4,000 Mha of forest today.',
    marks: [
      { value: 0, label: 'none', kind: 'observed' },
      { value: 500, label: '500 Mha', kind: 'high' },
    ],
  },
  {
    id: 'rate',
    label: 'Sequestration rate on that land',
    min: 2,
    max: 24,
    step: 0.5,
    default: C.growthRates.matureTropical,
    decimals: 1,
    unitSuffix: ' tCO2/ha/yr',
    note: `IPCC defaults for above-ground growth in natural forest, converted at the 0.47 `
      + `carbon fraction: ${C.growthRates.matureTropical} tCO2 a hectare for a tropical stand `
      + `over 20 years old, ${C.growthRates.youngTropicalSouthAmerica} for young South `
      + `American regrowth, ${C.growthRates.youngTropicalAsiaInsular} for young insular Asian `
      + 'regrowth. Below-ground carbon and soil add more.',
    marks: [
      { value: C.growthRates.matureTropical, label: 'mature', kind: 'observed' },
      { value: C.growthRates.youngTropicalSouthAmerica, label: 'young', kind: 'high' },
    ],
  },
  {
    id: 'engineered',
    label: 'Engineered removals in 2100',
    min: 0,
    max: 10,
    step: 0.5,
    default: 0,
    decimals: 1,
    unitSuffix: ' GtCO2',
    note: 'Bioenergy with carbon capture, direct air capture and the rest, counted here '
      + 'because the four Kaya factors cannot produce a negative number and this slider can.',
    marks: [
      { value: 0, label: 'none', kind: 'observed' },
      { value: 5, label: '5 Gt', kind: 'high' },
    ],
  },
];

const VERY_LOW = MARKER_BY_ID['VL'];
const HIGH = MARKER_BY_ID['H'];
const MEDIUM_LOW = MARKER_BY_ID['ML'];

export const LAND_USE_PAGE: LearnPageSpec = {
  slug: 'land-use',
  input: 'landUse',
  title: 'Land use CO2',
  standfirst: 'One slider sets what forests and farming do to the atmosphere in 2100. It is '
    + 'the smallest of the six terms, the most uncertain, and the only one that can turn '
    + 'negative on its own.',

  definition: {
    quantity: 'Net CO2 from land use, land-use change and forestry in 2100',
    units: 'GtCO2 a year; a negative value removes carbon from the air',
    place: 'Added on top of the four factors that multiply',
    today: `${gt(BASE.landUseGt)} in the tool’s base year`,
    paragraphs: [
      'This term nets two large flows against each other. Clearing forest for cropland and '
      + `pasture releases about ${gt(D.deforestation)}, while forests regrowing on abandoned `
      + `land and in shifting cultivation cycles take up about ${gt(D.regrowth)}. Other `
      + `land-use transitions, peat drainage and peat fire add ${gt(D.otherAndPeat)}.`,
      `The net comes to roughly ${gt(D.net)}, about a tenth of the ${gt(38.6)} from fossil `
      + 'fuels and industry. Its share of the total has fallen for thirty years while fossil '
      + 'emissions grew.',
      `Two large flows netted against each other produce a small number with a large `
      + `uncertainty. The Global Carbon Budget reports ±${C.uncertaintyGtCo2} GtCO2 at one `
      + `standard deviation, which is ${(C.uncertaintyGtCo2 / D.net * 100).toFixed(0)}% of `
      + 'the net figure itself.',
    ],
  },

  chart: {
    heading: 'What the world has done',
    note: 'The band is the published uncertainty, not a range of scenarios.',
    paragraphs: [
      `Land-use CO2 ran ${gt(C.levels.first)} in ${C.firstYear}, peaked at `
      + `${gt(C.levels.peak)} in ${C.levels.peakYear}, and reached ${gt(C.levels.last)} in `
      + `${C.lastYear}. The Global Carbon Budget records a statistically significant decline `
      + 'of about 0.7 GtCO2 per decade since the late 1990s.',
      `The uncertainty swamps the trend in any single year. At ±${C.uncertaintyGtCo2} GtCO2 `
      + 'the band is wide enough to contain both a substantial source and something close to '
      + 'neutral, which is why the scenarios disagree about this term more than about any other.',
      `Two figures from the same project show what that means. The series drawn here averages `
      + `${gt(C.vintageGap.seriesDecadeMean)} over 2014 to 2023, while the Global Carbon `
      + `Budget's own 2024 paper reports ${gt(C.vintageGap.paperDecadeMean)} for that decade. `
      + `The ${(C.vintageGap.seriesDecadeMean - C.vintageGap.paperDecadeMean).toFixed(2)} `
      + 'GtCO2 between them is smaller than the uncertainty on either, and larger than most '
      + 'of what the sliders on this page argue about.',
    ],
    caption: `World land-use CO2, ${C.firstYear} to ${C.lastYear}, with the Global Carbon `
      + `Budget's one-sigma uncertainty of ±${C.uncertaintyGtCo2} GtCO2, then a straight line `
      + 'to the 2100 flux you build below. The seven CMIP7 markers sit as dots at 2100.',
    key: [
      { label: `Record, ${C.firstYear} to ${C.lastYear}`, color: 'var(--ink)' },
      { label: 'Published uncertainty, 1σ', color: 'var(--navy)' },
      { label: 'Your path', color: 'var(--you)' },
      { label: 'CMIP7 markers at 2100', color: 'var(--dim)', dot: true },
    ],
    spec(outcome): PlotSpec {
      const band = data.bands[0];
      if (band === undefined) throw new Error('learn_land_use.json has no band');
      const forward: Point[] = [];
      for (let year = BASE_YEAR; year <= END_YEAR; year += 5) {
        forward.push({
          year,
          value: BASE.landUseGt
            + (outcome.value - BASE.landUseGt) * ((year - BASE_YEAR) / (END_YEAR - BASE_YEAR)),
        });
      }
      return {
        xMin: C.firstYear,
        xMax: END_YEAR,
        xTicks: [C.firstYear, 1985, 2005, 2025, 2050, 2075, END_YEAR],
        yLabel: 'GtCO2 a year',
        yDecimals: 0,
        includeZero: true,
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
            id: 'record',
            label: 'Record',
            points: points(FLUX.years, FLUX.values),
            color: 'var(--ink)',
            width: 2.4,
          },
          {
            id: 'reader',
            label: 'Your path',
            points: forward,
            color: 'var(--you)',
            width: 3.4,
            labelAtEnd: true,
          },
        ],
        points: MARKERS.flatMap((marker) => {
          const value = markerValueFor(marker, 'landUse');
          return value === null ? [] : [{
            id: marker.id,
            label: marker.id,
            year: END_YEAR,
            value,
            color: marker.color,
          }];
        }),
        divider: { year: C.lastYear, label: 'your path' },
      };
    },
  },

  drivers: {
    heading: 'What moves it',
    note: 'Clearing, regrowth, and what turns the term negative.',
    paragraphs: [
      'Agricultural demand drives the clearing. Cropland and pasture expand where forest is '
      + 'cheapest to convert and where the crops pay: soy and cattle in the Amazon, oil palm '
      + 'in insular Asia, subsistence and charcoal in the Congo basin. Those three countries '
      + 'account for more than half of global land-use emissions.',
      'Regrowth runs in the other direction and receives less attention. Farmland abandoned '
      + 'in one place regrows while forest falls in another, and the net is what reaches the '
      + `atmosphere. Regrowth currently offsets two-thirds of the deforestation flux, so the `
      + 'balance can shift without either flow changing much.',
      'For the term to turn negative, three things have to happen together: clearing has to '
      + 'stop almost entirely, regrowth has to continue or expand on the land already '
      + 'recovering, and new land has to come into forest at scale. The arithmetic below '
      + 'makes the size of that requirement explicit.',
      `Engineered removal sits alongside those. In this tool it belongs on this slider, `
      + 'because a product of four positive factors cannot go below zero however fast the '
      + 'fuel mix changes. Every CMIP7 marker that reaches net negative CO2 does it through '
      + 'terms that land on this line.',
    ],
  },

  markers: {
    heading: 'What the CMIP7 markers assume',
    note: 'From a large sink to a modest source.',
    paragraphs: [
      `The markers run from ${signedGt(MEDIUM_LOW?.kaya.landUse ?? 0)} in MEDIUM-to-LOW, the `
      + `largest sink of the seven, to ${signedGt(HIGH?.kaya.landUse ?? 0)} in HIGH, which `
      + `stays a source. VERY LOW assumes ${signedGt(VERY_LOW?.kaya.landUse ?? 0)}.`,
      `A sink of ${signedGt(MEDIUM_LOW?.kaya.landUse ?? 0)} asks this term to move by `
      + `${gt(BASE.landUseGt - (MEDIUM_LOW?.kaya.landUse ?? 0))} from where it stands, which `
      + 'exceeds the entire gross deforestation flux. Reaching it requires the removals as '
      + 'well as the halt.',
      'The tool draws a straight line from today to whatever you set for 2100, because the '
      + 'markers publish their land-use assumption as a 2100 value rather than a path. A real '
      + 'scenario would bend.',
    ],
  },

  builder: {
    heading: 'Build your value',
    note: 'Three flows and a removal, netted.',
    paragraphs: [
      'Set what the world clears, what regrows, how much land comes back into forest and how '
      + 'much carbon engineering removes. The builder nets them into a single 2100 flux.',
      `The restoration arithmetic is area times rate: a million hectares taking up `
      + `${C.growthRates.matureTropical} tonnes of CO2 a hectare each year removes `
      + `${(C.growthRates.matureTropical / 1000).toFixed(3)} GtCO2 a year. Reaching a gigatonne `
      + `at that rate needs ${Math.round(1000 / C.growthRates.matureTropical)} Mha, and at the `
      + `young-forest rate of ${C.growthRates.youngTropicalSouthAmerica}, `
      + `${Math.round(1000 / C.growthRates.youngTropicalSouthAmerica)} Mha.`,
      'Every figure here carries the uncertainty on the line above it. Treat the result as an '
      + 'accounting of what a scenario requires rather than as a measurement.',
    ],
    action: 'Use this flux in my scenario',
    modes: [{
      id: 'flows',
      label: 'By flow',
      parts: PARTS,
      combine(values) {
        const sources = (D.deforestation + D.otherAndPeat) * ((values['deforestation'] ?? 100) / 100);
        const regrowth = D.regrowth * ((values['regrowth'] ?? 100) / 100);
        const restored = ((values['area'] ?? 0) * (values['rate'] ?? C.growthRates.matureTropical))
          / 1000;
        const engineered = values['engineered'] ?? 0;
        const net = sources - regrowth - restored - engineered;
        return {
          value: net,
          headline: `${signedGt(net)} in 2100`,
          detail: [
            `Sources ${gt(sources)}, less ${gt(regrowth)} of existing regrowth`,
            restored === 0
              ? 'No newly restored land'
              : `${Math.round(values['area'] ?? 0)} Mha restored at `
                + `${(values['rate'] ?? 0).toFixed(1)} tCO2 a hectare removes ${gt(restored)}`,
            engineered === 0
              ? 'No engineered removal'
              : `Engineered removal takes ${gt(engineered)}`,
            net < 0
              ? `A net sink, ${gt(Math.abs(net - BASE.landUseGt))} below today's `
                + `${gt(BASE.landUseGt)}`
              : `Still a source, ${gt(Math.abs(net - BASE.landUseGt))} `
                + `${net > BASE.landUseGt ? 'above' : 'below'} today's ${gt(BASE.landUseGt)}`,
          ],
        };
      },
    }],
  },

  sources: [
    {
      title: 'Global Carbon Budget 2024',
      publisher: 'Friedlingstein and colleagues, Earth System Science Data 17',
      vintage: '2025',
      url: 'https://doi.org/10.5194/essd-17-965-2025',
      used: 'The net land-use flux and its ±0.7 GtC uncertainty at one standard deviation, '
        + 'the 1.7 GtC of gross deforestation and 1.2 GtC of regrowth for 2014 to 2023, and '
        + 'the finding that Brazil, Indonesia and the Democratic Republic of the Congo '
        + 'contribute more than half the world total.',
    },
    {
      title: 'Global Carbon Budget data, as redistributed by Our World in Data',
      publisher: 'Global Carbon Project and Our World in Data',
      vintage: 'accessed 2026',
      url: 'https://github.com/owid/co2-data',
      used: 'The annual land-use CO2 series drawn on the chart, 1965 to 2024.',
    },
    {
      title: '2006 IPCC Guidelines for National Greenhouse Gas Inventories, Volume 4 '
        + '(AFOLU), Chapter 4, Tables 4.3 and 4.9',
      publisher: 'Intergovernmental Panel on Climate Change, National Greenhouse Gas '
        + 'Inventories Programme',
      vintage: '2006',
      url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/'
        + 'V4_04_Ch4_Forest_Land.pdf',
      used: 'Above-ground biomass growth in natural forests, 3.1 to 13 tonnes of dry matter a '
        + 'hectare a year depending on ecozone and stand age, and the 0.47 carbon fraction '
        + 'used to convert it.',
    },
    {
      title: 'Natural climate solutions',
      publisher: 'Griscom and colleagues, PNAS 114(44)',
      vintage: '2017',
      url: 'https://doi.org/10.1073/pnas.1710465114',
      used: 'The maximum potential of land-based mitigation, 23.8 PgCO2e a year with food and '
        + 'biodiversity safeguards, of which about half counts as cost-effective.',
    },
    {
      title: 'Mapping carbon accumulation potential from global natural forest regrowth',
      publisher: 'Cook-Patton and colleagues, Nature 585',
      vintage: '2020',
      url: 'https://doi.org/10.1038/s41586-020-2686-x',
      used: 'The hundred-fold variation in regrowth rates across the world, and the finding '
        + 'that IPCC default rates understate above-ground accumulation by about a third on '
        + 'average.',
    },
    {
      title: 'Agriculture, Forestry and Other Land Uses (Chapter 7, IPCC AR6 Working Group III)',
      publisher: 'Intergovernmental Panel on Climate Change',
      vintage: '2022',
      url: 'https://doi.org/10.1017/9781009157926.009',
      used: 'The mitigation potential of halting deforestation, restoring forest and managing '
        + 'land, and how the scenarios reach a negative land-use term.',
    },
  ],
};

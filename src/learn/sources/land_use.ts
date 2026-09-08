import type { Source } from '../types.js';

/** Everything the land use page cites. */
export const LAND_USE_SOURCES: readonly Source[] = [
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
    used: 'The annual land-use CO₂ series drawn on the chart, 1965 to 2024.',
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
    used: 'The maximum potential of land-based mitigation, 23.8 PgCO₂e a year with food and '
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
];

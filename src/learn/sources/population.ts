import type { Source } from '../types.js';

/** Everything the population page cites. */
export const POPULATION_SOURCES: readonly Source[] = [
  {
    title: 'World Population Prospects 2024, Total Population by Sex (standard projections)',
    publisher: 'UN Department of Economic and Social Affairs, Population Division',
    vintage: '2024 revision, file dated 13 December 2024',
    url: 'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)'
      + '/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz',
    used: 'World estimates 1950 to 2023, the medium projection to 2100, the low, high, '
      + 'momentum and constant-fertility variants, the 95% prediction interval, the '
      + 'projected peak, and the seven regional totals the builder adds up.',
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
    title: 'Fertility, mortality, migration, and population scenarios for 195 countries '
      + 'and territories from 2017 to 2100: a forecasting analysis for the Global Burden '
      + 'of Disease Study',
    publisher: 'Vollset and colleagues, The Lancet 396(10258)',
    vintage: '2020',
    url: 'https://doi.org/10.1016/S0140-6736(20)30677-2',
    used: 'The IHME reference forecast: a peak of 9.73 billion in 2064 and 8.79 billion in '
      + '2100 with a 95% interval of 6.83 to 11.8, and a 2100 world fertility of 1.66.',
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
    used: 'The probabilistic projection of a later peak than earlier estimates gave.',
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
];

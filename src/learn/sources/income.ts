import type { Source } from '../types.js';

/** Everything the income page cites. */
export const INCOME_SOURCES: readonly Source[] = [
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
    used: 'Which economies count as high, middle and low income. The build applies the '
      + 'current classification across the whole record, so no country moves group '
      + 'mid-series.',
  },
  {
    title: 'Maddison-style estimates of the evolution of the world economy: A new 2023 update',
    publisher: 'Bolt and van Zanden, Journal of Economic Surveys 39(2)',
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
];

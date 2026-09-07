import type { Source } from '../types.js';

/** Everything the energy intensity page cites. */
export const ENERGY_INTENSITY_SOURCES: readonly Source[] = [
  {
    title: 'Statistical Review of World Energy 2026',
    publisher: 'Energy Institute',
    vintage: '2026 edition, data to 2024',
    url: 'https://www.energyinst.org/statistical-review',
    used: 'World primary energy supply, 1965 to 2024, in exajoules.',
  },
  {
    title: 'GDP, PPP (constant 2021 international $), indicator NY.GDP.MKTP.PP.KD',
    publisher: 'World Bank, International Comparison Program',
    vintage: 'accessed 2026',
    url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD',
    used: 'World output from 1990 onward, the denominator of the intensity series and the '
      + 'basis every rate on this page measures against.',
  },
  {
    title: 'Maddison-style estimates of the evolution of the world economy: A new 2023 update',
    publisher: 'Bolt and van Zanden, Journal of Economic Surveys 39(2)',
    vintage: '2024, database release 2023',
    url: 'https://doi.org/10.1111/joes.12618',
    used: 'World output before 1990, used only for its growth rates, which carry the World '
      + 'Bank level back to 1965.',
  },
  {
    title: 'Decomposition analysis for policymaking in energy: which is the preferred method?',
    publisher: 'Ang, Energy Policy 32(9)',
    vintage: '2004',
    url: 'https://doi.org/10.1016/S0301-4215(03)00076-4',
    used: 'The index methods that separate efficiency from structural change and sectoral '
      + 'mix inside a change in energy intensity.',
  },
  {
    title: 'Energy and Economic Growth: The Stylized Facts',
    publisher: 'Csereklyei, Rubio-Varas and Stern, The Energy Journal 37(2)',
    vintage: '2016',
    url: 'https://doi.org/10.5547/01956574.37.2.zcse',
    used: 'The regularity of energy intensity decline across countries and income levels.',
  },
  {
    title: 'The role of energy in economic growth',
    publisher: 'Stern, Annals of the New York Academy of Sciences 1219',
    vintage: '2011',
    url: 'https://doi.org/10.1111/j.1749-6632.2010.05921.x',
    used: 'How energy use and output move together, and what breaks the link between them.',
  },
  {
    title: 'Emissions Trends and Drivers (Chapter 2, IPCC AR6 Working Group III)',
    publisher: 'Intergovernmental Panel on Climate Change',
    vintage: '2022',
    url: 'https://doi.org/10.1017/9781009157926.004',
    used: 'The Kaya decomposition of recorded emissions growth, including the shares '
      + 'energy intensity and carbon intensity each supplied.',
  },
];

import type { Source } from '../types.js';

/** Everything the methane page cites. */
export const METHANE_SOURCES: readonly Source[] = [
  {
    title: 'EDGAR: Emissions Database for Global Atmospheric Research, 2024 GHG release',
    publisher: 'European Commission, Joint Research Centre',
    vintage: '2024 release, CH4 by country and sector 1970 to 2023',
    url: 'https://edgar.jrc.ec.europa.eu/dataset_ghg2024',
    used: 'Anthropogenic methane by IPCC 2006 sector, summed to world totals and grouped '
      + 'into the five sources on this page.',
  },
  {
    title: 'Global Methane Budget 2000–2020',
    publisher: 'Saunois and colleagues, Earth System Science Data 17',
    vintage: '2025',
    url: 'https://doi.org/10.5194/essd-17-1873-2025',
    used: 'Total emissions of 575 Tg a year for 2010 to 2019, of which 369 Tg from direct '
      + 'anthropogenic sources; wetlands and inland fresh water at 248 Tg; and the finding '
      + 'that anthropogenic methane has tracked the minimal-mitigation scenarios since 2012.',
  },
  {
    title: 'Short-lived Climate Forcers (Chapter 6, IPCC AR6 Working Group I)',
    publisher: 'Intergovernmental Panel on Climate Change',
    vintage: '2021',
    url: 'https://doi.org/10.1017/9781009157896.008',
    used: 'The atmospheric lifetime of methane, and what a 2100 level means for a gas that '
      + 'leaves the atmosphere within a couple of decades.',
  },
  {
    title: 'Global Carbon and Other Biogeochemical Cycles and Feedbacks (Chapter 5, IPCC '
      + 'AR6 Working Group I)',
    publisher: 'Intergovernmental Panel on Climate Change',
    vintage: '2021',
    url: 'https://doi.org/10.1017/9781009157896.007',
    used: 'The methane budget inside the wider carbon cycle, including the natural sources '
      + 'this slider does not cover.',
  },
  {
    title: 'The Shared Socioeconomic Pathways and their energy, land use, and greenhouse '
      + 'gas emissions implications: An overview',
    publisher: 'Riahi and colleagues, Global Environmental Change 42',
    vintage: '2017',
    url: 'https://doi.org/10.1016/j.gloenvcha.2016.05.009',
    used: 'How the marker scenarios set methane alongside their CO₂ assumptions.',
  },
  {
    title: 'Global Methane Pledge',
    publisher: 'European Commission and the United States, with more than 150 participants',
    vintage: 'launched 2021',
    url: 'https://www.globalmethanepledge.org/',
    used: 'The 30% reduction by 2030 against 2020 that participants have signed, for '
      + 'comparison with what these controls imply.',
  },
];

import type { Source } from '../types.js';

/** Everything the timing page cites. */
export const TIMING_SOURCES: readonly Source[] = [
  {
    title: 'Statistical Review of World Energy 2026',
    publisher: 'Energy Institute',
    vintage: '2026 edition, data to 2024',
    url: 'https://www.energyinst.org/statistical-review',
    used: 'World primary energy and the fuel mix behind it, 1965 to 2024, which give the '
      + 'observed paths of energy per dollar and CO₂ per unit of energy this page measures '
      + 'the timing of.',
  },
  {
    title: 'World Development Indicators: GDP, PPP (constant 2021 international $)',
    publisher: 'World Bank',
    vintage: 'accessed 2026',
    url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD',
    used: 'The denominator in energy per dollar, so this control times the same improvement '
      + 'the slider above sets.',
  },
  {
    title: 'The Scenario Model Intercomparison Project for CMIP7 (ScenarioMIP-CMIP7)',
    publisher: 'Van Vuuren and colleagues, Geoscientific Model Development 19',
    vintage: '2026',
    url: 'https://doi.org/10.5194/gmd-19-2627-2026',
    used: 'The marker scenarios whose published CO₂ paths give each preset its timing '
      + 'value, fitted in scripts/build_carried_data.py.',
  },
  {
    title: 'Dangerous assumptions',
    publisher: 'Pielke Jr., Wigley and Green, Nature 452',
    vintage: '2008',
    url: 'https://doi.org/10.1038/452531a',
    used: 'The argument for reading a scenario’s assumed rate of technological change as an '
      + 'explicit quantity rather than an implicit one.',
  },
];

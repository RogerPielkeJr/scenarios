import type { Source } from '../types.js';

/** Everything the removal page cites. */
export const REMOVAL_SOURCES: readonly Source[] = [
  {
    title: 'The State of Carbon Dioxide Removal, executive summary',
    publisher: 'Smith and colleagues, University of Oxford and partners',
    vintage: 'June 2026 edition',
    url: 'https://www.stateofcdr.org/',
    used: 'Removal running today and its split between conventional and novel methods, the '
      + 'growth rate of the novel ones, the 2030 project pipeline, country pledges for 2030, '
      + 'and how far assessed scenarios scale novel removal by 2050. Parsed from the summary '
      + 'by scripts/build_removal.py rather than retyped.',
  },
  {
    title: 'The Scenario Model Intercomparison Project for CMIP7 (ScenarioMIP-CMIP7)',
    publisher: 'Van Vuuren and colleagues, Geoscientific Model Development 19',
    vintage: '2026',
    url: 'https://doi.org/10.5194/gmd-19-2627-2026',
    used: 'The marker scenarios, two of which end the century below zero, and whose published '
      + 'CO₂ paths give each preset its own 2100 removal level.',
  },
  {
    title: 'Global Carbon Budget 2024',
    publisher: 'Friedlingstein and colleagues, Earth System Science Data 17',
    vintage: '2025',
    url: 'https://doi.org/10.5194/essd-17-965-2025',
    used: 'Gross fossil and land-use CO₂, for the comparison between what removal takes back '
      + 'and what the world emits.',
  },
  {
    title: 'Carbon Dioxide Removal (Chapter 12, IPCC AR6 Working Group III)',
    publisher: 'Intergovernmental Panel on Climate Change',
    vintage: '2022',
    url: 'https://doi.org/10.1017/9781009157926.014',
    used: 'The assessment of removal methods, their limits, and why scenarios reaching net '
      + 'zero and beyond rely on them.',
  },
];

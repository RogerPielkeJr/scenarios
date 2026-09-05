import type { Source } from '../types.js';

/** Everything the carbon intensity page cites. */
export const CARBON_INTENSITY_SOURCES: readonly Source[] = [
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
];

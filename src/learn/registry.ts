import type { InputId } from '../model/types.js';

/**
 * The eight Learn More pages. One list, read by the /learn/ index, by the
 * sibling navigation at the foot of every page, by the top page's links and
 * by the tests, so nothing can name a page the others have not heard of.
 */
export interface LearnEntry {
  slug: string;
  input: InputId;
  /** The page title, and the factor's name in the identity graphic. */
  title: string;
  /** The wording of the link on the top page. */
  linkText: string;
  /** One line for the /learn/ index. */
  summary: string;
  status: 'live' | 'forthcoming';
}

export const LEARN_ENTRIES: readonly LearnEntry[] = [
  {
    slug: 'population',
    input: 'population',
    title: 'Population',
    linkText: 'Learn more about population',
    summary: 'Momentum, falling fertility, and why almost all remaining growth '
      + 'happens in sub-Saharan Africa.',
    status: 'live',
  },
  {
    slug: 'income',
    input: 'income',
    title: 'Income per person',
    linkText: 'Learn more about income per person',
    summary: 'What 75 years of compounding does, and how the models tie income '
      + 'to energy demand.',
    status: 'live',
  },
  {
    slug: 'energy-intensity',
    input: 'energyPerDollar',
    title: 'Energy per dollar',
    linkText: 'Learn more about energy per dollar',
    summary: 'Efficiency, structural change and sectoral mix, and the term that '
      + 'has carried most of the decarbonisation on record.',
    status: 'live',
  },
  {
    slug: 'carbon-intensity',
    input: 'co2PerEnergy',
    title: 'CO₂ per unit of energy',
    linkText: 'Learn more about CO₂ per unit of energy',
    summary: 'The fuel mix, and the arithmetic of adding zero-carbon supply '
      + 'while total energy grows.',
    status: 'live',
  },
  {
    slug: 'land-use',
    input: 'landUse',
    title: 'Land use CO₂',
    linkText: 'Learn more about land use CO₂',
    summary: 'Deforestation minus regrowth, why nobody knows the number precisely, '
      + 'and what turns the term negative.',
    status: 'live',
  },
  {
    slug: 'methane',
    input: 'methane',
    title: 'Methane',
    linkText: 'Learn more about methane',
    summary: 'A short-lived gas, five sources, and the difference between a '
      + 'level target and a rate target.',
    status: 'live',
  },
  {
    slug: 'timing',
    input: 'improvementTiming',
    title: 'When the improvement arrives',
    linkText: 'Learn more about when the improvement arrives',
    summary: 'Why the route matters as much as the destination, and how the world '
      + 'has actually timed its two technology factors.',
    status: 'live',
  },
  {
    slug: 'removal',
    input: 'removals',
    title: 'Engineered CO₂ removal',
    linkText: 'Learn more about engineered removal',
    summary: 'The one term that can take a path below zero, what runs today, and how '
      + 'far the deep scenarios scale it.',
    status: 'live',
  },
];

export const LEARN_BY_INPUT: Readonly<Partial<Record<InputId, LearnEntry>>> = Object.freeze(
  Object.fromEntries(LEARN_ENTRIES.map((entry) => [entry.input, entry])),
);

export const LEARN_BY_SLUG: Readonly<Record<string, LearnEntry>> = Object.freeze(
  Object.fromEntries(LEARN_ENTRIES.map((entry) => [entry.slug, entry])),
);

/** The entry for one input, but only once its page exists. */
export function liveEntryFor(input: InputId): LearnEntry | null {
  const entry = LEARN_BY_INPUT[input];
  return entry !== undefined && entry.status === 'live' ? entry : null;
}

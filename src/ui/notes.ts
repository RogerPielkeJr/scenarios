import { BOUNDS, HIGH_EFFICIENCY_RATIO, type ScenarioFlags } from '../model/flags.js';
import { ANALOGUE_META } from '../model/analogue.js';
import { BOUND_RATES } from '../model/observed.js';
import { UN_2024 } from '../model/population.js';
import { EMULATOR_FORM } from '../model/emulator.js';
import { thousands } from '../format.js';

const you = (text: string) => `<b class="you">${text}</b>`;

/** How your rate compares with the observed one, in words. */
function multiple(ratio: number | null, wrongSign: string): string {
  if (ratio === null) return wrongSign;
  return ratio > 0 ? `${you(`${ratio.toFixed(2)}×`)} ` : `${you(wrongSign)} `;
}

function comparisonSentence(flags: ScenarioFlags): string {
  const efficiency = multiple(flags.efficiencyRatio, 'the wrong sign for');
  const fuelMix = multiple(flags.fuelMixRatio, 'the wrong sign for');
  const income = multiple(flags.incomeRatio, 'a decline against');
  return `<p>You have set the energy each dollar needs improving at ${efficiency}`
    + `the observed rate, the fuel mix at ${fuelMix}it, and income growth at ${income}it.</p>`;
}

const COHERENCE_PHRASES: Record<keyof ScenarioFlags['coherence'], string> = {
  fastFuelMixSlowEfficiency:
    'a fuel mix changing faster than any scenario while the energy each dollar needs barely moves',
  fastEfficiencyStaticFuelMix:
    'energy use improving faster than any scenario while the fuel mix stands still',
  stagnantEconomyFastEfficiency:
    'a stagnant economy that still modernises its energy use faster than any scenario',
  largeSinkUnchangedFuelMix:
    'a large land sink alongside an unchanged fuel mix, which no marker pairs together',
};

export function renderNotes(container: HTMLElement, flags: ScenarioFlags): void {
  const parts: string[] = [];
  parts.push(comparisonSentence(flags));

  if (flags.populationOutsideUn === 'above') {
    parts.push(`<p>Your population sits above the top of the UN's 95% range of `
      + `${UN_2024.hi95} billion. Only SSP3, which carries CMIP7 HIGH, goes there.</p>`);
  }
  if (flags.populationOutsideUn === 'below') {
    parts.push(`<p>Your population sits below the bottom of the UN's 95% range of `
      + `${UN_2024.lo95} billion, where SSP1 and SSP5 also sit.</p>`);
  }
  if (flags.efficiencySlowerThanRecord) {
    parts.push('<p>No sustained period on record shows the energy needed per dollar '
      + `improving this slowly. CMIP7 HIGH assumes ${HIGH_EFFICIENCY_RATIO.toFixed(2)}× `
      + 'the observed rate.</p>');
  }
  if (flags.fuelMixFasterThanAnyScenario) {
    parts.push('<p>The fuel mix has never changed this fast. CMIP7 MEDIUM assumes about '
      + 'four times the observed rate and the low scenarios assume more.</p>');
  }
  if (flags.aboveSlowBound) {
    parts.push(`<p>Above ${thousands(BOUNDS.slow)} GtCO2 you have passed the highest total `
      + 'reachable with every technological trajectory held at the slowest rate the world '
      + 'has recorded.</p>');
  }
  if (flags.belowFastBound) {
    parts.push(`<p>Below ${thousands(BOUNDS.fast)} GtCO2 you have passed the lowest total `
      + 'reachable with every technological trajectory at its fastest recorded rate.</p>');
  }
  if (flags.markerPresetGap !== null) {
    const { label, gapGt } = flags.markerPresetGap;
    const direction = gapGt > 0 ? 'above' : 'below';
    parts.push(`<p>These are the Kaya factors CMIP7 ${label} reports, but running them `
      + `forward lands ${thousands(Math.abs(gapGt))} GtCO2 ${direction} that scenario's own `
      + 'total. The four factors here have no term for engineered carbon removal, which the '
      + 'low scenarios rely on, so a scenario that removes carbon cannot be rebuilt from them.</p>');
  }

  const incoherent = (Object.keys(COHERENCE_PHRASES) as Array<keyof ScenarioFlags['coherence']>)
    .filter((key) => flags.coherence[key])
    .map((key) => COHERENCE_PHRASES[key]);
  if (incoherent.length > 0) {
    parts.push(`<p>Worth a second look: you have set ${incoherent.join(', and ')}. `
      + 'No CMIP7 marker combines these, which does not make it impossible, only '
      + 'unexamined.</p>');
  }

  parts.push('<p><b>How this is worked out.</b> Emissions come from four factors multiplied '
    + 'together: how many people, how much each of them earns, how much energy each dollar of '
    + 'that income needs, and how much carbon each unit of energy carries. Economists call the '
    + 'middle two energy intensity and carbon intensity. Land use CO2 is added on top from its '
    + 'own slider. The four cover fossil and industrial CO2, cement included, so they count '
    + 'the same emissions the CMIP7 scenarios count.</p>');

  parts.push('<p><b>What the warming figure is.</b> A curve fitted to FaIR runs of the seven '
    + 'CMIP7 markers, so treat it as indicative rather than a model result. It reads the total '
    + 'CO2 you emit and your methane, and nothing else, which means two paths reaching the same '
    + 'total give the same answer however differently they got there. Methane adds about '
    + `0.12 °C per 100 Mt a year. The form is ${EMULATOR_FORM}.</p>`);

  parts.push(`<p><b>The two technology bounds.</b> Jesse Ausubel argued in 1995 that `
    + 'technological trajectories move at rates steady enough to bound the future, and that a '
    + 'scenario halting them describes technical regression rather than business as usual. '
    + 'These two presets take him at his word. <b>Slowest technical progress</b> holds every '
    + 'trajectory at the slowest sustained rate on record: the energy each dollar needs '
    + `improving ${Math.abs(BOUND_RATES.slowestEfficiency.value).toFixed(2)}% a year, the `
    + `weakest ${BOUND_RATES.slowestEfficiency.window} window, and the fuel mix `
    + `${Math.abs(BOUND_RATES.slowestFuelMix.value).toFixed(2)}% a year, the weakest `
    + `${BOUND_RATES.slowestFuelMix.window} window. Income grows at the fastest observed rate and `
    + 'population reaches the top of the UN range, so emissions run as high as slow technology '
    + `permits, about ${thousands(BOUNDS.slow)} GtCO2. <b>Ausubel methane economy</b> uses his `
    + 'own 1988 published trajectory, which squeezes carbon out of primary energy to 0.06 tonnes '
    + 'of carbon per kilowatt-year by 2100, implying the fuel mix improving 2.79% a year, with '
    + `the energy each dollar needs at its fastest observed rate of `
    + `${Math.abs(BOUND_RATES.fastestEfficiency.value).toFixed(2)}% a year and income still growing at the `
    + `historical pace, about ${thousands(BOUNDS.fast)} GtCO2. Neither bound assumes poverty, `
    + 'and neither assumes a technology stops working.</p>');

  parts.push(`<p><b>Sources.</b> Observed rates come from the Energy Institute Statistical `
    + 'Review and the World Bank. Fossil and industrial CO2 for the base year comes from the '
    + `Global Carbon Budget. The country comparison uses ${ANALOGUE_META.year} CO2 over World `
    + `Bank purchasing-power GDP for ${ANALOGUE_META.count} economies. Analysis by Roger `
    + 'Pielke Jr., The Honest Broker.</p>');

  container.innerHTML = parts.join('');
}

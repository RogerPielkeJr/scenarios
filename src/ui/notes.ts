import { BOUNDS, HIGH_EFFICIENCY_RATIO,
  type MarkerFidelity, type ScenarioFlags } from '../model/flags.js';
import { ANALOGUE_META } from '../model/analogue.js';
import { BOUND_RATES } from '../model/observed.js';
import { UN_2024 } from '../model/population.js';
import { EMULATOR_FORM, METHANE } from '../model/emulator.js';
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

/**
 * How far a CMIP7 preset lands from the marker it names, with the reason.
 *
 * The endpoint and the century total fail in different ways and for different
 * reasons: a constant rate can hit the marker's 2100 emissions and still
 * accumulate a very different total on the way there. Both numbers go on the
 * page, computed rather than asserted.
 */
function fidelitySentence(fit: MarkerFidelity, showingPublished: boolean): string {
  const gt = (value: number) => `${value.toFixed(1)} GtCO2`;
  const sentences: string[] = showingPublished
    ? [
      `<b>This sits on CMIP7 ${fit.label}.</b> The chart draws a reconstruction from the `
      + `six Kaya factors ${fit.label} reports, and picks out ${fit.label} itself among the `
      + 'markers behind it. The tiles report the reconstruction, with the published figure '
      + 'beside it.',
    ]
    : [
      `<b>Against the published CMIP7 ${fit.label}.</b> These sliders carry the Kaya `
      + `factors ${fit.label} reports.`,
    ];

  const lead = showingPublished ? 'That reconstruction' : 'Compounding them from 2025';
  const closeEnd = !fit.markerGoesNegative && Math.abs(fit.endPercent) < 5;
  sentences.push(closeEnd
    ? `${lead} reaches ${gt(fit.ourEndGt)} in 2100, within `
      + `${Math.abs(fit.endPercent).toFixed(0)}% of ${fit.label}'s own ${gt(fit.markerEndGt)}.`
    : `${lead} reaches ${gt(fit.ourEndGt)} in 2100 against `
      + `${fit.label}'s ${gt(fit.markerEndGt)}.`);

  const percent = Math.abs(fit.cumulativePercent);
  sentences.push(percent < 3
    ? `The two century totals agree within ${percent.toFixed(0)}%, `
      + `${thousands(fit.ourCumulativeGt)} against ${thousands(fit.markerCumulativeGt)} GtCO2.`
    : `Over the century this path totals ${thousands(fit.ourCumulativeGt)} GtCO2 against `
      + `${thousands(fit.markerCumulativeGt)}, ${percent.toFixed(0)}% `
      + `${fit.cumulativePercent > 0 ? 'above' : 'below'} it.`);

  if (Math.abs(fit.ourMidGt - fit.markerMidGt) > 2) {
    sentences.push(`A steady rate spreads one improvement evenly across 75 years, while `
      + `${fit.label} bends: in ${fit.midYear} the reconstruction emits ${gt(fit.ourMidGt)} where `
      + `${fit.label} emits ${gt(fit.markerMidGt)}.`);
  }
  if (fit.markerGoesNegative) {
    sentences.push(`${fit.label} also removes more CO2 than it emits before 2100. Four `
      + 'factors multiplied together stay positive, so the fossil term here cannot turn '
      + 'negative and only the land use slider can pull a path below zero.');
  }
  sentences.push(`The chart draws ${fit.label}'s published path behind yours.`);
  return `<p>${sentences.join(' ')}</p>`;
}

export function renderNotes(container: HTMLElement, flags: ScenarioFlags): void {
  const parts: string[] = [];
  parts.push(comparisonSentence(flags));

  if (flags.populationOutsideUn === 'above') {
    parts.push(`<p>Your population rises above the top of the UN's 95% range of `
      + `${UN_2024.hi95} billion. Only SSP3, which carries CMIP7 HIGH, goes there.</p>`);
  }
  if (flags.populationOutsideUn === 'below') {
    parts.push(`<p>Your population falls below the bottom of the UN's 95% range of `
      + `${UN_2024.lo95} billion, which SSP1 and SSP5 also assume.</p>`);
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
  // Both bounds judge the reconstruction's own total, which the tiles now
  // report whether or not a preset stands, so the bounds apply throughout.
  {
    if (flags.aboveSlowBound) {
      parts.push(`<p>Above ${thousands(BOUNDS.slow)} GtCO2 you have passed the highest total `
        + 'reachable with every technological trajectory held at the slowest rate the world '
        + 'has recorded.</p>');
    }
    if (flags.belowFastBound) {
      parts.push(`<p>Below ${thousands(BOUNDS.fast)} GtCO2 you have passed the lowest total `
        + 'reachable with every technological trajectory at its fastest recorded rate.</p>');
    }
  }
  if (flags.markerFidelity !== null) {
    parts.push(fidelitySentence(flags.markerFidelity, flags.showingPublished));
  }

  const incoherent = (Object.keys(COHERENCE_PHRASES) as Array<keyof ScenarioFlags['coherence']>)
    .filter((key) => flags.coherence[key])
    .map((key) => COHERENCE_PHRASES[key]);
  if (incoherent.length > 0) {
    parts.push(`<p>Worth a second look: you have set ${incoherent.join(', and ')}. `
      + 'No CMIP7 marker combines these, which does not make it impossible, only '
      + 'unexamined.</p>');
  }

  parts.push('<p><b>How the tool works this out.</b> Emissions come from four factors '
    + 'multiplied '
    + 'together: how many people, how much each of them earns, how much energy each dollar of '
    + 'that income needs, and how much carbon each unit of energy carries. Economists call the '
    + 'middle two energy intensity and carbon intensity. Land use CO2 joins them from its '
    + 'own slider. The four cover fossil and industrial CO2, cement included, so they count '
    + 'the same emissions the CMIP7 scenarios count.</p>');

  parts.push('<p><b>Where the warming figure comes from.</b> A curve fitted to FaIR runs of '
    + 'the seven CMIP7 markers, so treat it as indicative rather than as a model result. It reads the total '
    + 'CO2 you emit and your methane, and nothing else, which means two paths reaching the same '
    + 'total give the same answer however differently they got there. Methane adds about '
    + `${(METHANE.k * 100).toFixed(2)} °C per 100 Mt a year. It takes the form `
    + `${EMULATOR_FORM}.</p>`);

  parts.push(`<p><b>The two technology bounds.</b> Jesse Ausubel argued in 1995 that `
    + 'technological trajectories move at rates steady enough to bound the future, and that a '
    + 'scenario halting them describes technical regression rather than business as usual. '
    + 'These two presets take him at his word. <b>Slowest technical progress</b> holds every '
    + 'trajectory at the slowest sustained rate on record: the energy each dollar needs '
    + `improving ${Math.abs(BOUND_RATES.slowestEfficiency.value).toFixed(2)}% a year, the `
    + `weakest ${BOUND_RATES.slowestEfficiency.window} window, and the fuel mix `
    + `${Math.abs(BOUND_RATES.slowestFuelMix.value).toFixed(2)}% a year, the weakest `
    + `${BOUND_RATES.slowestFuelMix.window} window. Income grows at the fastest observed rate and `
    + 'population reaches the top of the UN range, so emissions climb as high as slow technology '
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

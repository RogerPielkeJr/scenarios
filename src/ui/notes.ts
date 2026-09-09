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
    'a fuel mix changing faster than any scenario alongside little change in energy per dollar',
  fastEfficiencyStaticFuelMix:
    'energy per dollar improving faster than any scenario alongside an unchanged fuel mix',
  stagnantEconomyFastEfficiency:
    'flat income per person alongside energy per dollar improving faster than any scenario',
  largeSinkUnchangedFuelMix:
    'a large land sink alongside an unchanged fuel mix, a pair no marker assumes',
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
  const gt = (value: number) => `${value.toFixed(1)} GtCO₂`;
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
      + `${Math.abs(fit.endPercent).toFixed(0)}% of ${fit.label}'s published ${gt(fit.markerEndGt)}.`
    : `${lead} reaches ${gt(fit.ourEndGt)} in 2100 against `
      + `${fit.label}'s ${gt(fit.markerEndGt)}.`);

  const percent = Math.abs(fit.cumulativePercent);
  sentences.push(percent < 3
    ? `The two century totals agree within ${percent.toFixed(0)}%, `
      + `${thousands(fit.ourCumulativeGt)} against ${thousands(fit.markerCumulativeGt)} GtCO₂.`
    : `Over the century this path totals ${thousands(fit.ourCumulativeGt)} GtCO₂ against `
      + `${thousands(fit.markerCumulativeGt)}, ${percent.toFixed(0)}% `
      + `${fit.cumulativePercent > 0 ? 'above' : 'below'} it.`);

  if (Math.abs(fit.ourMidGt - fit.markerMidGt) > 2) {
    sentences.push(`A steady rate spreads one improvement evenly across 75 years, while `
      + `${fit.label} bends: in ${fit.midYear} the reconstruction emits ${gt(fit.ourMidGt)} where `
      + `${fit.label} emits ${gt(fit.markerMidGt)}.`);
  }
  if (fit.markerGoesNegative) {
    sentences.push(`${fit.label} also removes more CO₂ than it emits before 2100. A product `
      + 'of four positive factors stays above zero, so the fossil term here holds above zero '
      + 'and the land use and removal sliders take a path below it.');
  }
  sentences.push(`The chart draws ${fit.label}'s published path behind yours.`);
  return `<p>${sentences.join(' ')}</p>`;
}

export function renderNotes(container: HTMLElement, flags: ScenarioFlags): void {
  const parts: string[] = [];
  parts.push(comparisonSentence(flags));

  if (flags.populationOutsideUn === 'above') {
    parts.push(`<p>Your population rises above the top of the UN's 95% range of `
      + `${UN_2024.hi95} billion. Of the SSPs, only SSP3, the population behind CMIP7 HIGH, `
      + 'goes above that figure.</p>');
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
    parts.push('<p>No period on record shows the fuel mix changing at this rate. CMIP7 '
      + 'MEDIUM assumes about four times the observed rate and the low scenarios more.</p>');
  }
  // Both bounds judge the reconstruction's own total, which the tiles now
  // report whether or not a preset stands, so the bounds apply throughout.
  {
    if (flags.aboveSlowBound) {
      parts.push(`<p>Above ${thousands(BOUNDS.slow)} GtCO₂ this total exceeds the highest `
        + 'reachable with every technological trajectory held at the slowest rate in the '
        + 'record.</p>');
    }
    if (flags.belowFastBound) {
      parts.push(`<p>Below ${thousands(BOUNDS.fast)} GtCO₂ this total falls under the lowest `
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
    parts.push(`<p>This scenario sets ${incoherent.join(', and ')}. `
      + 'No CMIP7 marker combines those settings.</p>');
  }

  parts.push('<p><b>How the tool works this out.</b> Emissions come from four factors '
    + 'multiplied '
    + 'together: how many people, how much each of them earns, how much energy each dollar of '
    + 'that income takes, and how much carbon each unit of energy emits. Economists call the '
    + 'middle two energy intensity and carbon intensity. Land use CO₂ and engineered removal '
    + 'are added terms with sliders of their own. The four factors cover fossil and '
    + 'industrial CO₂, cement included, so they count the same emissions the CMIP7 scenarios '
    + 'count.</p>');

  parts.push('<p><b>Where the warming figure comes from.</b> A curve fitted to FaIR runs of '
    + 'the seven CMIP7 markers, which makes it indicative rather than a model result. It '
    + 'takes the cumulative CO₂ and the methane, and nothing else, so two paths with the same '
    + 'cumulative total give the same answer. Methane adds about '
    + `${(METHANE.k * 100).toFixed(2)} °C per 100 Mt a year. It takes the form `
    + `${EMULATOR_FORM}.</p>`);

  parts.push(`<p><b>The two technology bounds.</b> Jesse Ausubel argued in 1995 that `
    + 'technological trajectories move at rates steady enough to bound the future, and that a '
    + 'scenario halting them describes technical regression rather than business as usual. '
    + 'These two presets apply that argument. <b>Slowest technical progress</b> holds every '
    + 'trajectory at the slowest sustained rate on record: the energy each dollar needs '
    + `improving ${Math.abs(BOUND_RATES.slowestEfficiency.value).toFixed(2)}% a year, the `
    + `weakest ${BOUND_RATES.slowestEfficiency.window} window, and the fuel mix `
    + `${Math.abs(BOUND_RATES.slowestFuelMix.value).toFixed(2)}% a year, the weakest `
    + `${BOUND_RATES.slowestFuelMix.window} window. Income grows at the fastest observed rate `
    + 'and population sits at the top of the UN range, which gives a cumulative total of '
    + `about ${thousands(BOUNDS.slow)} GtCO₂. <b>Ausubel methane economy</b> uses his `
    + '1988 published trajectory, which takes carbon in primary energy to 0.06 tonnes '
    + 'of carbon per kilowatt-year by 2100, implying the fuel mix improving 2.79% a year, with '
    + `the energy each dollar needs at its fastest observed rate of `
    + `${Math.abs(BOUND_RATES.fastestEfficiency.value).toFixed(2)}% a year and income still growing at the `
    + `historical pace, a cumulative total of about ${thousands(BOUNDS.fast)} GtCO₂. Neither `
    + 'bound assumes poverty, and neither assumes a halt to any technology.</p>');

  parts.push(`<p><b>Sources.</b> Observed rates come from the Energy Institute Statistical `
    + 'Review and the World Bank. Fossil and industrial CO₂ for the base year comes from the '
    + `Global Carbon Budget. The country comparison uses ${ANALOGUE_META.year} CO₂ over World `
    + `Bank purchasing-power GDP for ${ANALOGUE_META.count} economies. Analysis by Roger `
    + 'Pielke Jr., The Honest Broker.</p>');

  container.innerHTML = parts.join('');
}

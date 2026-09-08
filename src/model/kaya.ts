import { BASE, BASE_YEAR, END_YEAR } from './config.js';
import { accumulatedYears, compound, compoundOverYears } from './rates.js';
import { populationAt } from './population.js';
import type { PathPoint, ScenarioInputs, ScenarioPath } from './types.js';
import { at } from './types.js';

/**
 * Land use CO2 in a given year: straight line from today's value to the
 * 2100 value the reader sets.
 *
 * The marker paths carry land use folded into their total CO2 and are not
 * published here as a separate series, so there is no shape to borrow from
 * them. A line is the honest placeholder; see METHODS.md.
 */
function landUseAt(yearsFromBase: number, target2100: number): number {
  const span = END_YEAR - BASE_YEAR;
  return BASE.landUseGt + (target2100 - BASE.landUseGt) * (yearsFromBase / span);
}

/**
 * Engineered CO2 removal in a given year, as a negative number.
 *
 * Removal ramps in as the square of elapsed time rather than as a straight
 * line, which matches how the scenarios deploy it -- close to nothing before
 * the 2040s, then accelerating -- and, just as importantly, keeps it a control
 * of its own. A straight line from zero to the 2100 level would be
 * arithmetically identical to moving the land use slider by the same amount,
 * so it would add a second way to say one thing and no new scenarios.
 */
function removalsAt(yearsFromBase: number, target2100: number): number {
  const span = END_YEAR - BASE_YEAR;
  const fraction = yearsFromBase / span;
  return -Math.abs(target2100) * fraction * fraction;
}

/**
 * The Kaya identity, year by year.
 *
 * CO2 = population * GDP per person * energy per dollar * CO2 per unit of
 * energy, with land use CO2 and engineered removal added as separate terms.
 *
 * The two technology factors compound over `accumulatedYears` rather than over
 * calendar years, which lets the reader move the improvement earlier or later
 * in the century without moving where it ends up in 2100.
 */
export function computePath(inputs: ScenarioInputs): ScenarioPath {
  const points: PathPoint[] = [];
  let cumulativeGt = 0;

  for (let year = BASE_YEAR; year <= END_YEAR; year += 1) {
    const t = year - BASE_YEAR;
    const populationBn = populationAt(year, inputs.population);
    const gdpPerPersonUsd = compound(BASE.gdpPerPersonUsd, inputs.income, t);
    const elapsed = accumulatedYears(t, END_YEAR - BASE_YEAR, inputs.improvementTiming);
    const energyPerDollarMj =
      compoundOverYears(BASE.energyPerDollarMj, inputs.energyPerDollar, elapsed);
    const co2PerEnergyKgGj =
      compoundOverYears(BASE.co2PerEnergyKgGj, inputs.co2PerEnergy, elapsed);

    const gdpUsd = populationBn * 1e9 * gdpPerPersonUsd;
    const energyEj = (gdpUsd * energyPerDollarMj) / 1e12;
    const fossilGt = (energyEj * co2PerEnergyKgGj) / 1000;
    const landUseGt = landUseAt(t, inputs.landUse);
    const removalsGt = removalsAt(t, inputs.removals);
    const co2Gt = fossilGt + landUseGt + removalsGt;

    cumulativeGt += co2Gt;
    points.push({
      year,
      populationBn,
      gdpPerPersonUsd,
      energyEj,
      fossilGt,
      landUseGt,
      removalsGt,
      co2Gt,
      kgCo2PerUsd: (co2PerEnergyKgGj * energyPerDollarMj) / 1000,
    });
  }

  return { points, cumulativeGt, final: at(points, points.length - 1, 'final point') };
}

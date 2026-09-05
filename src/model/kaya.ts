import { BASE, BASE_YEAR, END_YEAR } from './config.js';
import { compound } from './rates.js';
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
 * The Kaya identity, year by year.
 *
 * CO2 = population * GDP per person * energy per dollar * CO2 per unit of
 * energy, with land use CO2 added as a separate term.
 */
export function computePath(inputs: ScenarioInputs): ScenarioPath {
  const points: PathPoint[] = [];
  let cumulativeGt = 0;

  for (let year = BASE_YEAR; year <= END_YEAR; year += 1) {
    const t = year - BASE_YEAR;
    const populationBn = populationAt(year, inputs.population);
    const gdpPerPersonUsd = compound(BASE.gdpPerPersonUsd, inputs.income, t);
    const energyPerDollarMj = compound(BASE.energyPerDollarMj, inputs.energyPerDollar, t);
    const co2PerEnergyKgGj = compound(BASE.co2PerEnergyKgGj, inputs.co2PerEnergy, t);

    const gdpUsd = populationBn * 1e9 * gdpPerPersonUsd;
    const energyEj = (gdpUsd * energyPerDollarMj) / 1e12;
    const fossilGt = (energyEj * co2PerEnergyKgGj) / 1000;
    const landUseGt = landUseAt(t, inputs.landUse);
    const co2Gt = fossilGt + landUseGt;

    cumulativeGt += co2Gt;
    points.push({
      year,
      populationBn,
      gdpPerPersonUsd,
      energyEj,
      fossilGt,
      landUseGt,
      co2Gt,
      kgCo2PerUsd: (co2PerEnergyKgGj * energyPerDollarMj) / 1000,
    });
  }

  return { points, cumulativeGt, final: at(points, points.length - 1, 'final point') };
}

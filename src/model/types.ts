/** The six numbers a reader sets. Everything else is derived from these. */
export interface ScenarioInputs {
  /** World population in 2100, billions. */
  population: number;
  /** Growth in GDP per person, %/yr, compounding from the base year. */
  income: number;
  /** Change in energy needed per dollar, %/yr, compounding. */
  energyPerDollar: number;
  /** Change in CO2 per unit of energy, %/yr, compounding. */
  co2PerEnergy: number;
  /** Land use CO2 in 2100, GtCO2/yr. Negative is a sink. */
  landUse: number;
  /** Methane in 2100, Mt/yr. */
  methane: number;
}

export type InputId = keyof ScenarioInputs;

export const INPUT_IDS: readonly InputId[] = [
  'population', 'income', 'energyPerDollar', 'co2PerEnergy', 'landUse', 'methane',
] as const;

/** One year of a computed path. */
export interface PathPoint {
  year: number;
  /** Population that year, billions. */
  populationBn: number;
  /** GDP per person that year, constant 2021 international dollars. */
  gdpPerPersonUsd: number;
  /** Primary energy that year, EJ. */
  energyEj: number;
  /** Fossil and industrial CO2 from the four Kaya terms, Gt. */
  fossilGt: number;
  /** Land use CO2 that year, Gt. */
  landUseGt: number;
  /** Total CO2 that year, Gt. */
  co2Gt: number;
  /** CO2 per dollar of GDP that year, kg per dollar. Drives the country analogue. */
  kgCo2PerUsd: number;
}

export interface ScenarioPath {
  points: PathPoint[];
  /** Cumulative CO2 over the whole path, Gt. */
  cumulativeGt: number;
  /** The last point, for convenience. Always present. */
  final: PathPoint;
}

/** Throws rather than returning undefined, so a bad index fails loudly. */
export function at<T>(list: readonly T[], index: number, what = 'index'): T {
  const value = list[index];
  if (value === undefined) throw new Error(`${what} ${index} out of range (length ${list.length})`);
  return value;
}

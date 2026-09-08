/** The eight numbers a reader sets. Everything else is derived from these. */
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
  /**
   * Share of the century's technology improvement delivered by 2062, %.
   *
   * The two technology rates above give the total change from the base year to
   * 2100. This says how that change is spread across the years between. 50
   * leaves the annual rate constant, which is what the model did before this
   * input existed; above 50 front-loads it, below 50 defers it. The 2100 level
   * never moves, only the route to it.
   */
  improvementTiming: number;
  /**
   * Engineered CO2 removal in 2100, GtCO2/yr, counted as a positive number.
   *
   * The Kaya terms multiply, so the fossil term approaches zero without ever
   * crossing it, and no combination of the four reaches the net-negative
   * emissions the deep-mitigation scenarios reach. Removal is the separate
   * additive term that gets there, and it ramps in slowly rather than linearly:
   * a linear ramp would be arithmetically identical to moving the land use
   * slider and would tell the reader nothing new.
   */
  removals: number;
}

export type InputId = keyof ScenarioInputs;

export const INPUT_IDS: readonly InputId[] = [
  'population', 'income', 'energyPerDollar', 'co2PerEnergy', 'landUse', 'methane',
  'improvementTiming', 'removals',
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
  /** Engineered removal that year, Gt, as a negative number. */
  removalsGt: number;
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

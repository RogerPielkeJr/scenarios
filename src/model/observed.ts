import observedJson from '../data/observed.json';

export interface RateWindow {
  value: number;
  from: number;
  to: number;
  window: string;
}

export interface WindowExtremes {
  span: number;
  count: number;
  /** Highest CAGR of any window. For the technology terms this is the weakest improvement. */
  max: RateWindow;
  /** Lowest CAGR of any window. For the technology terms this is the strongest improvement. */
  min: RateWindow;
}

export const OBSERVED_META = observedJson.meta;
export const OBSERVED_SERIES = observedJson.series;
export const OBSERVED_FACTORS = observedJson.factors;
export const OBSERVED_RATE_PERIODS = observedJson.rates;
export const OBSERVED_EXTREMES = observedJson.extremes as {
  income_25y: WindowExtremes;
  energy_per_dollar_25y: WindowExtremes;
  carbon_per_energy_30y: WindowExtremes;
};

/** The rates the two technology bounds are built from. */
export const BOUND_RATES = {
  slowestEfficiency: OBSERVED_EXTREMES.energy_per_dollar_25y.max,
  fastestEfficiency: OBSERVED_EXTREMES.energy_per_dollar_25y.min,
  slowestFuelMix: OBSERVED_EXTREMES.carbon_per_energy_30y.max,
  fastestIncome: OBSERVED_EXTREMES.income_25y.max,
};

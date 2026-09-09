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
  /** CO2 from energy over total energy supply: combustion alone. */
  carbon_per_energy_30y: WindowExtremes;
  /** The same on the slider's basis, cement and industrial CO2 included. */
  carbon_per_energy_slider_30y: WindowExtremes;
};

/** The rates the two technology bounds are built from. */
export const BOUND_RATES = {
  slowestEfficiency: OBSERVED_EXTREMES.energy_per_dollar_25y.max,
  fastestEfficiency: OBSERVED_EXTREMES.energy_per_dollar_25y.min,
  // The slider basis, cement and industrial CO2 included, because that is the
  // quantity this bound sets on the CO2-per-energy slider. The combustion
  // series gives -0.17%/yr over 1992-2022 for the same window length, and a
  // bound read off it would describe a narrower quantity than the one it moves.
  slowestFuelMix: OBSERVED_EXTREMES.carbon_per_energy_slider_30y.max,
  fastestIncome: OBSERVED_EXTREMES.income_25y.max,
};

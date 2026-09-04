import analoguesJson from '../data/analogues.json';

export interface Analogue {
  name: string;
  iso3: string;
  co2_mt: number;
  gdp_ppp_bn_usd: number;
  kg_co2_per_usd: number;
}

export const ANALOGUE_META = analoguesJson.meta;
export const ANALOGUES = analoguesJson.countries as readonly Analogue[];

/** Below this the world is cleaner than any economy in the table. */
export const CLEANER_THAN_ANYWHERE = 0.005;

/**
 * The economy whose 2024 CO2 per dollar of GDP is closest to a given value.
 * Returns null when the value is below every country in the table, which is
 * a different statement from "no match found".
 */
export function nearestAnalogue(kgCo2PerUsd: number): Analogue | null {
  if (kgCo2PerUsd <= CLEANER_THAN_ANYWHERE) return null;
  let best: Analogue | null = null;
  let bestDistance = Infinity;
  for (const country of ANALOGUES) {
    const distance = Math.abs(country.kg_co2_per_usd - kgCo2PerUsd);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = country;
    }
  }
  return best;
}

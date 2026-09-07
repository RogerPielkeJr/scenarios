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
 * How far from the reader's value an economy may sit and still stand as the
 * comparison, as a share of that value.
 *
 * Five per cent, because the tile states a likeness and the note prints both
 * numbers under it. Wider bands buy recognisable names at the cost of the
 * claim: at ten per cent a 2100 world at 0.16 kg/$ "looks like" Japan at
 * 0.170, and at fifteen a world at 0.30 looks like China at 0.333.
 */
export const ANALOGUE_BAND = 0.05;

/** The economy whose 2024 CO2 per dollar of GDP sits closest to a value. */
function nearest(kgCo2PerUsd: number): Analogue | null {
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

/**
 * The economy the reader's 2100 world resembles.
 *
 * The largest economy whose CO2 per dollar sits within ANALOGUE_BAND of the
 * reader's, falling back to the nearest of any size when nothing lies that
 * close. Nearest alone kept handing back small economies that happened to sit
 * on the number: a world at 0.126 kg/$ came out as New Zealand, a $256bn
 * economy, when the Netherlands sits at 0.124 with five times the output.
 *
 * Size means GDP, the denominator of the ratio being compared.
 *
 * Returns null when the value is below every country in the table, which is a
 * different statement from "no match found".
 */
export function analogueFor(kgCo2PerUsd: number): Analogue | null {
  if (kgCo2PerUsd <= CLEANER_THAN_ANYWHERE) return null;
  const band = ANALOGUES.filter(
    (country) => Math.abs(country.kg_co2_per_usd - kgCo2PerUsd) <= ANALOGUE_BAND * kgCo2PerUsd,
  );
  if (band.length === 0) return nearest(kgCo2PerUsd);
  return band.reduce((best, country) => {
    if (country.gdp_ppp_bn_usd !== best.gdp_ppp_bn_usd) {
      return country.gdp_ppp_bn_usd > best.gdp_ppp_bn_usd ? country : best;
    }
    // Two economies of the same size: the closer one on the ratio.
    return Math.abs(country.kg_co2_per_usd - kgCo2PerUsd)
      < Math.abs(best.kg_co2_per_usd - kgCo2PerUsd) ? country : best;
  });
}

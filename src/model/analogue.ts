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

/**
 * What the table can say about a 2100 world.
 *
 * `match` is the only one that names a likeness. The other three say there
 * is none, and name the economy at the edge of the table so the reader still
 * has a bearing. Falling back to the nearest economy of any size, which this
 * did until 2026-09-07, put "Switzerland" against a world at 0.011 kg/$ when
 * Switzerland emits 0.043 — four times as much. Three of the eight presets
 * land in that stretch.
 */
export type AnalogueVerdict =
  | { kind: 'match'; country: Analogue }
  /** Below every economy in the table. */
  | { kind: 'cleaner'; nearest: Analogue }
  /** Above every economy in the table. */
  | { kind: 'dirtier'; nearest: Analogue }
  /** Inside the table's range, but in a gap no economy comes within the band of. */
  | { kind: 'gap'; nearest: Analogue };

function nearestOf(kgCo2PerUsd: number, from: readonly Analogue[]): Analogue | null {
  let best: Analogue | null = null;
  let bestDistance = Infinity;
  for (const country of from) {
    const distance = Math.abs(country.kg_co2_per_usd - kgCo2PerUsd);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = country;
    }
  }
  return best;
}

/** Largest by GDP, the denominator of the ratio being compared. */
function largestOf(from: readonly Analogue[], kgCo2PerUsd: number): Analogue {
  return from.reduce((best, country) => {
    if (country.gdp_ppp_bn_usd !== best.gdp_ppp_bn_usd) {
      return country.gdp_ppp_bn_usd > best.gdp_ppp_bn_usd ? country : best;
    }
    // Two economies of the same size: the closer one on the ratio.
    return Math.abs(country.kg_co2_per_usd - kgCo2PerUsd)
      < Math.abs(best.kg_co2_per_usd - kgCo2PerUsd) ? country : best;
  });
}

/**
 * The economy the reader's 2100 world resembles, or the reason there is none.
 *
 * A match is the largest economy whose CO2 per dollar sits within
 * ANALOGUE_BAND of the reader's. Nearest alone kept handing back small
 * economies that happened to sit on the number: a world at 0.126 kg/$ came
 * out as New Zealand, a $256bn economy, when the Netherlands sits at 0.124
 * with five times the output.
 */
export function analogueFor(kgCo2PerUsd: number): AnalogueVerdict | null {
  if (ANALOGUES.length === 0) return null;
  const cleanest = ANALOGUES.reduce((a, b) => (a.kg_co2_per_usd <= b.kg_co2_per_usd ? a : b));
  const dirtiest = ANALOGUES.reduce((a, b) => (a.kg_co2_per_usd >= b.kg_co2_per_usd ? a : b));

  const band = ANALOGUES.filter(
    (country) => Math.abs(country.kg_co2_per_usd - kgCo2PerUsd) <= ANALOGUE_BAND * kgCo2PerUsd,
  );
  if (band.length > 0) return { kind: 'match', country: largestOf(band, kgCo2PerUsd) };

  if (kgCo2PerUsd < cleanest.kg_co2_per_usd) return { kind: 'cleaner', nearest: cleanest };
  if (kgCo2PerUsd > dirtiest.kg_co2_per_usd) return { kind: 'dirtier', nearest: dirtiest };
  const nearest = nearestOf(kgCo2PerUsd, ANALOGUES);
  return nearest === null ? null : { kind: 'gap', nearest };
}

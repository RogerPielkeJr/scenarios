#!/usr/bin/env python3
"""Writes src/data/learn_land_use.json: the Global Carbon Budget land-use CO2
flux 1965-2024 with its uncertainty, its decomposition, and the published
rates the restoration control uses.

Everything here comes from two documents that state their own numbers, so
nothing is derived beyond a unit conversion:

  Global Carbon Budget 2024 (Friedlingstein et al., ESSD 17, 2025) for the
    net flux, the +-0.7 GtC (1 sigma) uncertainty, the 1.7 GtC of gross
    deforestation and the 1.2 GtC of regrowth, all for 2014-2023.
  IPCC 2006 Guidelines Volume 4, Chapter 4, Table 4.9 for above-ground
    biomass growth in natural forests, and Table 4.3 for the 0.47 carbon
    fraction of dry matter.

Run: python3 scripts/build_land_use.py
"""
import json
from pathlib import Path

import build_data

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'learn_land_use.json'
FIRST_YEAR, LAST_YEAR = 1965, 2024

C_TO_CO2 = 44 / 12
CARBON_FRACTION = 0.47          # IPCC 2006 Vol 4, Table 4.3
UNCERTAINTY_GTC = 0.7           # GCB 2024, 1 sigma on the net flux

# GCB 2024, 2014-2023 averages, in GtC a year.
DECOMPOSITION_GTC = {
    'net': 1.1,
    'deforestation': 1.7,
    'regrowth': 1.2,
}

# IPCC 2006 Vol 4, Table 4.9, tonnes of dry matter per hectare per year.
GROWTH_RATES_DM = {
    'matureTropical': 3.1,      # tropical rain forest, South America, over 20 years
    'youngTropicalAfrica': 10.0,
    'youngTropicalSouthAmerica': 11.0,
    'youngTropicalAsiaInsular': 13.0,
}


def to_co2_per_hectare(dry_matter: float) -> float:
    """Tonnes of dry matter a hectare to tonnes of CO2 a hectare."""
    return dry_matter * CARBON_FRACTION * C_TO_CO2


def main() -> None:
    gcb = build_data.fetch_gcb()
    years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    flux = {year: gcb[str(year)]['land_use_change_co2'] / 1000 for year in years}

    decade = [flux[year] for year in range(2014, 2024)]
    payload = {
        'meta': {
            'generated_by': 'scripts/build_land_use.py',
            'units': 'GtCO2 a year; a negative flux removes carbon from the air',
            'sources': {
                'flux': 'Global Carbon Budget 2024 via Our World in Data, world land-use '
                        'change CO2, 1965-2024',
                'decomposition': 'Global Carbon Budget 2024 (Friedlingstein et al., ESSD 17, '
                                 '2025), 2014-2023 averages',
                'growth_rates': 'IPCC 2006 Guidelines, Volume 4, Chapter 4, Table 4.9, with '
                                'the 0.47 carbon fraction from Table 4.3',
            },
        },
        'series': [{
            'id': 'flux',
            'label': 'Land use CO2',
            'kind': 'history',
            'years': years,
            'values': [round(flux[year], 3) for year in years],
        }],
        'bands': [{
            'id': 'uncertainty',
            'label': 'Global Carbon Budget uncertainty, 1 sigma',
            'years': years,
            'lo': [round(flux[year] - UNCERTAINTY_GTC * C_TO_CO2, 3) for year in years],
            'hi': [round(flux[year] + UNCERTAINTY_GTC * C_TO_CO2, 3) for year in years],
        }],
        'constants': {
            'firstYear': FIRST_YEAR,
            'lastYear': LAST_YEAR,
            'uncertaintyGtCo2': round(UNCERTAINTY_GTC * C_TO_CO2, 2),
            'levels': {
                'first': round(flux[FIRST_YEAR], 2),
                'last': round(flux[LAST_YEAR], 2),
                'decadeMean': round(sum(decade) / len(decade), 2),
                'peak': round(max(flux.values()), 2),
                'peakYear': max(years, key=lambda year: flux[year]),
            },
            'decomposition': {
                key: round(value * C_TO_CO2, 2) for key, value in DECOMPOSITION_GTC.items()
            },
            # The series drawn on this page and the figure printed in the
            # Global Carbon Budget paper do not agree, and the difference
            # between them is a fair measure of what this term's uncertainty
            # means in practice.
            'vintageGap': {
                'seriesDecadeMean': round(sum(decade) / len(decade), 2),
                'paperDecadeMean': round(DECOMPOSITION_GTC['net'] * C_TO_CO2, 2),
                'note': 'the Our World in Data redistribution against the 2014-2023 average '
                        'printed in the Global Carbon Budget 2024 paper',
            },
            'growthRates': {
                key: round(to_co2_per_hectare(value), 1)
                for key, value in GROWTH_RATES_DM.items()
            },
            'growthRatesDryMatter': GROWTH_RATES_DM,
            'carbonFraction': CARBON_FRACTION,
        },
    }
    # Other transitions and peat are what the two named components leave over.
    decomposition = payload['constants']['decomposition']
    decomposition['otherAndPeat'] = round(
        decomposition['net'] - decomposition['deforestation'] + decomposition['regrowth'], 2)

    OUT.write_text(json.dumps(payload, indent=1) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)}: {flux[FIRST_YEAR]:.2f} GtCO2 in {FIRST_YEAR}, '
          f'{flux[LAST_YEAR]:.2f} in {LAST_YEAR}, decade mean '
          f'{payload["constants"]["levels"]["decadeMean"]:.2f} +- '
          f'{payload["constants"]["uncertaintyGtCo2"]:.2f}; deforestation '
          f'{decomposition["deforestation"]:.2f}, regrowth {decomposition["regrowth"]:.2f}, '
          f'other and peat {decomposition["otherAndPeat"]:.2f}; restoration rates '
          f'{payload["constants"]["growthRates"]}')


if __name__ == '__main__':
    main()

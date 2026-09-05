#!/usr/bin/env python3
"""Writes src/data/learn_fuel_mix.json: the world's primary energy mix
1965-2024, the CO2 each fuel carries, and the two carbon-intensity series
the page draws.

The chain the page teaches runs: shares of primary energy -> kgCO2 per GJ
-> an annual rate. Three numbers have to line up for that chain to close,
and this script computes all three rather than asserting any of them.

  1 Emission factors. IPCC 2006 Guidelines default carbon contents, times
    44/12 for CO2. Applied to the 2024 mix they give more CO2 than the
    world actually emitted from energy, because part of the oil supply
    becomes plastics, lubricants and bitumen rather than exhaust. The
    ratio between the two is recorded as a calibration factor, so today's
    mix reproduces today's observed intensity exactly.
  2 Everything that is not combustion. Flaring, cement, other industrial
    processes and the gap between the two inventories, carried as kgCO2
    per GJ of total energy, because the slider's term covers them.
  3 The floor. A mix with no fossil fuel in it still leaves that
    non-combustion term, which sets the fastest rate this page can reach.

Sources:
  Energy Institute Statistical Review 2026: consumption in EJ for each
    fuel, CO2 from energy, and total energy supply, world, 1965-2024.
  IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Volume 2,
    Chapter 1, Table 1.3, default carbon content by fuel.
  Global Carbon Budget via Our World in Data: fossil and industrial CO2
    and its components, world, 1965-2024.

Run: python3 scripts/build_fuel_mix.py
"""
import json
from pathlib import Path

import openpyxl

import build_data

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'learn_fuel_mix.json'
FIRST_YEAR, LAST_YEAR = 1965, 2024
CO2_PER_CARBON = 44 / 12

# Sheet per fuel group, and the IPCC default carbon content that applies.
# Nuclear, hydro, wind and solar carry no combustion CO2. Bioenergy carries
# none in energy-sector accounting, where biogenic CO2 is reported under land
# use instead, which is also how the Energy Institute's CO2 series treats it.
FUELS = [
    ('coal', 'Coal', ['Coal Consumption - EJ'], 25.8, 'IPCC 2006 Table 1.3, other bituminous coal'),
    ('oil', 'Oil', ['Oil Consumption - EJ'], 20.0, 'IPCC 2006 Table 1.3, crude oil'),
    ('gas', 'Gas', ['Gas Consumption - EJ'], 15.3, 'IPCC 2006 Table 1.3, natural gas'),
    ('nuclear', 'Nuclear', ['Nuclear Consumption - EJ'], 0.0, 'no combustion CO2'),
    ('hydro', 'Hydro', ['Hydro Consumption - EJ'], 0.0, 'no combustion CO2'),
    ('windsolar', 'Wind and solar', ['Wind Consumption - EJ', 'Solar Consumption - EJ'], 0.0,
     'no combustion CO2'),
    ('bioother', 'Bioenergy and other', ['Geo Biomass Other - EJ'], 0.0,
     'biogenic CO2 is reported under land use, not energy'),
]


def world_row(sheet: dict[str, dict[int, float]]) -> dict[int, float]:
    for label in ('Total World', 'World'):
        if label in sheet:
            return sheet[label]
    raise SystemExit(f'no world row; saw {list(sheet)[:6]}')


def main() -> None:
    workbook = openpyxl.load_workbook(build_data.WORKBOOK, read_only=True, data_only=True)
    tes = world_row(build_data.read_sheet(workbook, 'Total Energy Supply (TES) -EJ'))
    energy_co2_mt = world_row(build_data.read_sheet(workbook, 'CO2 from Energy'))
    gcb = build_data.fetch_gcb()

    fuels: dict[str, dict[int, float]] = {}
    for key, _label, sheets, _carbon, _note in FUELS:
        total: dict[int, float] = {}
        for name in sheets:
            row = world_row(build_data.read_sheet(workbook, name))
            for year, value in row.items():
                total[year] = total.get(year, 0.0) + value
        fuels[key] = total

    years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    # Whatever the named fuels miss, biofuels most of it, joins bioenergy and
    # other, so the shares add to the total energy supply rather than to a
    # number a little short of it.
    for year in years:
        named = sum(fuels[key][year] for key, *_ in FUELS)
        fuels['bioother'][year] += tes[year] - named

    shares = {key: {year: 100 * fuels[key][year] / tes[year] for year in years}
              for key, *_ in FUELS}
    for year in years:
        total = sum(shares[key][year] for key, *_ in FUELS)
        if abs(total - 100) > 0.01:
            raise SystemExit(f'{year}: shares sum to {total:.3f}, not 100')

    factors = {key: round(carbon * CO2_PER_CARBON, 2) for key, _l, _s, carbon, _n in FUELS}

    def modelled(year: int) -> float:
        return sum(shares[key][year] / 100 * factors[key] for key, *_ in FUELS)

    # The two intensity series: what energy alone emits, and what the slider's
    # term covers, which adds cement, flaring and other industrial process CO2.
    energy_intensity = {year: energy_co2_mt[year] / tes[year] for year in years}
    # Both series arrive in million tonnes over exajoules, which is already
    # kilograms per gigajoule.
    slider_intensity = {year: gcb[str(year)]['co2'] / tes[year] for year in years}

    calibration = energy_intensity[LAST_YEAR] / modelled(LAST_YEAR)
    non_combustion = slider_intensity[LAST_YEAR] - energy_intensity[LAST_YEAR]
    if not 0.8 < calibration < 1.05:
        raise SystemExit(f'calibration factor {calibration:.4f} is outside the plausible range')

    components = gcb[str(LAST_YEAR)]
    breakdown = {
        'flaring': round(components['flaring_co2'] / tes[LAST_YEAR], 3),
        'cement': round(components['cement_co2'] / tes[LAST_YEAR], 3),
        'otherIndustry': round(components['other_industry_co2'] / tes[LAST_YEAR], 3),
    }
    breakdown['inventoryDifference'] = round(
        non_combustion - sum(breakdown.values()), 3)

    floor = non_combustion
    floor_rate = ((floor / slider_intensity[LAST_YEAR]) ** (1 / 75) - 1) * 100

    payload = {
        'meta': {
            'generated_by': 'scripts/build_fuel_mix.py',
            'units': 'shares in percent of total energy supply; intensities in kgCO2 per GJ',
            'sources': {
                'energy': 'Energy Institute Statistical Review 2026, consumption by fuel and '
                          'Total Energy Supply, Total World, EJ',
                'energy_co2': 'Energy Institute Statistical Review 2026, CO2 from Energy, '
                              'Total World, Mt',
                'factors': 'IPCC 2006 Guidelines, Volume 2, Chapter 1, Table 1.3, default '
                           'carbon content, converted at 44/12',
                'industrial_co2': 'Global Carbon Budget via Our World in Data, world fossil '
                                  'and industry CO2 with its components',
            },
        },
        'series': [
            {
                'id': key,
                'label': label,
                'kind': 'share',
                'years': years,
                'values': [round(shares[key][year], 3) for year in years],
            }
            for key, label, _s, _c, _n in FUELS
        ] + [
            {
                'id': 'intensity-slider',
                'label': 'CO2 per unit of energy',
                'kind': 'history',
                'years': years,
                'values': [round(slider_intensity[year], 3) for year in years],
            },
            {
                'id': 'intensity-energy',
                'label': 'CO2 from energy per unit of energy',
                'kind': 'history',
                'years': years,
                'values': [round(energy_intensity[year], 3) for year in years],
            },
        ],
        'constants': {
            'firstYear': FIRST_YEAR,
            'lastYear': LAST_YEAR,
            'factors': [
                {
                    'id': key,
                    'label': label,
                    'carbonKgPerGj': carbon,
                    'co2KgPerGj': round(carbon * CO2_PER_CARBON, 2),
                    'source': note,
                    'share2024': round(shares[key][LAST_YEAR], 2),
                    'share1965': round(shares[key][FIRST_YEAR], 2),
                }
                for key, label, _s, carbon, note in FUELS
            ],
            'calibration': {
                'factor': round(calibration, 4),
                'modelled2024': round(modelled(LAST_YEAR), 3),
                'observed2024': round(energy_intensity[LAST_YEAR], 3),
                'note': 'the default factors applied to the 2024 mix against the CO2 the world '
                        'reported from energy that year; the gap is mostly oil that becomes '
                        'plastics, lubricants and bitumen rather than exhaust',
            },
            'nonCombustion': {
                'kgPerGj': round(non_combustion, 3),
                'components': breakdown,
            },
            'levels': {
                'sliderBasis2024': round(slider_intensity[LAST_YEAR], 3),
                'energyBasis2024': round(energy_intensity[LAST_YEAR], 3),
                'sliderBasis1965': round(slider_intensity[FIRST_YEAR], 3),
                'energyBasis1965': round(energy_intensity[FIRST_YEAR], 3),
            },
            'rates': {
                'sliderBasis1990': round(build_data.cagr(slider_intensity, 1990, LAST_YEAR), 4),
                'energyBasis1990': round(build_data.cagr(energy_intensity, 1990, LAST_YEAR), 4),
                'sliderBasisWhole': round(
                    build_data.cagr(slider_intensity, FIRST_YEAR, LAST_YEAR), 4),
                'sliderBasisDecade': round(build_data.cagr(slider_intensity, 2015, LAST_YEAR), 4),
            },
            'zeroCarbonFloor': {
                'kgPerGj': round(floor, 3),
                'impliedRate': round(floor_rate, 3),
                'note': 'every fossil fuel out of the mix, with cement, flaring and other '
                        'industrial CO2 per unit of energy unchanged',
            },
        },
    }
    OUT.write_text(json.dumps(payload, indent=1) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)}: 2024 mix gives {modelled(LAST_YEAR):.2f} kgCO2/GJ '
          f'before calibration, {energy_intensity[LAST_YEAR]:.2f} observed, factor '
          f'{calibration:.4f}; non-combustion {non_combustion:.2f}; floor rate '
          f'{floor_rate:.2f}%/yr')


if __name__ == '__main__':
    main()

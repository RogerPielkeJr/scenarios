#!/usr/bin/env python3
"""Writes src/data/learn_income.json: world GDP per person 1965-2024 and the
three World Bank income groups behind it.

The world series uses the same spliced GDP as the energy-intensity page,
World Bank levels from 1990 carried back on Maddison growth rates, divided
by World Bank world population. The income groups come from the World Bank
aggregates, which begin in 1990 with the purchasing-power series.

Sources:
  World Bank NY.GDP.MKTP.PP.KD and SP.POP.TOTL, world and the aggregates
    HIC, MIC and LIC, 1990-2024.
  Maddison Project Database 2023, for world growth before 1990.

Run: python3 scripts/build_income.py  [--refresh]
"""
import json
import sys
import urllib.request
from pathlib import Path

import build_data
import build_energy_intensity as energy

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'learn_income.json'
CACHE = ROOT / 'scripts' / '_income_groups_cache.json'

FIRST_YEAR, LAST_YEAR = 1965, 2024
GROUP_FIRST_YEAR = 1990
GROUPS = [
    ('high', 'HIC', 'High income'),
    ('middle', 'MIC', 'Middle income'),
    ('low', 'LIC', 'Low income'),
]


def fetch_groups() -> dict:
    if CACHE.exists() and '--refresh' not in sys.argv:
        return json.loads(CACHE.read_text())
    out: dict[str, dict[str, dict[str, float]]] = {}
    for _key, code, _label in GROUPS:
        out[code] = {}
        for indicator in ('NY.GDP.MKTP.PP.KD', 'SP.POP.TOTL'):
            url = (f'https://api.worldbank.org/v2/country/{code}/indicator/{indicator}'
                   f'?format=json&per_page=400&date=1990:{LAST_YEAR}')
            print(f'  {code} {indicator}', file=sys.stderr)
            with urllib.request.urlopen(url, timeout=120) as response:
                payload = json.load(response)
            out[code][indicator] = {row['date']: float(row['value'])
                                    for row in payload[1] if row.get('value') is not None}
    CACHE.write_text(json.dumps(out, indent=1) + '\n')
    return out


def main() -> None:
    cache = build_data.fetch_worldbank([])
    world_gdp_wb = {int(y): float(v) for y, v in cache['world_gdp_ppp'].items() if v is not None}
    world_pop = {int(y): float(v) for y, v in cache['world_pop'].items() if v is not None}
    gdp = energy.spliced_gdp(world_gdp_wb, energy.maddison_world())

    years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    per_person = {year: gdp[year] / world_pop[year] for year in years}

    groups_raw = fetch_groups()
    groups = []
    for key, code, label in GROUPS:
        gdp_series = {int(y): v for y, v in groups_raw[code]['NY.GDP.MKTP.PP.KD'].items()}
        pop_series = {int(y): v for y, v in groups_raw[code]['SP.POP.TOTL'].items()}
        level = {year: gdp_series[year] / pop_series[year] for year in gdp_series
                 if year in pop_series}
        groups.append({
            'id': key,
            'code': code,
            'label': label,
            'gdpPerPerson': round(level[LAST_YEAR], 1),
            'populationBn': round(pop_series[LAST_YEAR] / 1e9, 4),
            'populationShare': round(100 * pop_series[LAST_YEAR] / world_pop[LAST_YEAR], 2),
            'gdpShare': round(100 * gdp_series[LAST_YEAR] / world_gdp_wb[LAST_YEAR], 2),
            'growth': round(build_data.cagr(level, GROUP_FIRST_YEAR, LAST_YEAR), 4),
            'growthRecentDecade': round(build_data.cagr(level, 2015, LAST_YEAR), 4),
            'years': sorted(level),
            'values': [round(level[year], 1) for year in sorted(level)],
        })

    covered = sum(group['populationShare'] for group in groups)
    if abs(covered - 100) > 3:
        raise SystemExit(f'the three groups cover {covered:.1f}% of world population')

    payload = {
        'meta': {
            'generated_by': 'scripts/build_income.py',
            'units': 'constant 2021 international dollars per person',
            'sources': {
                'world_gdp_from_1990': 'World Bank NY.GDP.MKTP.PP.KD, WLD',
                'world_gdp_before_1990': 'Maddison Project Database 2023 growth rates, '
                                         'spliced at 1990; see the energy-intensity build',
                'population': 'World Bank SP.POP.TOTL, WLD and the income-group aggregates',
                'groups': 'World Bank income classifications HIC, MIC and LIC, aggregates '
                          'for the current classification of each economy',
            },
            'note': 'The three groups are the World Bank classification as it stands today, '
                    'applied to the whole series, so a country that changed group does not '
                    'move between them mid-record.',
        },
        'series': [{
            'id': 'world',
            'label': 'World GDP per person',
            'kind': 'history',
            'years': years,
            'values': [round(per_person[year], 1) for year in years],
        }],
        'groups': groups,
        'constants': {
            'firstYear': FIRST_YEAR,
            'lastYear': LAST_YEAR,
            'levels': {
                'first': round(per_person[FIRST_YEAR], 1),
                'splice': round(per_person[GROUP_FIRST_YEAR], 1),
                'last': round(per_person[LAST_YEAR], 1),
            },
            'rates': {
                'wholeRecord': round(build_data.cagr(per_person, FIRST_YEAR, LAST_YEAR), 4),
                'longRecord': round(build_data.cagr(per_person, 1990, LAST_YEAR), 4),
                'recentDecade': round(build_data.cagr(per_person, 2015, LAST_YEAR), 4),
            },
            'ratios': {
                'highOverLow': round(groups[0]['gdpPerPerson'] / groups[2]['gdpPerPerson'], 1),
                'highOverMiddle': round(
                    groups[0]['gdpPerPerson'] / groups[1]['gdpPerPerson'], 1),
            },
            'populationCovered': round(covered, 2),
        },
    }
    OUT.write_text(json.dumps(payload, indent=1) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)}: ${per_person[FIRST_YEAR]:,.0f} in {FIRST_YEAR}, '
          f'${per_person[LAST_YEAR]:,.0f} in {LAST_YEAR}; groups '
          + ', '.join(f'{g["label"]} ${g["gdpPerPerson"]:,.0f} at {g["growth"]:+.2f}%/yr'
                      for g in groups))


if __name__ == '__main__':
    main()

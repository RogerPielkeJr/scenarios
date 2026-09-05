#!/usr/bin/env python3
"""Writes src/data/learn_population.json from the UN World Population
Prospects 2024 revision.

Source: population.un.org, "Total Population by Sex" standard CSV, the
whole file for every location and every variant, 1950-2100. The download
runs about 17 MB compressed and stays out of the repository; the extracted
subset caches in scripts/_wpp_cache.json, which is committed, so a build
works offline.

What it takes:
  World, annual 1950-2100, medium variant, plus the 95% prediction
    interval from the probabilistic projections.
  Seven regions that sum exactly to the world at every variant, each with
    its low, medium and high variant for 2100 and its five-yearly medium
    path. Africa splits into sub-Saharan Africa and northern Africa, which
    keeps the region carrying most of the remaining growth on its own
    control while the arithmetic stays exact.

Run: python3 scripts/build_wpp.py  [--refresh]
"""
import csv
import gzip
import io
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'learn_population.json'
CACHE = ROOT / 'scripts' / '_wpp_cache.json'
BASE = ('https://population.un.org/wpp/assets/Excel%20Files/'
        '1_Indicator%20(Standard)/CSV_FILES/')
URL = BASE + 'WPP2024_TotalPopulationBySex.csv.gz'
INDICATORS_URL = BASE + 'WPP2024_Demographic_Indicators_Medium.csv.gz'

# WPP 2024 estimates run to 2023; everything after that is a projection.
LAST_ESTIMATE = 2023
FIRST_YEAR, LAST_YEAR = 1950, 2100

# (location, location type) -> the id and label this site uses. The seven
# regions add up to the world at the low, medium and high variants alike.
REGIONS = [
    ('Sub-Saharan Africa', 'SDG region', 'sub-saharan-africa', 'Sub-Saharan Africa'),
    ('Northern Africa', 'Subregion', 'northern-africa', 'Northern Africa'),
    ('Asia', 'Geographic region', 'asia', 'Asia'),
    ('Europe', 'Geographic region', 'europe', 'Europe'),
    ('Latin America and the Caribbean', 'Geographic region', 'latin-america',
     'Latin America and the Caribbean'),
    ('Northern America', 'Geographic region', 'northern-america', 'Northern America'),
    ('Oceania', 'Geographic region', 'oceania', 'Oceania'),
]
# Medium, low and high project fertility; the last two hold it still, which
# is what separates what the age structure alone does from what fertility does.
VARIANTS = ('Medium', 'Low', 'High', 'Lower 95 PI', 'Upper 95 PI',
            'Momentum', 'Constant fertility')
# Years the fertility figures are quoted for.
FERTILITY_YEARS = (1950, 1990, 2024, 2100)
WANTED = {(name, kind) for name, kind, _, _ in REGIONS} | {('World', 'World')}


def rows(url: str):
    """Streams one gzipped WPP CSV, which arrives too large to keep around."""
    print(f'downloading {url}', file=sys.stderr)
    with urllib.request.urlopen(url, timeout=900) as response:
        raw = response.read()
    with gzip.open(io.BytesIO(raw), 'rt', encoding='utf-8-sig') as handle:
        yield from csv.DictReader(handle)


def download() -> dict:
    """The subset this site uses: populations by variant, and fertility."""
    population: dict[str, dict[str, float]] = {}
    for row in rows(URL):
        key = (row['Location'], row['LocTypeName'])
        variant = row['Variant']
        if key not in WANTED or variant not in VARIANTS:
            continue
        year = int(row['Time'])
        if not FIRST_YEAR <= year <= LAST_YEAR:
            continue
        # PopTotal arrives in thousands.
        population.setdefault(f'{key[0]}|{variant}', {})[str(year)] = \
            float(row['PopTotal']) / 1e6

    fertility: dict[str, dict[str, float]] = {}
    for row in rows(INDICATORS_URL):
        key = (row['Location'], row['LocTypeName'])
        if key not in WANTED:
            continue
        year = int(row['Time'])
        if year not in FERTILITY_YEARS:
            continue
        value = row['TFR']
        if value == '':
            continue
        fertility.setdefault(row['Location'], {})[str(year)] = float(value)
    return {'population': population, 'fertility': fertility}


def load(refresh: bool) -> tuple[dict[str, dict[int, float]], dict[str, dict[int, float]]]:
    if CACHE.exists() and not refresh:
        cached = json.loads(CACHE.read_text())
    else:
        cached = download()
        CACHE.write_text(json.dumps(cached, indent=1, sort_keys=True) + '\n')
    population = {key: {int(y): v for y, v in series.items()}
                  for key, series in cached['population'].items()}
    fertility = {key: {int(y): v for y, v in series.items()}
                 for key, series in cached['fertility'].items()}
    return population, fertility


def series_for(table, location: str, variant: str) -> dict[int, float]:
    key = f'{location}|{variant}'
    if key not in table:
        raise SystemExit(f'{key} missing from the WPP download')
    return table[key]


def round_to(value: float, places: int = 4) -> float:
    return round(value, places)


def main() -> None:
    table, fertility = load('--refresh' in sys.argv)
    world = series_for(table, 'World', 'Medium')
    years = sorted(world)
    if years[0] != FIRST_YEAR or years[-1] != LAST_YEAR:
        raise SystemExit(f'world series covers {years[0]}-{years[-1]}, expected '
                         f'{FIRST_YEAR}-{LAST_YEAR}')

    lo95 = series_for(table, 'World', 'Lower 95 PI')
    hi95 = series_for(table, 'World', 'Upper 95 PI')
    band_years = sorted(set(lo95) & set(hi95))

    parts = []
    totals = {'Low': 0.0, 'Medium': 0.0, 'High': 0.0}
    five_yearly = list(range(2025, LAST_YEAR + 1, 5))
    for name, _kind, part_id, label in REGIONS:
        low = series_for(table, name, 'Low')[LAST_YEAR]
        medium = series_for(table, name, 'Medium')
        high = series_for(table, name, 'High')[LAST_YEAR]
        for variant, value in (('Low', low), ('Medium', medium[LAST_YEAR]), ('High', high)):
            totals[variant] += value
        parts.append({
            'id': part_id,
            'label': label,
            'unit': 'billion people in 2100',
            'min': round_to(low, 3),
            'max': round_to(high, 3),
            'step': 0.01,
            'default': round_to(medium[LAST_YEAR], 3),
            'today': round_to(medium[2025], 3),
            'marks': [
                {'value': round_to(low, 3), 'label': 'UN low', 'kind': 'low'},
                {'value': round_to(medium[LAST_YEAR], 3), 'label': 'UN medium', 'kind': 'medium'},
                {'value': round_to(high, 3), 'label': 'UN high', 'kind': 'high'},
            ],
            'path': [round_to(medium[year], 3) for year in five_yearly],
        })

    # The seven regions have to reconstruct the UN's own world figures, or
    # the builder would sum to something the UN never published.
    for variant, total in totals.items():
        published = series_for(table, 'World', variant)[LAST_YEAR]
        if abs(total - published) > 0.002:
            raise SystemExit(f'regions sum to {total:.4f} at the {variant} variant, '
                             f'against the UN world figure of {published:.4f}')

    payload = {
        'meta': {
            'generated_by': 'scripts/build_wpp.py',
            'source': 'UN World Population Prospects 2024 revision, '
                      'Total Population by Sex (standard CSV projections)',
            'url': 'https://population.un.org/wpp/downloads',
            'vintage': '2024 revision, file dated 2024-12-13',
            'units': 'billions of people',
            'last_estimate_year': LAST_ESTIMATE,
            'note': 'Values converted from thousands. The low, medium and high '
                    'variants add up across regions; the 95% prediction '
                    'intervals do not, because the regional uncertainties do '
                    'not all fall on the same side at once.',
        },
        'series': [
            {
                'id': 'un-history',
                'label': 'Estimated',
                'kind': 'history',
                'years': [y for y in years if y <= LAST_ESTIMATE],
                'values': [round_to(world[y], 4) for y in years if y <= LAST_ESTIMATE],
            },
            {
                'id': 'un-medium',
                'label': 'UN medium',
                'kind': 'projection',
                'years': [y for y in years if y >= LAST_ESTIMATE],
                'values': [round_to(world[y], 4) for y in years if y >= LAST_ESTIMATE],
            },
        ],
        'bands': [
            {
                'id': 'un-95',
                'label': 'UN 95% prediction interval',
                'years': band_years,
                'lo': [round_to(lo95[y], 4) for y in band_years],
                'hi': [round_to(hi95[y], 4) for y in band_years],
            },
        ],
        'parts': parts,
        'constants': {
            'pathYears': five_yearly,
            'world2100': {
                'low': round_to(series_for(table, 'World', 'Low')[LAST_YEAR], 3),
                'medium': round_to(world[LAST_YEAR], 3),
                'high': round_to(series_for(table, 'World', 'High')[LAST_YEAR], 3),
                'lo95': round_to(lo95[LAST_YEAR], 3),
                'hi95': round_to(hi95[LAST_YEAR], 3),
                'regionalLo95Sum': round_to(
                    sum(series_for(table, name, 'Lower 95 PI')[LAST_YEAR]
                        for name, _k, _i, _l in REGIONS), 3),
                'regionalHi95Sum': round_to(
                    sum(series_for(table, name, 'Upper 95 PI')[LAST_YEAR]
                        for name, _k, _i, _l in REGIONS), 3),
            },
            'today': {
                'year': 2025,
                'worldBn': round_to(world[2025], 3),
                'peakYear': max(years, key=lambda y: world[y]),
                'peakBn': round_to(max(world.values()), 3),
            },
            # What the age structure alone does, against what holding today's
            # fertility does. The published projections sit between the two.
            'heldStill2100': {
                'momentum': round_to(series_for(table, 'World', 'Momentum')[LAST_YEAR], 3),
                'constantFertility': round_to(
                    series_for(table, 'World', 'Constant fertility')[LAST_YEAR], 3),
                'subSaharanConstantFertility': round_to(
                    series_for(table, 'Sub-Saharan Africa', 'Constant fertility')[LAST_YEAR], 3),
            },
            'fertility': {
                'world': {str(year): fertility['World'][year] for year in FERTILITY_YEARS
                          if year in fertility.get('World', {})},
                'byRegion2024': {
                    part_id: fertility[name][2024]
                    for name, _kind, part_id, _label in REGIONS
                    if 2024 in fertility.get(name, {})
                },
            },
        },
    }
    OUT.write_text(json.dumps(payload, indent=1) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)}: world {payload["constants"]["today"]["worldBn"]} bn '
          f'in 2025, {payload["constants"]["world2100"]["medium"]} bn in 2100, '
          f'{len(parts)} regions')


if __name__ == '__main__':
    main()

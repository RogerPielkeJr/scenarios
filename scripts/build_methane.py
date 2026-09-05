#!/usr/bin/env python3
"""Writes src/data/learn_methane.json: world anthropogenic methane by source,
1990 to 2023, from EDGAR.

EDGAR reports emissions by country and IPCC 2006 sector code in gigagrams.
This sums them to five groups a reader can act on, keeping the mapping in
one table so it can be checked:

  fossil     1.B fugitive emissions from fuels, plus fuel combustion
  livestock  3.A.1 enteric fermentation and 3.A.2 manure management
  rice       3.C.7 rice cultivation
  waste      4.A landfills, 4.D wastewater, and the rest of category 4
  other      everything else, biomass burning and industry most of it

The download is 6 MB and stays out of the repository; the aggregated series
cache in scripts/_edgar_ch4_cache.json, which is committed.

Run: python3 scripts/build_methane.py  [--refresh]
"""
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

import openpyxl

import build_data

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'learn_methane.json'
CACHE = ROOT / 'scripts' / '_edgar_ch4_cache.json'
URL = ('https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/EDGAR/datasets/'
       'EDGAR_2024_GHG/EDGAR_CH4_1970_2023.zip')

FIRST_YEAR, LAST_YEAR = 1990, 2023

# IPCC 2006 code prefixes, longest match winning, so 3.A.1 beats 3.
GROUPS = [
    ('livestock', 'Livestock', ('3.A.1', '3.A.2')),
    ('rice', 'Rice', ('3.C.7',)),
    ('waste', 'Waste', ('4.A', '4.B', '4.C', '4.D', '4.E')),
    ('fossil', 'Fossil fuels', ('1.B', '1.A')),
]
OTHER = ('other', 'Other anthropogenic')


def group_for(code: str) -> str:
    best, length = OTHER[0], -1
    for key, _label, prefixes in GROUPS:
        for prefix in prefixes:
            if code.startswith(prefix) and len(prefix) > length:
                best, length = key, len(prefix)
    return best


def download() -> dict[str, dict[str, float]]:
    print(f'downloading {URL}', file=sys.stderr)
    with urllib.request.urlopen(URL, timeout=900) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    name = next(n for n in archive.namelist() if n.endswith('.xlsx'))
    workbook = openpyxl.load_workbook(io.BytesIO(archive.read(name)), read_only=True)
    sheet = workbook['IPCC 2006']

    header = None
    totals: dict[str, dict[int, float]] = {}
    for row in sheet.iter_rows(values_only=True):
        if header is None:
            if row and row[0] == 'IPCC_annex':
                header = [str(cell) for cell in row]
            continue
        record = dict(zip(header, row))
        code = str(record.get('ipcc_code_2006_for_standard_report') or '')
        if code in ('', 'None'):
            continue
        key = group_for(code)
        for column, value in record.items():
            if not column.startswith('Y_') or value in (None, ''):
                continue
            year = int(column[2:])
            if FIRST_YEAR <= year <= LAST_YEAR:
                # Gigagrams to million tonnes.
                bucket = totals.setdefault(key, {})
                bucket[year] = bucket.get(year, 0.0) + float(value) / 1000
    return {key: {str(y): v for y, v in series.items()} for key, series in totals.items()}


def load() -> dict[str, dict[int, float]]:
    if CACHE.exists() and '--refresh' not in sys.argv:
        cached = json.loads(CACHE.read_text())
    else:
        cached = download()
        CACHE.write_text(json.dumps(cached, indent=1, sort_keys=True) + '\n')
    return {key: {int(y): v for y, v in series.items()} for key, series in cached.items()}


def main() -> None:
    totals = load()
    labels = {key: label for key, label, _p in GROUPS}
    labels[OTHER[0]] = OTHER[1]
    order = ['fossil', 'livestock', 'rice', 'waste', 'other']
    years = list(range(FIRST_YEAR, LAST_YEAR + 1))

    world = {year: sum(totals[key][year] for key in order) for year in years}
    if not 300 < world[LAST_YEAR] < 450:
        raise SystemExit(f'{LAST_YEAR} anthropogenic methane came to {world[LAST_YEAR]:.0f} Mt, '
                         'outside the range the inventories report')

    payload = {
        'meta': {
            'generated_by': 'scripts/build_methane.py',
            'units': 'million tonnes of CH4 a year',
            'source': 'EDGAR (2024 release), CH4 by country and IPCC 2006 sector, 1970-2023, '
                      'summed to world totals',
            'url': 'https://edgar.jrc.ec.europa.eu/dataset_ghg2024',
            'mapping': {key: list(prefixes) for key, _label, prefixes in GROUPS},
            'note': 'Anthropogenic sources only. Natural wetlands, the largest single source '
                    'of methane, sit outside every figure here and outside the slider.',
        },
        'series': [
            {
                'id': key,
                'label': labels[key],
                'kind': 'source',
                'years': years,
                'values': [round(totals[key][year], 2) for year in years],
            }
            for key in order
        ] + [{
            'id': 'total',
            'label': 'All anthropogenic sources',
            'kind': 'history',
            'years': years,
            'values': [round(world[year], 2) for year in years],
        }],
        'constants': {
            'firstYear': FIRST_YEAR,
            'lastYear': LAST_YEAR,
            'totals': {
                'first': round(world[FIRST_YEAR], 1),
                'last': round(world[LAST_YEAR], 1),
                'growth': round(build_data.cagr(world, FIRST_YEAR, LAST_YEAR), 4),
            },
            'sources': [
                {
                    'id': key,
                    'label': labels[key],
                    'first': round(totals[key][FIRST_YEAR], 1),
                    'last': round(totals[key][LAST_YEAR], 1),
                    'share': round(100 * totals[key][LAST_YEAR] / world[LAST_YEAR], 1),
                    'growth': round(build_data.cagr(totals[key], FIRST_YEAR, LAST_YEAR), 4),
                }
                for key in order
            ],
        },
    }
    OUT.write_text(json.dumps(payload, indent=1) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)}: {world[FIRST_YEAR]:.0f} Mt in {FIRST_YEAR}, '
          f'{world[LAST_YEAR]:.0f} Mt in {LAST_YEAR}; '
          + ', '.join(f'{labels[k]} {totals[k][LAST_YEAR]:.0f}' for k in order))


if __name__ == '__main__':
    main()

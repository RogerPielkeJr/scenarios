#!/usr/bin/env python3
"""Regenerates the data files that CAN be rebuilt from primary sources:
src/data/observed.json (world Kaya history and the rate windows the notes
quote) and src/data/analogues.json (the country carbon-intensity table
behind the "your 2100 world looks like" tile).

The CMIP7 marker series, the SSP population curves and the FaIR emulator
fit are NOT rebuilt here -- they have no primary source on this machine
and are carried over by scripts/extract_prototype.py. See DATA.md.

Sources:
  Energy Institute Statistical Review 2026 workbook (manual annual
    download), sheets 'CO2 from Energy' and 'Total Energy Supply (TES)
    -EJ', world row and country rows, 1965-2024.
  World Bank NY.GDP.MKTP.PP.KD (constant 2021 international $) and
    SP.POP.TOTL, world aggregate 1990-2024 plus country values for 2024.

Run: python3 scripts/build_data.py
"""
import json
import sys
import urllib.request
from pathlib import Path

import openpyxl

from country_iso3 import EI_NAME_TO_ISO3, NO_GDP_MATCH

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = Path('/home/rpielke/EI-Stats-Review-2026.xlsx')
OUT = ROOT / 'src' / 'data'
CACHE = ROOT / 'scripts' / '_worldbank_cache.json'

FIRST_YEAR, LAST_YEAR = 1965, 2024   # EI coverage we keep (the 2026 edition
                                     # carries a 2025 estimate; excluded)
GDP_FIRST_YEAR = 1990                # World Bank PPP series starts here
MIN_CO2_MT, MIN_GDP_BN = 25.0, 40.0  # analogue-table thresholds


def read_sheet(wb, sheet: str) -> dict[str, dict[int, float]]:
    """Row label -> {year: value} for one EI sheet.

    The header row repeats the final year label three times: the value
    column, a year-on-year % change column and a share-of-world column.
    Reading it into a dict keyed by label therefore silently returns the
    share column (1.0 for the world row) unless the year block is cut at
    the first non-monotonic repeat. That is what this loop does.
    """
    ws = wb[sheet]
    rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))
    header = rows[2]
    cols: list[tuple[int, int]] = []
    for j, cell in enumerate(header):
        text = str(cell).strip() if cell is not None else ''
        if text.isdigit() and FIRST_YEAR <= int(text) <= 2030:
            if cols and int(text) <= cols[-1][1]:
                break            # repeat label: derived stats start here
            cols.append((j, int(text)))
    # Sheets do not all start in 1965 (flaring starts 1975), so require only
    # a contiguous run of at least 40 years ending no earlier than LAST_YEAR.
    if not cols or cols[-1][1] < LAST_YEAR or len(cols) < 40:
        raise SystemExit(f'{sheet}: unexpected header layout '
                         f'({len(cols)} year columns, last {cols[-1][1] if cols else "none"})')
    if [y for _, y in cols] != list(range(cols[0][1], cols[-1][1] + 1)):
        raise SystemExit(f'{sheet}: year columns are not contiguous')

    out: dict[str, dict[int, float]] = {}
    for row in rows:
        label = row[0]
        if not isinstance(label, str) or not label.strip():
            continue
        series = {}
        for j, year in cols:
            if year > LAST_YEAR or j >= len(row) or row[j] is None:
                continue
            try:
                series[year] = float(row[j])
            except (TypeError, ValueError):
                continue
        if series:
            out.setdefault(label.strip(), series)
    return out


def worldbank(iso3: str, indicator: str) -> dict[int, float]:
    url = (f'https://api.worldbank.org/v2/country/{iso3}/indicator/{indicator}'
           f'?format=json&per_page=400&date=1960:{LAST_YEAR}')
    with urllib.request.urlopen(url, timeout=60) as resp:
        payload = json.load(resp)
    if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
        return {}
    return {int(d['date']): float(d['value']) for d in payload[1]
            if d.get('value') is not None}


def fetch_worldbank(isos: list[str]) -> dict:
    """Fetch once, cache to disk; re-run with --refresh to hit the API again."""
    if CACHE.exists() and '--refresh' not in sys.argv:
        return json.loads(CACHE.read_text())
    data = {'world_gdp_ppp': worldbank('WLD', 'NY.GDP.MKTP.PP.KD'),
            'world_pop': worldbank('WLD', 'SP.POP.TOTL'),
            'country_gdp_ppp': {}}
    for i, iso in enumerate(isos, 1):
        series = worldbank(iso, 'NY.GDP.MKTP.PP.KD')
        if LAST_YEAR in series:
            data['country_gdp_ppp'][iso] = series[LAST_YEAR]
        print(f'  [{i}/{len(isos)}] {iso} {"ok" if LAST_YEAR in series else "NO 2024 VALUE"}',
              file=sys.stderr)
    CACHE.write_text(json.dumps(data, indent=1))
    return data


def cagr(series: dict[int, float], a: int, b: int) -> float:
    return ((series[b] / series[a]) ** (1.0 / (b - a)) - 1.0) * 100.0


def window_extremes(series: dict[int, float], span: int, first: int, last: int) -> dict:
    """Highest and lowest CAGR over every `span`-year window in [first, last].

    Reported as plain max/min rather than "slowest"/"fastest", because which
    end counts as slow progress flips with the sign of the series: for the two
    technology terms (both declining) the MAX is the weakest improvement, while
    for income (rising) the MAX is the fastest growth.
    """
    windows = [(s, s + span, cagr(series, s, s + span))
               for s in range(first, last - span + 1)
               if s in series and s + span in series]
    if not windows:
        raise SystemExit(f'no {span}-year windows in {first}-{last}')
    fmt = lambda w: {'value': round(w[2], 4), 'from': w[0], 'to': w[1],
                     'window': f'{w[0]}-{w[1]}'}
    return {'span': span, 'count': len(windows),
            'max': fmt(max(windows, key=lambda w: w[2])),
            'min': fmt(min(windows, key=lambda w: w[2]))}


def main() -> None:
    if not WORKBOOK.exists():
        raise SystemExit(f'missing EI workbook: {WORKBOOK}')
    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    co2 = read_sheet(wb, 'CO2 from Energy')
    tes = read_sheet(wb, 'Total Energy Supply (TES) -EJ')
    flaring = read_sheet(wb, 'CO2 from Flaring')
    for name, sheet in (('CO2 from Energy', co2), ('TES', tes)):
        if 'Total World' not in sheet:
            raise SystemExit(f'{name}: no "Total World" row')
        if abs(sheet['Total World'][LAST_YEAR] - 1.0) < 0.01:
            raise SystemExit(f'{name}: world {LAST_YEAR} value is 1.0 -- '
                             'the share-of-world column was read by mistake')

    isos = sorted({EI_NAME_TO_ISO3[n] for n in co2 if n in EI_NAME_TO_ISO3})
    wbank = fetch_worldbank(isos)
    world_gdp = {int(k): v for k, v in wbank['world_gdp_ppp'].items()}
    world_pop = {int(k): v for k, v in wbank['world_pop'].items()}
    country_gdp = wbank['country_gdp_ppp']

    w_co2, w_tes = co2['Total World'], tes['Total World']
    years_gdp = [y for y in range(GDP_FIRST_YEAR, LAST_YEAR + 1)
                 if y in world_gdp and y in world_pop and y in w_tes]

    # --- world Kaya factors -------------------------------------------------
    gdppc = {y: world_gdp[y] / world_pop[y] for y in years_gdp}           # $/person
    energy_per_dollar = {y: w_tes[y] * 1e12 / world_gdp[y] for y in years_gdp}  # MJ/$
    carbon_per_energy = {y: w_co2[y] / w_tes[y]                            # kg/GJ
                         for y in range(FIRST_YEAR, LAST_YEAR + 1)
                         if y in w_co2 and y in w_tes}

    observed = {
        'meta': {
            'generated_by': 'scripts/build_data.py',
            'ei_workbook': WORKBOOK.name,
            'ei_years': [FIRST_YEAR, LAST_YEAR],
            'gdp_years': [GDP_FIRST_YEAR, LAST_YEAR],
            'sources': {
                'co2': 'Energy Institute Statistical Review 2026, sheet "CO2 from Energy", Total World row, Mt CO2',
                'energy': 'Energy Institute Statistical Review 2026, sheet "Total Energy Supply (TES) -EJ", Total World row, EJ',
                'gdp': 'World Bank NY.GDP.MKTP.PP.KD, WLD, constant 2021 international $',
                'population': 'World Bank SP.POP.TOTL, WLD (UN World Population Prospects 2024 as redistributed by the World Bank)',
            },
        },
        'series': {
            'years': list(range(FIRST_YEAR, LAST_YEAR + 1)),
            'co2_mt': {str(y): round(w_co2[y], 3) for y in sorted(w_co2)},
            'energy_ej': {str(y): round(w_tes[y], 4) for y in sorted(w_tes)},
            'gdp_ppp_usd': {str(y): world_gdp[y] for y in sorted(world_gdp) if y <= LAST_YEAR},
            'population': {str(y): world_pop[y] for y in sorted(world_pop) if y <= LAST_YEAR},
        },
        'factors': {
            'gdp_per_person_usd': {str(y): round(gdppc[y], 2) for y in years_gdp},
            'energy_per_dollar_mj': {str(y): round(energy_per_dollar[y], 5) for y in years_gdp},
            'carbon_per_energy_kg_gj': {str(y): round(v, 5) for y, v in sorted(carbon_per_energy.items())},
        },
        'rates': {
            'long_record': {
                'period': f'{GDP_FIRST_YEAR}-{LAST_YEAR}',
                'income': round(cagr(gdppc, GDP_FIRST_YEAR, LAST_YEAR), 4),
                'energy_per_dollar': round(cagr(energy_per_dollar, GDP_FIRST_YEAR, LAST_YEAR), 4),
                'carbon_per_energy': round(cagr(carbon_per_energy, GDP_FIRST_YEAR, LAST_YEAR), 4),
                'population': round(cagr(world_pop, GDP_FIRST_YEAR, LAST_YEAR), 4),
            },
            'recent_decade': {
                'period': f'2015-{LAST_YEAR}',
                'income': round(cagr(gdppc, 2015, LAST_YEAR), 4),
                'energy_per_dollar': round(cagr(energy_per_dollar, 2015, LAST_YEAR), 4),
                'carbon_per_energy': round(cagr(carbon_per_energy, 2015, LAST_YEAR), 4),
                'population': round(cagr(world_pop, 2015, LAST_YEAR), 4),
            },
        },
        'extremes': {
            'income_25y': window_extremes(gdppc, 25, GDP_FIRST_YEAR, LAST_YEAR),
            'energy_per_dollar_25y': window_extremes(energy_per_dollar, 25, GDP_FIRST_YEAR, LAST_YEAR),
            'carbon_per_energy_30y': window_extremes(carbon_per_energy, 30, FIRST_YEAR, LAST_YEAR),
        },
        'base_year_check': {
            'year': LAST_YEAR,
            'gdp_per_person_usd': round(gdppc[LAST_YEAR], 1),
            'energy_per_dollar_mj': round(energy_per_dollar[LAST_YEAR], 4),
            'carbon_per_energy_kg_gj': round(carbon_per_energy[LAST_YEAR], 3),
            'carbon_per_energy_with_flaring_kg_gj': round(
                (w_co2[LAST_YEAR] + flaring['Total World'][LAST_YEAR]) / w_tes[LAST_YEAR], 3),
            'population_bn': round(world_pop[LAST_YEAR] / 1e9, 4),
        },
    }

    # --- country analogues --------------------------------------------------
    rows, dropped = [], []
    for name, series in co2.items():
        if name in NO_GDP_MATCH or name not in EI_NAME_TO_ISO3:
            continue
        iso = EI_NAME_TO_ISO3[name]
        co2_mt = series.get(LAST_YEAR)
        gdp = country_gdp.get(iso)
        if co2_mt is None or gdp is None:
            dropped.append((name, iso, 'no CO2' if co2_mt is None else 'no GDP'))
            continue
        if co2_mt < MIN_CO2_MT or gdp / 1e9 < MIN_GDP_BN:
            continue
        rows.append({'name': name, 'iso3': iso, 'co2_mt': round(co2_mt, 2),
                     'gdp_ppp_bn_usd': round(gdp / 1e9, 1),
                     'kg_co2_per_usd': round(co2_mt * 1e9 / gdp, 4)})
    rows.sort(key=lambda r: r['kg_co2_per_usd'])

    analogues = {
        'meta': {
            'generated_by': 'scripts/build_data.py',
            'year': LAST_YEAR,
            'thresholds': {'min_co2_mt': MIN_CO2_MT, 'min_gdp_bn_usd': MIN_GDP_BN},
            'count': len(rows),
            'excluded_no_gdp_series': sorted(NO_GDP_MATCH),
            'sources': {
                'co2': 'Energy Institute Statistical Review 2026, sheet "CO2 from Energy", 2024, Mt CO2',
                'gdp': 'World Bank NY.GDP.MKTP.PP.KD, 2024, constant 2021 international $',
            },
        },
        'countries': rows,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'observed.json').write_text(json.dumps(observed, indent=1, ensure_ascii=False) + '\n')
    (OUT / 'analogues.json').write_text(json.dumps(analogues, indent=1, ensure_ascii=False) + '\n')

    print(f'observed.json   {FIRST_YEAR}-{LAST_YEAR}')
    r = observed['rates']
    print(f"  {r['long_record']['period']}: income {r['long_record']['income']:+.2f}  "
          f"energy/$ {r['long_record']['energy_per_dollar']:+.2f}  "
          f"CO2/energy {r['long_record']['carbon_per_energy']:+.2f} %/yr")
    print(f"  {r['recent_decade']['period']}: income {r['recent_decade']['income']:+.2f}  "
          f"energy/$ {r['recent_decade']['energy_per_dollar']:+.2f}  "
          f"CO2/energy {r['recent_decade']['carbon_per_energy']:+.2f} %/yr")
    for key, ex in observed['extremes'].items():
        print(f"  {key}: max {ex['max']['value']:+.2f} ({ex['max']['window']})  "
              f"min {ex['min']['value']:+.2f} ({ex['min']['window']})  "
              f"[{ex['count']} windows]")
    print(f"  base year {LAST_YEAR}: {observed['base_year_check']}")
    print(f'analogues.json  {len(rows)} countries')
    if dropped:
        print(f'  DROPPED at the join: {dropped}')


if __name__ == '__main__':
    main()

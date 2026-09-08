#!/usr/bin/env python3
"""Writes src/data/learn_removal.json for the Learn More page on removal.

Every figure comes out of the State of Carbon Dioxide Removal executive
summary, parsed here rather than retyped, so a new edition changes the page by
re-running this rather than by anyone copying numbers across. The regexes below
assert what they find: a wording change fails the build loudly instead of
letting a stale number through.

The markers' own 2100 removal levels come from src/data/presets.json, where
build_carried_data.py derives them by fitting each marker's published CO2 path.

Run: python3 scripts/build_removal.py
"""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'src' / 'data'
CACHE = ROOT / 'scripts' / '_cdr_cache.pdf'
URL = 'https://www.stateofcdr.org/asset/The-State-of-CDR-Executive-summary_June-2026.pdf'


def fetch() -> bytes:
    if CACHE.exists():
        return CACHE.read_bytes()
    req = Request(URL, headers={'User-Agent': 'THB scenario builder (research)'})
    with urlopen(req, timeout=90) as r:
        body = r.read()
    CACHE.write_bytes(body)
    return body


def text_of(pdf: bytes) -> str:
    import pymupdf
    with pymupdf.open(stream=pdf, filetype='pdf') as doc:
        return re.sub(r'\s+', ' ', ' '.join(page.get_text() for page in doc))


def grab(text: str, pattern: str, what: str) -> float:
    m = re.search(pattern, text, re.I)
    if m is None:
        raise SystemExit(f'the State of CDR summary no longer states {what}; '
                         f'check the current edition and update this pattern')
    return float(m.group(1))


def main() -> None:
    text = text_of(fetch())

    total = grab(text, r'Total removal is ([\d.]+) GtCO2 per year', 'the total removal')
    share_of_gross = grab(text, r'equivalent to (\d+)% of gross CO2 emissions',
                          'removal as a share of gross emissions')
    novel = grab(text, r'Novel CDR is ([\d.]+) GtCO2 per year', 'novel removal today')
    novel_growth = grab(text, r'Novel CDR is [\d.]+ GtCO2 per year and has been growing at '
                              r'(\d+)% per year', 'the novel growth rate')
    pipeline_2030 = grab(text, r'would reach ([\d.]+) GtCO2 per year of capacity in 2030',
                         'the 2030 project pipeline')
    pledges_2030 = grab(text, r'reach ([\d.]+) GtCO2 per year CDR in 2030',
                        'country pledges for 2030')
    novel_2050 = grab(text, r'accelerates to over ([\d.]+) GtCO2 per year by 2050',
                      'novel removal in 2050 across assessed scenarios')

    presets = {p['id']: p for p in json.loads((DATA / 'presets.json').read_text())['presets']}
    markers = {m['id']: m for m in json.loads((DATA / 'markers.json').read_text())['markers']}
    marker_rows = []
    for preset_id, marker_id in (('cmip7-high', 'H'), ('cmip7-medium', 'M'),
                                 ('cmip7-medium-to-low', 'ML'), ('cmip7-very-low', 'VL')):
        preset, marker = presets.get(preset_id), markers.get(marker_id)
        if preset is None or marker is None:
            continue
        marker_rows.append({
            'id': marker_id, 'label': marker['label'], 'color': marker['color'],
            'removals': preset['inputs']['removals'],
            'timing': preset['inputs']['improvementTiming'],
            'co2In2100': marker['co2Gt'][-1],
        })

    out = {
        'meta': {'generated_by': 'scripts/build_removal.py', 'source': URL,
                 'edition': 'The State of Carbon Dioxide Removal, executive summary, June 2026'},
        'today': {
            'totalGt': total,
            'novelGt': novel,
            'conventionalGt': round(total - novel, 3),
            'novelSharePercent': round(100 * novel / total, 2),
            'shareOfGrossPercent': share_of_gross,
            'novelGrowthPercent': novel_growth,
        },
        'ahead': {
            'pipeline2030Gt': pipeline_2030,
            'pledges2030Gt': pledges_2030,
            'novel2050Gt': novel_2050,
        },
        'markers': marker_rows,
    }
    (DATA / 'learn_removal.json').write_text(json.dumps(out, indent=1) + '\n')
    print('  wrote src/data/learn_removal.json')
    print(f"    today: {total} Gt total, of which novel {novel} Gt "
          f"({out['today']['novelSharePercent']}%), growing {novel_growth}%/yr")
    print(f"    ahead: pipeline {pipeline_2030} Gt by 2030, pledges {pledges_2030} Gt, "
          f"novel {novel_2050} Gt by 2050 in scenarios")
    print(f"    markers: " + ', '.join(f"{m['id']} {m['removals']} Gt" for m in marker_rows))


if __name__ == '__main__':
    main()

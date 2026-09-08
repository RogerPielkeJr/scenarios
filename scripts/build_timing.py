#!/usr/bin/env python3
"""Writes src/data/learn_timing.json for the Learn More page on timing.

The timing slider asks when across the century the technology improvement
arrives. Unlike the six factor pages this one needs no new download: the
quantity it teaches is a property of series the site already carries, and this
script derives it rather than restating it.

  - The observed energy-intensity and carbon-intensity paths, 1965 to 2024,
    from src/data/learn_energy_intensity.json and src/data/learn_fuel_mix.json,
    both built from the Energy Institute Statistical Review and World Bank GDP.
  - What share of each one's total improvement the world delivered by the
    midpoint of that span, which is the same question the slider asks about the
    century ahead, asked of the record instead.
  - Each CMIP7 marker's own timing value, derived in build_carried_data.py by
    fitting that marker's published CO2 path.

Run: python3 scripts/build_timing.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'src' / 'data'


def series_from(filename: str, series_id: str):
    payload = json.loads((DATA / filename).read_text())
    for entry in payload['series']:
        if entry['id'] == series_id:
            return entry['years'], entry['values']
    raise SystemExit(f'no series "{series_id}" in {filename}')


def midpoint_share(years, values):
    """Share of the whole span's log change that lands by the midpoint.

    The slider redistributes an improvement while holding its endpoint, so the
    honest measure of "when did it arrive" is the fraction of the total log
    change accumulated by the middle year. A perfectly steady rate gives 0.5
    exactly, which is what the slider's own 50% means.
    """
    first, last = values[0], values[-1]
    if first <= 0 or last <= 0:
        raise SystemExit('a level series cannot cross zero')
    total = math.log(last / first)
    if abs(total) < 1e-12:
        return 0.5
    mid_year = (years[0] + years[-1]) / 2
    # Interpolate the level at the midpoint year.
    for i in range(1, len(years)):
        if years[i] >= mid_year:
            span = years[i] - years[i - 1]
            f = 0 if span == 0 else (mid_year - years[i - 1]) / span
            mid = values[i - 1] + (values[i] - values[i - 1]) * f
            break
    else:
        mid = values[-1]
    return math.log(mid / first) / total


def rate(values, years):
    return ((values[-1] / values[0]) ** (1 / (years[-1] - years[0])) - 1) * 100


def half_rates(years, values):
    """The compound rate over each half of the record, which is what a reader
    sees when they ask whether the improvement came early or late."""
    mid = len(years) // 2
    return {
        'firstHalf': {'from': years[0], 'to': years[mid],
                      'rate': round(rate(values[:mid + 1], years[:mid + 1]), 3)},
        'secondHalf': {'from': years[mid], 'to': years[-1],
                       'rate': round(rate(values[mid:], years[mid:]), 3)},
    }


def main() -> None:
    out = {'meta': {'generated_by': 'scripts/build_timing.py',
                    'note': 'derived from series this site already carries; no new download'},
           'observed': {}, 'markers': [], 'series': []}

    for key, filename, series_id, label in (
        ('energyPerDollar', 'learn_energy_intensity.json', 'intensity', 'Energy per dollar'),
        ('co2PerEnergy', 'learn_fuel_mix.json', 'intensity-slider', 'CO2 per unit of energy'),
    ):
        years, values = series_from(filename, series_id)
        share = midpoint_share(years, values)
        out['observed'][key] = {
            'label': label,
            'firstYear': years[0], 'lastYear': years[-1],
            'midYear': (years[0] + years[-1]) // 2,
            'first': round(values[0], 4), 'last': round(values[-1], 4),
            'wholeRate': round(rate(values, years), 3),
            'sharePercent': round(share * 100, 1),
            **half_rates(years, values),
        }
        out['series'].append({'id': key, 'label': label, 'years': years,
                              'values': [round(v, 4) for v in values]})

    presets = {p['id']: p for p in json.loads((DATA / 'presets.json').read_text())['presets']}
    markers = json.loads((DATA / 'markers.json').read_text())['markers']
    label_by_id = {m['id']: m['label'] for m in markers}
    colour_by_id = {m['id']: m['color'] for m in markers}
    for preset_id, marker_id in (('cmip7-high', 'H'), ('cmip7-medium', 'M'),
                                 ('cmip7-medium-to-low', 'ML'), ('cmip7-very-low', 'VL')):
        preset = presets.get(preset_id)
        if preset is None:
            continue
        out['markers'].append({
            'id': marker_id,
            'label': label_by_id.get(marker_id, marker_id),
            'color': colour_by_id.get(marker_id, '#666'),
            'timing': preset['inputs']['improvementTiming'],
            'removals': preset['inputs']['removals'],
        })

    (DATA / 'learn_timing.json').write_text(json.dumps(out, indent=1) + '\n')
    print(f"  wrote src/data/learn_timing.json")
    for key, o in out['observed'].items():
        print(f"    {key}: {o['sharePercent']}% by {o['midYear']}, "
              f"{o['firstHalf']['rate']:+.2f}%/yr then {o['secondHalf']['rate']:+.2f}%/yr")
    print(f"    markers: " + ', '.join(f"{m['id']} {m['timing']}%" for m in out['markers']))


if __name__ == '__main__':
    main()

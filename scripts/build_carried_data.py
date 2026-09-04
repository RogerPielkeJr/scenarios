#!/usr/bin/env python3
"""Writes the src/data/*.json files whose numbers are carried over from the
prototype rather than rebuilt from primary sources: the seven CMIP7 marker
paths, the SSP population curves, the FaIR emulator fit, the base-year
state, the input definitions and the presets.

These have no primary source on this machine. They entered the prototype
from ScenarioMIP CMIP7 runs, the IIASA SSP database v3.2 and a FaIR v2.2
ensemble, and this script exists so that lifting them out is a repeatable
step with a recorded provenance rather than a retyping job. Run
scripts/extract_prototype.py first; it produces the intermediate this
reads. See DATA.md.

Run: python3 scripts/build_carried_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONST = ROOT / 'scripts' / '_prototype_constants.json'
OUT = ROOT / 'src' / 'data'

# Scenario identity: prototype key -> display name, short name, colour.
# Colours are the seven in the brief, lifted from the prototype's CSS
# custom properties so the JSON is the single source and the stylesheet
# derives from it rather than the other way round.
SCENARIOS = [
    ('H',  'HIGH',            'High',            '#d1332e'),
    ('HL', 'HIGH-to-LOW',     'High-to-Low',     '#b8860b'),
    ('M',  'MEDIUM',          'Medium',          '#e08214'),
    ('ML', 'MEDIUM-to-LOW',   'Medium-to-Low',   '#7b3fa0'),
    ('L',  'LOW',             'Low',             '#2b8cbe'),
    ('LN', 'LOW-to-NEGATIVE', 'Low-to-Negative', '#5ab4ac'),
    ('VL', 'VERY LOW',        'Very Low',        '#1a7f37'),
]

# The four presets the brief documents, and the cumulative CO2 / warming
# each is expected to reproduce. All four are frozen from this model: a
# change in any of them means the model moved, and the test says so.
#
# These are NOT the figures the brief states for the two technology bounds.
# Recalibrating the base year on 2026-09-04, so that the Kaya terms cover
# cement and other industrial CO2 the way the CMIP7 markers do, raised every
# cumulative total by 10 to 13 per cent. The brief's originals are kept in
# brief_stated so the size of that shift stays visible. Warming moved far
# less, because the emulator is logarithmic in cumulative CO2: the slow
# bound went from 3.4 to 3.47 degC and the fast bound from 2.2 to 2.22.
DOCUMENTED = {
    'Kaya at observed rates':     {'cumulative_gt': 4083.9, 'warming_c': 3.19},
    'Trend continues':            {'cumulative_gt': 3408.7, 'warming_c': 2.94},
    'Slowest technical progress': {'cumulative_gt': 5047.2, 'warming_c': 3.47,
                                   'brief_stated': {'cumulative_gt': 4600, 'warming_c': 3.4}},
    'Ausubel methane economy':    {'cumulative_gt': 1585.0, 'warming_c': 2.22,
                                   'brief_stated': {'cumulative_gt': 1400, 'warming_c': 2.2}},
}
for _entry in DOCUMENTED.values():
    _entry.setdefault('tolerance_gt', 0.5)
    _entry.setdefault('tolerance_c', 0.01)
    _entry.setdefault('source', 'frozen from this model after the base-year recalibration')

# Thresholds the conditional notes fire on. Numbers only; the sentences
# live in src/ui/notes.ts. Lifted from the prototype's notes engine, except
# the two technology bounds, which the prototype hard-coded at 4,307 Gt.
# That figure could not be reconstructed from any preset or window in the
# record, so the bounds are now computed at run time from the two bound
# presets themselves, which is what the brief describes them as.
NOTES_THRESHOLDS = {
    'efficiencySlowerThanRecordRatio': 0.7,
    'fuelMixFasterThanAnyScenarioRatio': 4.0,
    'highScenarioEfficiencyRatio': 0.46,
    'coherence': {
        'fastFuelMixSlowEfficiency': {'co2PerEnergyBelow': -1.2, 'energyPerDollarAbove': -0.9},
        'fastEfficiencyStaticFuelMix': {'energyPerDollarBelow': -2.0, 'co2PerEnergyAbove': -0.4},
        'stagnantEconomyFastEfficiency': {'incomeBelow': 0.8, 'energyPerDollarBelow': -1.8},
        'largeSinkUnchangedFuelMix': {'landUseBelow': -6.0, 'co2PerEnergyAbove': -0.5},
    },
}

INPUT_META = {
    'pop':    ('population',       'level', 'billion people in 2100'),
    'gdppc':  ('income',           'rate',  '%/yr'),
    'ei':     ('energyPerDollar',  'rate',  '%/yr'),
    'ci':     ('co2PerEnergy',     'rate',  '%/yr'),
    'lu':     ('landUse',          'level', 'GtCO2/yr in 2100'),
    'ch4':    ('methane',          'level', 'Mt/yr in 2100'),
}


def main() -> None:
    if not CONST.exists():
        raise SystemExit('run scripts/extract_prototype.py first')
    C = json.loads(CONST.read_text())
    D, BASE, MKPOP, MKRATE = C['D'], C['BASE'], C['MKPOP'], C['MKRATE']
    warming = {name: value for name, value in C['MT']}
    name_by_key = {'VL': 'VERY LOW', 'LN': 'LOW-to-NEG', 'L': 'LOW', 'ML': 'MED-to-LOW',
                   'HL': 'HIGH-to-LOW', 'M': 'MEDIUM', 'H': 'HIGH'}
    provenance = ('carried over from prototype/kaya_scenario_builder.html; '
                  'no primary source on this machine (see DATA.md)')

    # --- config.json --------------------------------------------------------
    inputs = []
    for c in C['CTRL']:
        key, kind, units = INPUT_META[c['id']]
        inputs.append({
            'id': key, 'legacyId': c['id'], 'kind': kind,
            'label': c['h'], 'help': c['why'],
            'min': c['min'], 'max': c['max'], 'step': c['step'],
            'default': c['val'], 'decimals': c['dec'],
            'unitSuffix': c['unit'], 'units': units,
            'signed': kind == 'rate',
            'reference': {'value': c['hist'], 'label': c['histL']},
        })
    config = {
        'meta': {'generated_by': 'scripts/build_carried_data.py', 'provenance': provenance},
        'baseYear': BASE['year'], 'endYear': D['popyears'][-1],
        # The live base-year state is src/data/base.json, written from
        # primary sources by scripts/build_data.py. This copy is what the
        # prototype used, kept so the two can be diffed.
        'prototypeBase': {
            'populationBn': BASE['pop'],
            'gdpPerPersonUsd': BASE['gdppc'],
            'energyPerDollarMj': BASE['ei'],
            'co2PerEnergyKgGj': BASE['ci'],
            'landUseGt': D['afolu0'],
            'methaneMt': D['ch4ref'],
        },
        'observedRates': {'income': C['OBS']['gdppc'], 'energyPerDollar': C['OBS']['ei'],
                          'co2PerEnergy': C['OBS']['ci'], 'population': C['OBS']['pop']},
        'inputs': inputs,
    }

    # --- emulator.json ------------------------------------------------------
    a, b, c_ = D['emu']
    emulator = {
        'meta': {'generated_by': 'scripts/build_carried_data.py',
                 'provenance': 'fitted to FaIR v2.2 runs of the seven CMIP7 markers '
                               'using the fair-calibrate v1.4.1 constrained ensemble'},
        'form': 'T = a + b*ln(1 + max(0, C)/c) + k*(CH4 - refMt)',
        'coefficients': {'a': a, 'b': b, 'c': c_},
        'methane': {'k': D['ch4k'], 'refMt': D['ch4ref']},
        'anchors': {'recentMeanC': 1.24, 'recentPeriod': '2015-2024',
                    'baseline': '1850-1900'},
        'markerWarmingC': {key: warming[name_by_key[key]] for key, *_ in SCENARIOS},
    }

    # --- markers.json -------------------------------------------------------
    markers = []
    for order, (key, label, short, colour) in enumerate(SCENARIOS):
        rate = MKRATE[key]
        markers.append({
            'id': key, 'label': label, 'shortLabel': short, 'color': colour, 'order': order,
            'co2Gt': D['markers'][key],
            'cumulativeGt': D['cum'][key],
            'methaneMt': D['ch4'][key],
            'landUseGt': D['afolu'][key],
            'warmingC': warming[name_by_key[key]],
            'kaya': {
                'populationBn': MKPOP[key],
                'income': rate['gdppc'],
                'energyPerDollar': rate['ei'],
                'co2PerEnergy': rate['ci'],
                # The prototype grafts these onto MKRATE at runtime, so they
                # are absent from the static literal; take them from D.
                'landUse': D['afolu'][key],
                'methane': D['ch4'][key],
            },
        })
    markers_json = {
        'meta': {'generated_by': 'scripts/build_carried_data.py',
                 'provenance': 'ScenarioMIP CMIP7 marker runs; ' + provenance,
                 'note': 'co2Gt is total CO2 including land use, on the markers\' own basis'},
        'years': D['years'],
        'markers': markers,
    }

    # --- population.json ----------------------------------------------------
    population = {
        'meta': {'generated_by': 'scripts/build_carried_data.py',
                 'provenance': 'IIASA SSP database v3.2 (June 2025), world aggregate; ' + provenance},
        'years': D['popyears'],
        'curves': D['popcurves'],
        'anchors2100': {k: v[-1] for k, v in D['popcurves'].items()},
        'un2024': {'median2100': 10.2, 'lo95': 9.0, 'hi95': 11.4,
                   'source': 'UN World Population Prospects 2024, 95% prediction interval'},
    }

    # --- presets.json -------------------------------------------------------
    presets = []
    for label, values in C['PRE']:
        entry = {
            'id': label.lower().replace(' ', '-').replace(',', ''),
            'label': label,
            'documented': label in DOCUMENTED,
            'inputs': {INPUT_META[k][0]: v for k, v in values.items()},
        }
        if label in DOCUMENTED:
            entry['expected'] = DOCUMENTED[label]
        presets.append(entry)

    OUT.mkdir(parents=True, exist_ok=True)
    notes = {
        'meta': {'generated_by': 'scripts/build_carried_data.py',
                 'note': 'thresholds only; the wording lives in src/ui/notes.ts'},
        'thresholds': NOTES_THRESHOLDS,
    }

    for name, payload in (('config', config), ('emulator', emulator),
                          ('markers', markers_json), ('population', population),
                          ('presets', {'presets': presets}), ('notes', notes)):
        (OUT / f'{name}.json').write_text(json.dumps(payload, indent=1, ensure_ascii=False) + '\n')
        print(f'  wrote src/data/{name}.json')
    missing = [m['id'] for m in markers if m['kaya']['co2PerEnergy'] is None]
    if missing:
        print(f'  note: no carbon-intensity rate for markers {missing} '
              '(no calibration tick on that slider)')


if __name__ == '__main__':
    main()

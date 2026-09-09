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
import math
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
#
# Re-frozen 2026-09-09, when two figures moved onto the basis the sliders and
# the markers already use:
#   * base land use, from the brief's 3.83 Gt to the Global Carbon Budget's
#     4.586 for the same year, which is what basis.totalCo2Gt already counted.
#     Worth about +29 GtCO2 on every path, and it improved three of the four
#     CMIP7 presets against their published totals: HIGH from -12 to +4 GtCO2,
#     MEDIUM from -3 to -2, MEDIUM-to-LOW from 0 to +2. VERY LOW went from +55
#     to +68, which is the cost.
#   * the slow bound's fuel-mix rate, from the weakest 30-year window on the
#     combustion basis to the weakest on the slider basis, -0.17 to -0.02%/yr.
# `superseded` is a list, newest first, because each recalibration has to leave
# the one before it readable: anything published against an older figure stays
# traceable to the change that moved it.
LAND_BASE_WHY = ('land use started from the brief\'s 3.83 Gt rather than the Global '
                 'Carbon Budget\'s 4.586 for the same year')
CI_BASIS_WHY = ('the CO2-per-energy rate measured combustion CO2 alone, at -0.21%/yr')
DOCUMENTED = {
    'Kaya at observed rates':     {'cumulative_gt': 4206.8, 'warming_c': 3.22,
                                   'superseded': [
                                       {'cumulative_gt': 4177.7, 'warming_c': 3.21,
                                        'until': '2026-09-09', 'why': LAND_BASE_WHY},
                                       {'cumulative_gt': 4083.9, 'warming_c': 3.19,
                                        'until': '2026-09-05', 'why': CI_BASIS_WHY},
                                   ]},
    'Trend continues':            {'cumulative_gt': 3437.4, 'warming_c': 2.95,
                                   'superseded': [
                                       {'cumulative_gt': 3408.7, 'warming_c': 2.94,
                                        'until': '2026-09-09', 'why': LAND_BASE_WHY},
                                   ]},
    'Slowest technical progress': {'cumulative_gt': 5397.3, 'warming_c': 3.53,
                                   'brief_stated': {'cumulative_gt': 4600, 'warming_c': 3.4},
                                   'superseded': [
                                       {'cumulative_gt': 5047.2, 'warming_c': 3.47,
                                        'until': '2026-09-09',
                                        'why': LAND_BASE_WHY + ', and the fuel-mix rate came '
                                               'from the weakest 30-year window on the '
                                               'combustion basis rather than the slider\'s'},
                                   ]},
    'Ausubel methane economy':    {'cumulative_gt': 1613.7, 'warming_c': 2.23,
                                   'brief_stated': {'cumulative_gt': 1400, 'warming_c': 2.2},
                                   'superseded': [
                                       {'cumulative_gt': 1585.0, 'warming_c': 2.22,
                                        'until': '2026-09-09', 'why': LAND_BASE_WHY},
                                   ]},
}
for _entry in DOCUMENTED.values():
    _entry.setdefault('tolerance_gt', 0.5)
    _entry.setdefault('tolerance_c', 0.01)
    _entry.setdefault('source', 'frozen from this model after the 2026-09-09 recalibration')

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

# The scenario the page opens on. The prototype opened on a set of values
# that matched no preset (observed rates but with land use at zero), which
# left the reader looking at a scenario with no name.
DEFAULT_PRESET = 'Trend continues'

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
    default_values = dict(next(values for label, values in C['PRE'] if label == DEFAULT_PRESET))

    # One correction to what the prototype carried. The CO2-per-energy slider
    # moves the quantity the CMIP7 markers count, cement and other industrial
    # CO2 included, and on that basis the world improved 0.15% a year from
    # 1990 to 2024, not the 0.21% that measures combustion alone. The mark
    # under the slider, the observed rate the notes compare against, and the
    # "Kaya at observed rates" preset all now use the same basis as the slider.
    # src/data/learn_fuel_mix.json carries both figures and the page prints
    # them side by side. See METHODS.md.
    slider_basis = json.loads(
        (OUT / 'learn_fuel_mix.json').read_text())['constants']['rates']
    ci_observed = round(slider_basis['sliderBasis1990'], 2)
    ci_decade = round(slider_basis['sliderBasisDecade'], 2)
    # The weakest 30-year window on the slider's own basis, for the slow bound.
    ci_slow_bound = json.loads(
        (OUT / 'observed.json').read_text())['extremes'][
            'carbon_per_energy_slider_30y']['max']['value']

    inputs = []
    for c in C['CTRL']:
        key, kind, units = INPUT_META[c['id']]
        default = default_values[c['id']]
        if not (c['min'] <= default <= c['max']):
            raise SystemExit(f'{DEFAULT_PRESET} puts {key} outside its slider range')
        inputs.append({
            'id': key, 'legacyId': c['id'], 'kind': kind,
            'label': c['h'], 'help': c['why'],
            'min': c['min'], 'max': c['max'], 'step': c['step'],
            'default': default, 'decimals': c['dec'],
            'prototypeDefault': c['val'],
            'unitSuffix': c['unit'], 'units': units,
            'signed': kind == 'rate',
            'reference': {
                'value': ci_observed if key == 'co2PerEnergy' else c['hist'],
                'label': c['histL'],
            },
        })
    # Two controls the prototype had no equivalent for. The four Kaya factors
    # fix where each trajectory ends in 2100 and say nothing about the route
    # there, and multiplying them can never produce a negative number. Both gaps
    # showed up as CMIP7 presets that missed their own markers: MEDIUM by 12% on
    # cumulative CO2 with its 2100 value right to within 1%, and the two deep
    # scenarios by much more, because they end net-negative and nothing in a
    # product of positive factors goes below zero.
    inputs.append({
        'id': 'improvementTiming', 'legacyId': 'timing', 'kind': 'level',
        'label': 'Improvement delivered by 2062',
        'help': ('The rate sliders set where energy per dollar and CO2 per unit of '
                 'energy end up in 2100. This sets when the change happens. Half by '
                 'the midpoint means a steady rate; more means an early push that '
                 'slows later.'),
        'min': 5, 'max': 95, 'step': 1,
        'default': 50, 'decimals': 0,
        'prototypeDefault': 50,
        'unitSuffix': '%', 'units': '% of the century\'s improvement, by 2062',
        'signed': False,
        'reference': {'value': 50, 'label': 'Steady rate'},
    })
    inputs.append({
        'id': 'removals', 'legacyId': 'cdr', 'kind': 'level',
        'label': 'Engineered CO2 removal in 2100',
        'help': ('Bioenergy with capture, direct air capture and the rest: removal '
                 'that stores carbon outside the land account. Forests and soils sit '
                 'on the land use slider, so neither counts the same tonne. A product '
                 'of four positive factors stays above zero at any rate, and this term '
                 'takes a path below it. The ramp starts slowly and steepens, as in '
                 'the scenarios.'),
        'min': 0, 'max': 25, 'step': 0.5,
        'default': 0, 'decimals': 1,
        'prototypeDefault': 0,
        'unitSuffix': ' GtCO2/yr', 'units': 'GtCO2/yr in 2100',
        'signed': False,
        'reference': {'value': 0, 'label': 'None today'},
    })

    # Help text the prototype's own wording no longer covers.
    #
    # The land use help predates the removal slider, so it did not say which
    # removal it counts; the two terms are additive and must not overlap. The
    # rest are rewritten to report the record rather than characterise it: the
    # prototype wrote "the world managed", "has done nearly all the
    # decarbonising" and "improved only", which are readings of the numbers
    # rather than the numbers. See METHODS.md.
    HELP = {
        'landUse': (
            'Forests and farming release about 3.8 Gt a year now. CMIP7 spans a sink '
            'of 8.8 Gt to a source of 1.9. Regrowth and restoration net into this '
            'figure; engineered removal has a slider of its own.'),
        'income': (
            f'The world averaged 1.91% a year from 1990 to 2024.'),
        'energyPerDollar': (
            'Energy per dollar improved 1.43% a year since 1990, the largest of the '
            'four factors over that period.'),
        'co2PerEnergy': (
            f'The fuel mix improved {abs(ci_observed):.2f}% a year since 1990 and '
            f'{abs(ci_decade):.2f}% over the past decade, on the same basis as the '
            'scenarios, cement and industrial CO2 included.'),
        'improvementTiming': (
            'The rate sliders set the 2100 level of energy per dollar and CO2 per unit '
            'of energy. This sets how that change spreads across the years between. '
            'Half by the midpoint gives a constant rate; above half puts more of the '
            'change in the first half of the century.'),
    }
    for spec in inputs:
        if spec['id'] in HELP:
            spec['help'] = HELP[spec['id']]
    # --- how many scenarios the sliders actually reach -----------------------
    # Multiplying the slider stops counts settings, not outcomes. Energy per
    # dollar and CO2 per unit of energy enter the identity only through their
    # product, so swapping one for the other leaves the path byte-identical and
    # roughly half of all settings repeat another. Counting what the sliders
    # reach means counting distinct products, not distinct pairs.
    #
    # The timing slider changes which factors collapse. Income compounds over
    # calendar years while the two technology rates compound over the
    # redistributed clock, so at any timing but 50% income stands apart and only
    # the technology pair collapses. At exactly 50% the clocks coincide and all
    # three collapse into one product. Both cases are counted.
    #
    # Done here rather than in the browser because the three-rate case is 81.5
    # million products; src/model/config.ts composes these two with the slider
    # stop counts.
    def _hundredths(spec):
        n = round((spec['max'] - spec['min']) / spec['step']) + 1
        return [int(round((spec['min'] + k * spec['step']) * 100)) for k in range(n)]

    by_id = {s['id']: s for s in inputs}
    ei_v = _hundredths(by_id['energyPerDollar'])
    ci_v = _hundredths(by_id['co2PerEnergy'])
    inc_v = _hundredths(by_id['income'])
    pairs = len({(10000 + a) * (10000 + b) for a in ei_v for b in ci_v})
    triples = len({(10000 + a) * (10000 + b) * (10000 + c)
                   for a in ei_v for b in ci_v for c in inc_v})
    print(f'  distinct rate products: {pairs:,} pairs, {triples:,} triples')

    config = {
        'meta': {'generated_by': 'scripts/build_carried_data.py', 'provenance': provenance},
        'baseYear': BASE['year'], 'endYear': D['popyears'][-1],
        'defaultPreset': DEFAULT_PRESET,
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
                          'co2PerEnergy': ci_observed, 'population': C['OBS']['pop']},
        # What the prototype used, kept so the change above can be checked.
        'supersededRates': {'co2PerEnergy': C['OBS']['ci'],
                            'why': 'CO2 from energy over total energy supply, which leaves '
                                   'out the cement and industrial CO2 the slider carries'},
        'inputs': inputs,
        # Distinct products the rate sliders reach, for counting outcomes
        # rather than settings. See the comment where these are computed.
        'rateProducts': {'pairs': pairs, 'triples': triples,
                         'note': 'energy x CO2 rate products, and all three '
                                 'including income, counted exactly'},
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
    # The prototype's PRE list carries three of the seven markers as presets.
    # MEDIUM-to-LOW is the fourth marker that publishes a carbon-intensity
    # rate, so it derives from the marker data the same way the other three
    # did: the marker's own Kaya rates and 2100 population, with land use and
    # methane rounded to the decimals their sliders carry.
    #
    # The rule is checked rather than assumed. HIGH and MEDIUM reproduce
    # exactly. VERY LOW reproduces in every field but the carbon-intensity
    # rate, which that marker does not publish and the prototype's author
    # chose by hand, so it stays out of the check.
    def cmip7_preset(key: str) -> dict:
        rate = MKRATE[key]
        return {'pop': MKPOP[key], 'gdppc': rate['gdppc'], 'ei': rate['ei'],
                'ci': rate['ci'], 'ch4': round(D['ch4'][key]),
                'lu': round(D['afolu'][key], 1)}

    MARKER_FOR_PRESET = {'CMIP7 HIGH': 'H', 'CMIP7 MEDIUM': 'M',
                         'CMIP7 MEDIUM-to-LOW': 'ML', 'CMIP7 VERY LOW': 'VL'}

    pre = list(C['PRE'])
    carried = {label: values for label, values in pre}
    for key, label in (('H', 'CMIP7 HIGH'), ('M', 'CMIP7 MEDIUM')):
        derived = cmip7_preset(key)
        drift = {field: (value, carried[label][field]) for field, value in derived.items()
                 if abs(value - carried[label][field]) > 1e-9}
        if drift:
            raise SystemExit(f'{label} no longer derives from marker {key}: {drift}')

    ml_label = 'CMIP7 MEDIUM-to-LOW'
    if ml_label not in carried:
        after = next(i for i, (label, _) in enumerate(pre) if label == 'CMIP7 MEDIUM')
        pre.insert(after + 1, (ml_label, cmip7_preset('ML')))

    # Every preset value has to sit on its own slider's step, or the slider
    # shows one number while the state holds another and the preset stops being
    # reachable. Four CMIP7 presets carried a 2100 population off the 0.1 step
    # -- MEDIUM held 9.89 under a slider reading 9.9 -- so one step down from
    # the displayed value un-matched the preset and swapped the whole readout.
    # Land use and methane were already rounded this way above; this applies the
    # same rule to every field rather than to the two that happened to need it.
    spec_by_key = {s['id']: s for s in config['inputs']}

    def snap(key: str, value: float) -> float:
        spec = spec_by_key[key]
        steps = round((value - spec['min']) / spec['step'])
        return round(spec['min'] + steps * spec['step'], spec['decimals'])

    # --- deriving the two new controls from each marker's own path ----------
    # Timing and removal have no published Kaya rate to read off, the way the
    # other six do. What every marker does publish is its full CO2 path, so the
    # pair comes from that: the values that make this model's own reconstruction
    # follow the marker year by year, at the marker's own four Kaya rates. That
    # keeps a preset meaning "this scenario's properties" rather than "numbers
    # someone liked", which is the same rule the four rates already follow, and
    # the residual is printed so a preset that stops tracking says so.
    SPAN = D['popyears'][-1] - BASE['year']

    # The fit has to run on the base-year state the model itself starts from,
    # which scripts/build_data.py rebuilds from primary sources. The prototype's
    # own base differs -- 60.5 against 65.2 kg CO2 per GJ, nearly 8% -- and
    # deriving against it would tune these two controls to a world the app never
    # simulates.
    base_path = OUT / 'base.json'
    if not base_path.exists():
        raise SystemExit('run scripts/build_data.py first; base.json missing')
    APPBASE = json.loads(base_path.read_text())['base']

    def _population_at(year, target):
        curves = D['popcurves']
        ys = D['popyears']

        def interp(curve):
            for i in range(1, len(ys)):
                if year <= ys[i]:
                    f = (year - ys[i - 1]) / (ys[i] - ys[i - 1])
                    return curve[i - 1] + (curve[i] - curve[i - 1]) * f
            return curve[-1]

        a, b, c = interp(curves['SSP1']), interp(curves['SSP2']), interp(curves['SSP3'])
        e1, e2, e3 = curves['SSP1'][-1], curves['SSP2'][-1], curves['SSP3'][-1]
        if target <= e1:
            return a * (target / e1)
        if target <= e2:
            return a + (b - a) * ((target - e1) / (e2 - e1))
        if target <= e3:
            return b + (c - b) * ((target - e2) / (e3 - e2))
        return c * (target / e3)

    def _accumulated(t_years, share_percent):
        share = min(max(share_percent / 100.0, 1e-6), 1 - 1e-6)
        lam = (2.0 / SPAN) * math.log(share / (1 - share))
        if abs(lam) < 1e-12:
            return float(t_years)
        return SPAN * (1 - math.exp(-lam * t_years)) / (1 - math.exp(-lam * SPAN))

    def _annual_co2(v, share, removals):
        """This model's own path, mirroring src/model/kaya.ts."""
        out = []
        for t in range(SPAN + 1):
            pop = _population_at(BASE['year'] + t, v['pop'])
            gdppc = APPBASE['gdpPerPersonUsd'] * (1 + v['gdppc'] / 100.0) ** t
            acc = _accumulated(t, share)
            ei = APPBASE['energyPerDollarMj'] * math.exp(math.log(1 + v['ei'] / 100.0) * acc)
            ci = APPBASE['co2PerEnergyKgGj'] * math.exp(math.log(1 + v['ci'] / 100.0) * acc)
            fossil = (pop * 1e9 * gdppc * ei / 1e12) * ci / 1000.0
            land = APPBASE['landUseGt'] + (v['lu'] - APPBASE['landUseGt']) * (t / SPAN)
            removal = -abs(removals) * (t / SPAN) ** 2
            out.append(fossil + land + removal)
        return out

    def _marker_annual(key):
        years, path = D['years'], D['markers'][key]
        out = []
        for t in range(SPAN + 1):
            year = BASE['year'] + t
            for i in range(1, len(years)):
                if year <= years[i]:
                    f = (year - years[i - 1]) / (years[i] - years[i - 1])
                    out.append(path[i - 1] + (path[i] - path[i - 1]) * f)
                    break
            else:
                out.append(path[-1])
        return out

    def derive_timing(key, values):
        """(timing, removals) that best track the marker, by coarse-then-fine search."""
        target = _marker_annual(key)

        def cost(share, removals):
            got = _annual_co2(values, share, removals)
            return sum((a - b) ** 2 for a, b in zip(got, target)) / len(target)

        best, shares, rems = None, [5 + i for i in range(91)], [i * 0.5 for i in range(51)]
        for s in shares:
            for r in rems:
                c = cost(s, r)
                if best is None or c < best[0]:
                    best = (c, s, r)
        _, s, r = best
        return s, round(r, 1)

    presets = []
    for label, values in pre:
        inputs = {INPUT_META[k][0]: snap(INPUT_META[k][0], v) for k, v in values.items()}
        # The four CMIP7 buttons carry their marker's own timing and removal.
        # Every other preset describes a rate the world might follow rather than
        # a published trajectory, so it keeps the steady-rate defaults.
        marker_key = MARKER_FOR_PRESET.get(label)
        if marker_key is None:
            inputs['improvementTiming'] = 50
            inputs['removals'] = 0.0
        else:
            timing, removals = derive_timing(marker_key, values)
            inputs['improvementTiming'] = timing
            inputs['removals'] = removals
            got = _annual_co2(values, timing, removals)
            tgt = _marker_annual(marker_key)
            err = 100 * (sum(got) / sum(tgt) - 1)
            print(f'  {label}: timing {timing}% by 2062, removals {removals} Gt '
                  f'-> cumulative {err:+.1f}% of the marker')
        # This preset takes the observed rates, so it follows the corrected
        # carbon-intensity rate rather than the prototype's.
        if label == 'Kaya at observed rates':
            inputs['co2PerEnergy'] = ci_observed
        # Same correction, applied to the slow bound. The prototype set this
        # preset's fuel-mix rate to the weakest 30-year window on the
        # combustion basis, -0.17%/yr over 1992-2022. The slider it sets
        # measures the wider basis the markers count, where the weakest window
        # of the same length is -0.02%/yr over 1984-2014. The Ausubel bound
        # needs no equivalent: its fuel-mix rate comes from the 1988 paper and
        # its efficiency rate has no CO2 in it. See METHODS.md.
        if label == 'Slowest technical progress':
            inputs['co2PerEnergy'] = snap('co2PerEnergy', round(ci_slow_bound, 2))
        entry = {
            'id': label.lower().replace(' ', '-').replace(',', ''),
            'label': label,
            'documented': label in DOCUMENTED,
            'inputs': inputs,
        }
        if label in DOCUMENTED:
            entry['expected'] = DOCUMENTED[label]
        presets.append(entry)

    # CO2 reads as CO2 with a subscript wherever the site shows it, and these
    # files carry the slider labels, units and help text. Applied to the values
    # this script emits rather than to the strings it was handed, so the
    # prototype constants stay as they were extracted. Identifier-bearing keys
    # keep their raw spelling: those name code, not text.
    RAW_KEYS = {'id', 'legacyId', 'slug', 'url', 'href', 'color', 'generated_by'}

    def subscript(value, key=None):
        if isinstance(value, str):
            return value if key in RAW_KEYS else value.replace('CO2', 'CO\u2082')
        if isinstance(value, dict):
            return {k: subscript(v, k) for k, v in value.items()}
        if isinstance(value, list):
            return [subscript(v, key) for v in value]
        return value

    OUT.mkdir(parents=True, exist_ok=True)
    notes = {
        'meta': {'generated_by': 'scripts/build_carried_data.py',
                 'note': 'thresholds only; the wording lives in src/ui/notes.ts'},
        'thresholds': NOTES_THRESHOLDS,
    }

    for name, payload in (('config', config), ('emulator', emulator),
                          ('markers', markers_json), ('population', population),
                          ('presets', {'presets': presets}), ('notes', notes)):
        text = json.dumps(subscript(payload), indent=1, ensure_ascii=False)
        (OUT / f'{name}.json').write_text(text + '\n')
        print(f'  wrote src/data/{name}.json')
    missing = [m['id'] for m in markers if m['kaya']['co2PerEnergy'] is None]
    if missing:
        print(f'  note: no carbon-intensity rate for markers {missing} '
              '(no calibration tick on that slider)')


if __name__ == '__main__':
    main()

# Data

Every number the interface shows comes from `src/data/*.json`. Nothing is typed
into the UI code. This file says where each series came from, when, and in what
units.

Two scripts write those files, split by whether the numbers can be rebuilt from
a primary source on this machine.

| Script | Writes | Rebuildable |
|---|---|---|
| `scripts/build_data.py` | `observed.json`, `analogues.json`, `base.json` | Yes, from the sources below |
| `scripts/extract_prototype.py` then `scripts/build_carried_data.py` | `config.json`, `emulator.json`, `markers.json`, `population.json`, `presets.json`, `notes.json` | No, carried from the prototype |

## Sources

### Energy Institute Statistical Review of World Energy 2026

Downloaded by hand each June, held at `/home/rpielke/EI-Stats-Review-2026.xlsx`
outside this repository because of its size. Sheets used:

- `CO2 from Energy`, world row, 1965 to 2024, million tonnes CO2. Covers CO2
  from energy only, with no cement or other industrial process emissions.
- `Total Energy Supply (TES) -EJ`, world row and country rows, 1965 to 2024,
  exajoules.
- `CO2 from Flaring`, world row, 1975 to 2024, million tonnes CO2. Used only in
  a base-year check.

The 2026 edition carries a 2025 estimate. It is excluded; the series stop at
2024, the last complete year.

**One trap.** The header row repeats the final year label three times: once for
the value, once for the year-on-year percentage change, and once for the share
of world total. Reading the header into a dictionary keyed by year silently
returns the share column, which is 1.0 for the world row. `read_sheet` cuts the
year block at the first non-monotonic repeat and asserts the world value is not
1.0.

### World Bank

Fetched live from the public API, no key needed, cached in
`scripts/_worldbank_cache.json`.

- `NY.GDP.MKTP.PP.KD`, GDP at purchasing power parity, constant 2021
  international dollars. World aggregate 1990 to 2024, and one 2024 value per
  country for the analogue table. The series begins in 1990, which is why every
  GDP-derived rate starts there.
- `SP.POP.TOTL`, world population. This is the UN World Population Prospects
  2024 revision as redistributed by the World Bank.

Country names in the Energy Institute workbook are joined to World Bank ISO3
codes through `scripts/country_iso3.py`, carried over from the decarbonization
project where it was checked against the World Bank country list. It covers 78
of the 80 country rows. Taiwan and USSR have no entry, deliberately: the World
Bank publishes no GDP series for either. Two names in that table have caused
silent drops before and are handled explicitly, `Türkiye` (renamed from `Turkey`
in the 2026 edition) and `Russian Federation`.

Venezuela drops out of the analogue table because the World Bank has no 2024
PPP GDP for it. The build prints every drop rather than swallowing it.

### Global Carbon Budget

Fetched from the Our World in Data redistribution
(`https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv`),
world rows only, cached in `scripts/_gcb_cache.json`.

Used for the base year, because the CMIP7 markers count all fossil and
industrial CO2 while the Energy Institute series covers energy and flaring
alone. For 2024:

| Component | GtCO2 |
|---|---|
| Fossil and industry, total | 38.599 |
| of which cement | 1.473 |
| of which flaring | 0.416 |
| of which other industry | 0.424 |
| Land use change | 4.586 |
| **Total CO2** | **43.185** |

That total is the basis the marker paths are on, which is what the marker values
for 2025 confirm: they span 42.4 to 43.8 with a mean of 43.08.

### ScenarioMIP CMIP7 marker runs

The seven marker emissions paths, their cumulative totals, their 2100 methane
and land use values, and the Kaya factors that place each marker's tick under
each slider. Five-yearly from 2025 to 2100, GtCO2 including land use.

**No primary source on this machine.** These came into the prototype from
ScenarioMIP and are lifted out of it by `scripts/extract_prototype.py`. Three
markers (LOW, LOW-to-NEGATIVE, VERY LOW) publish no carbon-intensity rate, so
those sliders carry four scenario ticks rather than seven.

### IIASA SSP database v3.2 (June 2025 release)

World population trajectories for SSP1, SSP2 and SSP3, five-yearly 2025 to 2100,
billions, aggregated from countries to world. Also carried from the prototype
with no primary source here.

The UN 2024 95% prediction interval for 2100 population, 9.0 to 11.4 billion
around a median of 10.2, is stated in the brief.

### FaIR v2.2

The emulator coefficients, fitted to FaIR runs of the seven markers using the
fair-calibrate v1.4.1 constrained ensemble. Carried from the prototype. See
METHODS.md for what the fit does and does not reproduce.

## The files

### `base.json`

The base-year state, all from 2024, the last complete year, applied at 2025.

| Field | Value | Units | Source |
|---|---|---|---|
| `populationBn` | 8.1409 | billions | World Bank `SP.POP.TOTL` |
| `gdpPerPersonUsd` | 21,393.2 | constant 2021 international $ | World Bank PPP GDP over population |
| `energyPerDollarMj` | 3.4002 | MJ per dollar | EI total energy supply over World Bank PPP GDP |
| `co2PerEnergyKgGj` | 65.181 | kg CO2 per GJ | Global Carbon Budget fossil and industry CO2 over EI total energy supply |
| `landUseGt` | 3.83 | GtCO2/yr | stated in the brief |
| `methaneMt` | 380 | Mt/yr | stated in the brief |

`superseded` records what the prototype used and why it changed. The old value
of 60.5 kg per GJ came from energy CO2 plus flaring alone, which started every
path about 4.4 GtCO2 below all seven markers.

Land use stays at the brief's 3.83 rather than the Global Carbon Budget's 4.59
for the same year. The gap sits well inside the uncertainty on that term, unlike
the cement omission, which was definite.

### `observed.json`

World history 1965 to 2024, the three Kaya factors derived from it, and the rate
windows the notes quote.

| Rate | Value | Period |
|---|---|---|
| Income per person | +1.90 %/yr | 1990 to 2024 |
| Energy per dollar | −1.43 %/yr | 1990 to 2024 |
| CO2 per unit energy | −0.21 %/yr | 1990 to 2024 |
| Income per person | +2.02 %/yr | 2015 to 2024 |
| Energy per dollar | −1.62 %/yr | 2015 to 2024 |
| CO2 per unit energy | −0.48 %/yr | 2015 to 2024 |

Window extremes, each reported with the window that produced it:

| Window | Highest | Lowest |
|---|---|---|
| Income, 25 years since 1990 | +2.23 %/yr (1994–2019) | +1.86 %/yr (1990–2015) |
| Energy per dollar, 25 years since 1990 | −1.36 %/yr (1990–2015) | −1.57 %/yr (1996–2021) |
| CO2 per unit energy, 30 years since 1965 | −0.17 %/yr (1992–2022) | −0.56 %/yr (1965–1995) |

Reported as plain highest and lowest rather than slowest and fastest, because
which end counts as slow progress flips with the sign of the series.

### `analogues.json`

66 economies, their 2024 CO2 and PPP GDP, and CO2 per dollar in kilograms.
Restricted to economies above 25 Mt CO2 and $40 billion. The build asserts the
count and prints anything dropped at the join.

### `markers.json`, `population.json`, `emulator.json`, `config.json`, `presets.json`, `notes.json`

Carried over, as above. `config.json` also keeps `prototypeBase`, the base-year
state the prototype used, so the two can be diffed.

## Vintages

| Source | Vintage | Checked |
|---|---|---|
| Energy Institute Statistical Review | 2026 edition | 2026-09-04 |
| World Bank PPP GDP and population | live API | 2026-09-04 |
| Global Carbon Budget via Our World in Data | live file | 2026-09-04 |
| ScenarioMIP CMIP7 markers | as carried in the prototype | 2026-09-04 |
| IIASA SSP database | v3.2, June 2025 release | 2026-09-04 |
| FaIR calibration | v2.2, fair-calibrate v1.4.1 | 2026-09-04 |

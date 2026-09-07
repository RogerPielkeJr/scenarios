# Data

Every number the interface shows comes from `src/data/*.json`. Nothing is typed
into the UI code. This file says where each series came from, when, and in what
units.

Two scripts write those files, split by whether the numbers can be rebuilt from
a primary source on this machine.

| Script | Writes | Rebuildable |
|---|---|---|
| `scripts/build_data.py` | `observed.json`, `analogues.json`, `base.json` | Yes, from the sources below |
| `scripts/build_wpp.py` | `learn_population.json` | Yes, from the UN download |
| `scripts/build_energy_intensity.py` | `learn_energy_intensity.json` | Yes, from the sources below |
| `scripts/build_fuel_mix.py` | `learn_fuel_mix.json` | Yes, from the sources below |
| `scripts/build_income.py` | `learn_income.json` | Yes, from the sources below |
| `scripts/build_methane.py` | `learn_methane.json` | Yes, from the EDGAR download |
| `scripts/build_land_use.py` | `learn_land_use.json` | Yes, from the cached Global Carbon Budget |
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

### UN World Population Prospects 2024

Two files, both fetched from the UN Population Division's own download area
and both keyed to the 2024 revision.

- `WPP2024_TotalPopulationBySex.csv.gz`, dated 13 December 2024, about 17 MB
  compressed. Every location, every variant, 1950 to 2100, population in
  thousands. Used for the world series, the low, medium, high, momentum and
  constant-fertility variants, the 95% prediction interval, and the seven
  regional totals the population builder adds up.
- `WPP2024_Demographic_Indicators_Medium.csv.gz`. Total fertility for the
  world in 1950, 1990, 2024 and 2100, and for each of the seven regions in
  2024.

Neither file is committed. `scripts/build_wpp.py` extracts the subset the site
uses into `scripts/_wpp_cache.json`, which is committed, so a build works
offline. Re-run with `--refresh` to fetch again.

**One check the build enforces.** The seven regions have to reproduce the UN's
own world figures at the low, medium and high variants, to within 0.002
billion. They do: 6.987, 10.180 and 14.395 billion. The build exits rather
than write a file whose regions sum to something the UN never published.

The 95% prediction intervals do not add up that way and the site says so on
the page: the regional lower bounds sum to 8.234 billion against a world lower
bound of 9.047, because the regions do not all land at the bottom of their own
ranges at once.

Africa is split into sub-Saharan Africa (an SDG region in the UN's own
hierarchy) and northern Africa (a subregion), which sum exactly to the UN's
Africa figure at every variant. That keeps the region carrying most of the
remaining growth on a control of its own.

### IPCC 2006 Guidelines, default carbon content

`Volume 2 (Energy), Chapter 1, Table 1.3`, read from the published PDF. Values
in kilograms of carbon per gigajoule, converted to CO2 at 44/12:

| Fuel | kgC/GJ | kgCO2/GJ |
|---|---|---|
| Other bituminous coal | 25.8 | 94.6 |
| Crude oil | 20.0 | 73.3 |
| Natural gas | 15.3 | 56.1 |

Nuclear, hydro, wind and solar carry none. Bioenergy carries none in
energy-sector accounting, where biogenic CO2 is reported under land use, which
is also how the Energy Institute's CO2 series treats it.

**Applied raw, these overstate what the world emits.** The 2024 mix gives
65.15 kgCO2 per GJ against the 59.94 the Energy Institute reports from energy
that year, mostly because part of the oil supply becomes plastics, lubricants
and bitumen rather than exhaust. `build_fuel_mix.py` records the ratio, 0.9201,
and the page applies it so today's mix reproduces today's intensity.

### Maddison Project Database 2023

Downloaded from the Dataverse copy the Groningen Growth and Development Centre
publishes, cached as `scripts/_mpd2023.xlsx` (5 MB, not committed) with the
extracted world series in `scripts/_maddison_cache.json` (committed).

Used for one thing: world output before 1990, where the World Bank's
purchasing-power series does not reach. The `Full data` sheet gives GDP per
capita and population by country and year. The build sums GDP over the **151
countries with an unbroken 1965 to 2022 record**, 96.5% of world GDP in 1990,
so each year compares the same economies as the last rather than a growing
sample.

Only the growth rates are used. The World Bank level in 1990 is carried
backwards on them, so every level from 1990 onward rests on the World Bank
alone.

**How much that choice decides.** Over the 32 years the two sources share, the
Maddison sample grows 3.46% a year and the World Bank series 3.19%. Carrying
the level back on growth rates adjusted to close that gap gives a 1965 energy
intensity of 5.86 MJ per dollar instead of 6.25, and a whole-record improvement
of −0.92% a year instead of −1.03%. Both figures appear on the page.

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

### `learn_population.json`

Everything the population Learn More page draws and builds from, in the shape
every Learn More data file uses: `series` for lines, `bands` for uncertainty,
`parts` for builder controls, `constants` for the numbers the prose quotes.

| Field | Value | Units |
|---|---|---|
| World, 2025 | 8.232 | billions |
| World peak, medium | 10.289 in 2084 | billions |
| World 2100, medium | 10.180 | billions |
| World 2100, 95% interval | 9.047 to 11.437 | billions |
| World 2100, low and high variants | 6.987 and 14.395 | billions |
| World 2100, momentum variant | 9.596 | billions |
| World 2100, constant fertility | 18.193 | billions |
| Total fertility, world | 4.85 (1950), 3.31 (1990), 2.25 (2024), 1.84 (2100) | births per woman |

The seven builder regions, 2100, billions:

| Region | Low | Medium | High | 2025 |
|---|---|---|---|---|
| Sub-Saharan Africa | 2.378 | 3.351 | 4.606 | 1.274 |
| Northern Africa | 0.319 | 0.462 | 0.648 | 0.276 |
| Asia | 3.074 | 4.613 | 6.677 | 4.835 |
| Europe | 0.413 | 0.592 | 0.824 | 0.744 |
| Latin America and the Caribbean | 0.400 | 0.613 | 0.905 | 0.668 |
| Northern America | 0.348 | 0.475 | 0.637 | 0.388 |
| Oceania | 0.053 | 0.073 | 0.098 | 0.047 |

**Not yet here: IHME.** The brief asks for the IHME projection alongside the UN
and the SSPs on that chart. The IHME data portal was unavailable when the page
was built, so the chart carries a line saying the projection joins it in a
later revision. Nothing on the page reports an IHME number.

### `learn_energy_intensity.json`

World energy intensity 1965 to 2024, and the rate of every 25-year window
inside it.

| Field | Value | Units |
|---|---|---|
| Intensity, 1965 | 6.2506 | MJ per dollar |
| Intensity, 1990 | 5.5442 | MJ per dollar |
| Intensity, 2024 | 3.4002 | MJ per dollar |
| Rate, 1965 to 2024 | −1.03 | %/yr |
| Rate, 1990 to 2024 | −1.43 | %/yr |
| Rate, 2015 to 2024 | −1.62 | %/yr |
| Primary energy, 1965 and 2024 | 149.7 and 592.2 | EJ |
| Energy growth, 1965 to 2024 | +2.36 | %/yr |
| Output growth, 1965 to 2024 | +3.42 | %/yr |

The 2024 intensity of 3.4002 MJ per dollar reproduces `base.json` exactly, and
the 1990 to 2024 rate of −1.4277 reproduces `observed.json`, because both rest
on the same World Bank series over those years.

The 35 windows of 25 years run from **−1.5675 %/yr (1996 to 2021)** to
**−0.4786 %/yr (1965 to 1990)**, with a median of −1.07. CMIP7 HIGH's −0.66
sits slower than 31 of the 35. The tool's own "Trend continues" rate of −1.62
sits faster than all 35.

### `learn_fuel_mix.json`

Shares of world primary energy by fuel, 1965 to 2024, the emission factors
above, and the two carbon-intensity series.

| Share of primary energy | 1965 | 2024 |
|---|---|---|
| Coal | 38.9% | 27.9% |
| Oil | 43.3% | 33.6% |
| Gas | 15.2% | 25.1% |
| Nuclear | 0.2% | 5.2% |
| Hydro | 2.2% | 2.7% |
| Wind and solar | 0.0% | 2.9% |
| Bioenergy and other | 0.2% | 2.6% |

Whatever the named fuels miss, biofuels most of it, joins bioenergy and other,
so the shares add to the total energy supply exactly. The build exits if they
do not sum to 100 in any year.

**Two intensities, and they differ.** On the basis the slider measures, which
includes cement, flaring and other industrial CO2 as the CMIP7 markers do, the
world ran 75.56 kgCO2 per GJ in 1965 and 65.18 in 2024. On combustion alone,
74.79 and 59.94. The 2024 slider-basis figure reproduces `base.json` exactly.

That gap changes the rate as well as the level: **−0.15%/yr from 1990 to 2024
on the slider's basis, −0.21%/yr on combustion alone**. The calibration mark
under the front page's slider used −0.21 until 2026-09-05 and now uses −0.15,
so the mark and the slider measure the same quantity; `config.json` keeps the
old figure under `supersededRates`. METHODS.md records what moved with it.

The non-combustion term, 5.237 kgCO2 per GJ in 2024, breaks down as cement
2.487, other industry 0.717, flaring 0.702, and 1.331 for the difference
between the Energy Institute and Global Carbon Budget inventories. Holding it
where it stands puts a floor of 5.237 kgCO2 per GJ under any fuel mix, which
caps the improvement this page can reach at −3.31%/yr.

### `learn_income.json`

World GDP per person 1965 to 2024, on the same spliced output series as the
energy-intensity page, divided by World Bank world population, plus the three
World Bank income groups from 1990.

| | Level, 2024 | Growth since 1990 | Past decade | Share of people | Share of output |
|---|---|---|---|---|---|
| World | $21,393 | +1.90 %/yr | +2.02 %/yr | | |
| High income | $58,645 | +1.53 %/yr | +1.53 %/yr | 17.4% | 47.8% |
| Middle income | $15,025 | +3.51 %/yr | +3.21 %/yr | 73.4% | 51.5% |
| Low income | $2,396 | +0.75 %/yr | +0.22 %/yr | 9.2% | 1.0% |

The 2024 world figure reproduces `base.json` exactly. The three groups cover
100.0% of world population and their population-weighted average comes to
$21,464, 0.3% above the world figure; the builder scales by that ratio.

The current World Bank classification is applied across the whole record, so no
country moves group mid-series.

### `learn_methane.json`

World anthropogenic methane by source, 1990 to 2023, from EDGAR's 2024 release,
summed from country and IPCC 2006 sector to five groups.

| Source | 1990 | 2023 | Share | Growth |
|---|---|---|---|---|
| Fossil fuels | 87.6 Mt | 118.7 Mt | 34.0% | +0.93 %/yr |
| Livestock | 102.2 Mt | 125.5 Mt | 35.9% | +0.63 %/yr |
| Rice | 39.1 Mt | 36.8 Mt | 10.5% | -0.19 %/yr |
| Waste | 42.7 Mt | 65.5 Mt | 18.7% | +1.31 %/yr |
| Other anthropogenic | 1.7 Mt | 3.1 Mt | 0.9% | +1.87 %/yr |
| **Total** | **273.2 Mt** | **349.6 Mt** | | **+0.75 %/yr** |

Rice is the one source that fell.

**EDGAR's inventory and the tool's base year differ.** EDGAR reaches 350 Mt for
2023; the tool uses 380 Mt. The Global Methane Budget 2000–2020 puts direct
anthropogenic emissions at 369 Tg a year for 2010–2019, range 350 to 391, so
both numbers sit inside the published range. The page scales each source by
1.086 so today's five reproduce the tool's base.

Natural wetlands, which the Global Methane Budget puts at 248 Tg a year
together with inland fresh water, sit outside the slider and outside this file.

### `learn_land_use.json`

The Global Carbon Budget land-use flux 1965 to 2024 with its uncertainty, its
decomposition, and the forest growth rates the restoration control uses.

| Field | Value |
|---|---|
| Flux, 1965 | 6.39 GtCO2/yr |
| Flux, peak | 8.02 GtCO2/yr in 1997 |
| Flux, 2024 | 4.59 GtCO2/yr |
| Uncertainty | ±2.57 GtCO2/yr (±0.7 GtC, 1σ) |
| Gross deforestation, 2014–2023 | 6.23 GtCO2/yr |
| Regrowth, 2014–2023 | 4.40 GtCO2/yr |
| Other transitions and peat | 2.20 GtCO2/yr (the remainder) |
| Net, 2014–2023 | 4.03 GtCO2/yr |

**Two figures for the same decade.** The Our World in Data redistribution
drawn on the chart averages 5.21 GtCO2 over 2014–2023; the Global Carbon
Budget 2024 paper reports 4.03 for that decade. The 1.18 GtCO2 between them,
most likely a vintage difference, sits well inside the ±2.57 uncertainty. The
page says so rather than choosing one silently.

Forest growth rates come from IPCC 2006 Volume 4, Table 4.9, in tonnes of dry
matter a hectare a year, converted at the 0.47 carbon fraction (Table 4.3) and
44/12:

| Stand | t d.m./ha/yr | tCO2/ha/yr |
|---|---|---|
| Tropical rain forest, South America, over 20 years | 3.1 | 5.3 |
| Young regrowth, Africa | 10.0 | 17.2 |
| Young regrowth, South America | 11.0 | 19.0 |
| Young regrowth, insular Asia | 13.0 | 22.4 |

Above-ground biomass only; below-ground carbon and soil add more.

### `analogues.json`

66 economies, their 2024 CO2 and PPP GDP, and CO2 per dollar in kilograms.
Restricted to economies above 25 Mt CO2 and $40 billion. The build asserts the
count and prints anything dropped at the join. GDP carries the comparison as
well as the ratio: the tile names the largest economy within 5% of the reader's
2100 world, not the nearest of any size, and says plainly that there is none
when nothing sits that close. See METHODS.md.

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
| UN World Population Prospects | 2024 revision, file dated 2024-12-13 | 2026-09-05 |
| Maddison Project Database | 2023 release | 2026-09-05 |
| EDGAR greenhouse gases | 2024 release, CH4 to 2023 | 2026-09-05 |
| Global Methane Budget | 2000–2020, published 2025 | 2026-09-05 |
| Global Carbon Budget paper | 2024, published 2025 | 2026-09-05 |
| IPCC 2006 Guidelines | Volumes 2 and 4 | 2026-09-05 |
| FaIR calibration | v2.2, fair-calibrate v1.4.1 | 2026-09-04 |

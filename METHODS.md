# Methods

What the tool calculates, how the four presets were derived, and what it does
not represent. `DATA.md` covers where the numbers come from.

## The emissions calculation

Emissions follow the Kaya identity. Four factors multiply together, and land use
CO2 is added on top as a separate term:

```
CO2 = population × (GDP ÷ population) × (energy ÷ GDP) × (CO2 ÷ energy)
      + land use CO2
```

The reader sets six numbers: the 2100 population, three annual rates that
compound from the base year, and 2100 values for land use CO2 and methane.

The base year is 2025, holding the observed 2024 state, since 2025 is not
complete in every source. The path runs one year at a time to 2100 and the
cumulative total sums every year.

### What the four factors cover

They cover **all fossil and industrial CO2, cement included**. This matters,
because the whole chart is the reader's line drawn against the seven CMIP7
marker lines, and those count all of it.

The prototype set base CO2 per unit of energy from the Energy Institute's
energy CO2 plus flaring, at 60.5 kg per GJ. That leaves out cement and other
industrial process emissions, roughly 1.9 GtCO2 a year, and it started every
path at 38.70 GtCO2 in 2025 while the markers started between 42.4 and 43.8. On
2026-09-04 the base was recalibrated to 65.181 kg per GJ, taken from Global
Carbon Budget fossil and industry CO2 over Energy Institute total energy supply.
Paths now start at 42.47, inside the marker range.

This changed results. Kaya at observed rates moved from 3,707 GtCO2 to 4,084,
which puts it above CMIP7 HIGH's 3,777 rather than below it. `presets.json`
keeps the figures stated before the recalibration under `brief_stated`, and a
test pins the size of the shift.

### Population

Population interpolates between the real IIASA SSP1, SSP2 and SSP3 world
trajectories on their 2100 endpoints, so the curve keeps a demographic shape:
SSP1 peaks at 9.29 billion around 2060 and declines, SSP3 rises throughout. A straight line or a
smoothstep between two endpoints could not do that.

Outside the SSP1 to SSP3 span, which is 8.09 to 12.98 billion in 2100, the
nearest curve is scaled by the ratio of the target to its own endpoint. That
keeps the shape and moves the level, and it also moves the 2025 end of the
curve: at the extremes of the slider the path starts from 6.04 or 8.79 billion
rather than 8.15. Both ends of the 6 to 14 billion slider reach this. A test
pins the behaviour so it cannot change unnoticed.

### Land use

Land use CO2 runs in a straight line from 3.83 GtCO2 today to whatever the
reader sets for 2100.

A line is a placeholder. The marker paths carry land use folded into their total
CO2 and publish no separate land use series here, so there is no shape to borrow
from them. If those series become available, the shape should follow them.

## Warming

Warming in 2100 above 1850 to 1900:

```
T = 1.7274 + 1.3100 × ln(1 + max(0, C) ÷ 1989.74) + 0.0012 × (CH4 − 380)
```

`C` is cumulative CO2 from 2025 to 2100 in gigatonnes and `CH4` is methane in
2100 in megatonnes a year. Methane adds about 0.12 °C per 100 Mt a year.

This is a curve fitted to FaIR v2.2 runs of the seven CMIP7 markers, using the
fair-calibrate v1.4.1 constrained ensemble. **It is indicative, not a model
result**, and the interface says so. Warming is never shown to more than two
decimal places.

### How well it reproduces FaIR

| Scenario | Cumulative CO2 (Gt) | Methane (Mt/yr) | Emulator | FaIR | Error |
|---|---|---|---|---|---|
| VERY LOW | 268 | 94.0 | 1.55 | 1.61 | −0.06 |
| LOW-to-NEGATIVE | 373 | 216.0 | 1.76 | 1.68 | +0.08 |
| LOW | 605 | 150.8 | 1.80 | 1.83 | −0.03 |
| MEDIUM-to-LOW | 1,710 | 203.4 | 2.33 | 2.20 | +0.13 |
| HIGH-to-LOW | 2,524 | 132.8 | 2.50 | 2.76 | **−0.26** |
| MEDIUM | 2,770 | 436.2 | 2.94 | 2.84 | +0.10 |
| HIGH | 3,777 | 533.1 | 3.31 | 3.26 | +0.05 |

Root mean square error 0.12 °C. Six of the seven fall within 0.15 °C.
HIGH-to-LOW does not.

### What the emulator cannot see

It reads cumulative CO2 and methane, and nothing else. Two paths reaching the
same total give the same answer however differently they got there. HIGH-to-LOW
is where that bites: it climbs to 51.6 GtCO2 a year in 2065, falls steeply
after that, and carries the second-lowest methane of the seven. A fit with no term for
the shape of the path has no way to tell it apart from a scenario that arrives
at 2,524 Gt smoothly, and it lands 0.26 °C low.

Refitting for one structural outlier would move numbers already in print for the
sake of a case the functional form cannot represent. The miss is documented and
pinned by a test instead.

## The four presets

Each loads all six inputs. The two bounds follow Ausubel's 1995 argument that
technological trajectories move at rates steady enough to bound the future, and
that a scenario halting them describes technical regression rather than business
as usual. **Neither bound assumes poverty. Neither assumes a technology stops
working.**

| Preset | Population | Income | Energy/$ | CO2/energy | Land use | Methane | Cumulative | Warming |
|---|---|---|---|---|---|---|---|---|
| Kaya at observed rates | 10.2 | +1.91 | −1.43 | −0.15 | 2.0 | 380 | 4,178 | 3.21 |
| Trend continues | 10.2 | +1.91 | −1.62 | −0.48 | 1.0 | 300 | 3,409 | 2.94 |
| Slowest technical progress | 11.4 | +2.23 | −1.36 | −0.17 | 2.0 | 450 | 5,047 | 3.47 |
| Ausubel methane economy | 9.0 | +1.91 | −1.57 | −2.79 | −1.0 | 150 | 1,585 | 2.22 |

**Kaya at observed rates.** The 1990 to 2024 record projected forward unchanged.
Income +1.91, energy per dollar −1.43 and CO2 per unit of energy −0.15 all come
straight out of the Energy Institute, World Bank and Global Carbon Budget
series. The carbon-intensity figure was −0.21 until 2026-09-05, on a narrower
basis; "The corrected carbon-intensity rate" below gives the change and what
moved with it.

**Trend continues.** The 2015 to 2024 rates, faster than the long record on both
technology terms: −1.62 and −0.48. Income stays at the long-record 1.91 rather
than the recent decade's 2.02.

**Slowest technical progress.** Every technological trajectory held at the
slowest sustained rate on record. Energy per dollar at −1.36 %/yr, the weakest
25-year window since 1990, which is 1990 to 2015. The fuel mix at −0.17 %/yr,
the weakest 30-year window since 1965, which is 1992 to 2022. Income at +2.23,
the fastest observed 25-year rate, 1994 to 2019, and population at 11.4 billion,
the top of the UN 2024 95% range, so emissions run as high as slow technology
permits.

**Ausubel methane economy.** Jesse Ausubel's 1988 published trajectory, which
squeezes carbon out of primary energy to 0.06 tonnes of carbon per kilowatt-year
by 2100, implying the fuel mix improving 2.79 %/yr. Energy per dollar at −1.57,
its fastest observed 25-year rate, 1996 to 2021, and income still growing at the
historical pace.

Every rate above is recomputed by `scripts/build_data.py` from the primary
sources rather than typed in, and the window that produced each one is recorded
alongside it.

### The three CMIP7 presets

Three further buttons load the Kaya factors that a marker itself reports. Two
land close to the scenario they name. VERY LOW cannot:

| Preset | Marker total | Preset reproduces | Gap |
|---|---|---|---|
| CMIP7 HIGH | 3,777 Gt | 3,838 Gt | +61 |
| CMIP7 MEDIUM | 2,770 Gt | 3,094 Gt | +324 |
| CMIP7 VERY LOW | 268 Gt | 1,298 Gt | +1,030 |

The reason is in the next section. The interface says so in place when one of
these is loaded rather than leaving the reader to notice.

## The Learn More pages

Each of the six assumptions gets a page that teaches the quantity, shows the
record, and hands the reader a value built from assumptions they control. The
pages share one scaffold (`src/ui/learn/page.ts`), one builder
(`src/ui/learn/builder.ts`) and one plot component (`src/ui/plot.ts`), and each
page module supplies only its own words, chart and arithmetic.

### What every figure carries

The mark, the source of its numbers and the analysis credit, in that order,
under every chart and every table on every page. The downloaded PNG draws the
same three in a band beneath the figure, and the downloaded workbook writes
the source and the credit under the table, because a figure that travels has
to answer for itself.

### The hand-off

A link on the top page carries the reader's scenario to a page as
`/learn/<slug>/?s=<six numbers>&n=<name>`, the same encoding share links use.
The page holds that string untouched. Two exits lead back:

- **Back to my scenario** returns `/#s=<the identical string>`.
- **Use in my scenario** returns `/?applied=<field>#s=<state with one field
  replaced>`. The top page names the value, scrolls that slider into view,
  lights it for 1.5 seconds, and then rewrites the address bar to a clean
  `/#s=…` so a copied link carries no stale message.

A builder value passes through `roundToStep` and then `clampWithFlag`
(`src/model/config.ts`), and the page prints the rounded value, and the clamp
when one bites, before the reader commits. No page duplicates any of that
arithmetic.

### The population builder

Seven regional 2100 populations, added up:

    world 2100 = Σ region 2100

Each control opens at the UN's medium variant and runs from the UN's low
variant to its high variant. The UN builds those two by subtracting and adding
half a child per woman at every date, and they add up across regions, so the
sum reproduces the UN's own world figures exactly: 6.987, 10.180 and 14.395
billion. `scripts/build_wpp.py` asserts that at build time.

Three consequences worth stating, all of them visible on the page:

1. The builder cannot reach the slider's floor of 6 billion. Every region at
   the UN's low variant still gives 6.99 billion.
2. It can exceed the slider's ceiling of 14 billion, which reports 14.395 and
   clamps to 14.
3. The 95% prediction intervals do not add up this way, and the page says so
   rather than summing them: the regional lower bounds give 8.234 billion
   against the UN's world lower bound of 9.047.

The reader's curve on that page comes from `populationAt` in
`src/model/population.js`, the same function the scenario itself uses, so the
shape on the Learn More page and the shape behind the top page agree.

### The energy per dollar builder

Two modes, both producing a rate in %/yr.

**A window from the record.** The reader picks two years and the builder takes
the compound rate between the observed intensities of those years:

    rate = ((intensity[end] / intensity[start]) ^ (1 / (end - start)) - 1) x 100

The second year is held at least ten years after the first, because a shorter
window measures a business cycle rather than a trend.

**A multiple of the observed rate.** The rate observed from 1990 to 2024,
−1.4277 %/yr, times a multiple the reader sets between 0 and 3.

Both modes report where the answer falls among the 35 windows of 25 years in
the record, as a count and as a percentile, and what today's 3.40 MJ per dollar
becomes by 2100 at that rate. The percentile counts windows that improved more
slowly than the chosen rate, so a faster rate scores higher.

The series behind all of it splices two sources at 1990; DATA.md gives the
method and the size of the difference between them.

### The CO2 per unit of energy builder

Seven fuel shares for 2100 plus one control for industrial CO2, in four steps:

1. **Normalise.** The seven shares are scaled to sum to 100, so only their
   proportions matter.
2. **Burn.** Each share meets its emission factor, and the sum is scaled by
   0.9201, the calibration that makes the 2024 mix reproduce the 2024 observed
   intensity. DATA.md explains where that factor comes from.
3. **Add what does not burn.** 5.237 kgCO2 per GJ of cement, flaring and other
   industrial CO2, times whatever the last control is set to.
4. **Take the rate.** From 65.181 kgCO2 per GJ today to that number in 2100:

       rate = ((intensity[2100] / 65.181) ^ (1 / 75) - 1) x 100

The page shows every intermediate number, because the interesting part of this
builder is the arithmetic rather than the answer. A mix with no fossil fuel in
it still leaves step 3, so the fastest rate reachable with industrial CO2
unchanged is −3.31%/yr.

### The income per person builder

Three modes.

**Set a rate.** The level in 2100 is `21,393.2 x (1 + rate/100) ^ 75`.

**Set a 2100 level.** The rate is the inverse: `((level / 21,393.2) ^ (1/75) - 1) x 100`.

**By income group.** Each group's average compounds at its own rate from its
own 2024 level, and the world average is the population-weighted sum, scaled by
0.9967 so the three groups reproduce today's world figure. Population shares
stay at today's values, which the page states, along with the direction of the
bias: the UN projects the low-income share rising, so holding shares still
overstates the world average a little.

### The methane builder

One control per source, added up. Each source's 2024 level is scaled by 1.086,
the ratio between the tool's 380 Mt base year and EDGAR's 350 Mt inventory
total, so today's five sources reproduce the number the slider starts from.
DATA.md explains why the two differ and why both sit inside the published range.

The page also reports what the answer is worth in the emulator, at 0.12 °C per
100 Mt against a reference of 380 Mt, and says plainly what that coefficient
cannot represent: it comes from a straight-line fit to seven FaIR runs and
ignores when the methane is emitted.

### The land use builder

Four flows netted into one 2100 figure:

    net = (deforestation + other transitions and peat) x scale
        - existing regrowth x scale
        - restored area x sequestration rate
        - engineered removal

with today's flows from the Global Carbon Budget: 6.23 GtCO2 of gross
deforestation, 2.20 of other transitions and peat, and 4.40 of regrowth. The
restoration term is a straight area-times-rate product, in millions of hectares
times tonnes of CO2 a hectare a year, divided by a thousand to reach GtCO2.

Engineered removal sits on this control because a product of four positive
factors cannot go below zero. Every marker that reaches net negative CO2 does
it through terms that land on this line.

## What a CMIP7 preset does and does not reproduce

Loading a CMIP7 preset sets the six sliders to the Kaya factors that marker
reports. Compounding those factors at a constant rate reproduces where the
marker ends up far better than how it gets there, and the interface now reports
both, computed rather than asserted (`markerFidelity` in
`src/model/flags.ts`).

| Preset | 2100 CO2, this tool | Marker | Cumulative, this tool | Marker | 2050, this tool | Marker |
|---|---|---|---|---|---|---|
| CMIP7 HIGH | 55.9 | 55.0 | 3,838 | 3,777 | 48.8 | 47.1 |
| CMIP7 MEDIUM | 34.0 | 34.4 | 3,094 | 2,770 | 43.3 | 36.1 |
| CMIP7 VERY LOW | −0.1 | −5.8 | 1,298 | 268 | 22.5 | −1.2 |

Two separate causes, and the interface names whichever applies:

**Shape.** A constant rate spreads one improvement evenly across 75 years,
while the markers bend. MEDIUM lands within 1% of its own 2100 emissions and
still accumulates 12% more over the century, because MEDIUM cuts hardest in the
2030s and 2040s. Reproducing that would need the markers' own factor
trajectories decade by decade, which the marker files here do not carry; see
DATA.md.

**Sign.** VERY LOW removes more CO2 than it emits from around mid-century. Four
factors multiplied together stay positive, so the fossil term cannot turn
negative at all, and only the land use slider can pull a path below zero. The
tool reproduces the descent as far as the point where VERY LOW's own emissions
cross zero and no further.

The chart brings the named marker's own published path forward whenever one of
those presets is loaded, so the divergence sits in front of the reader rather
than in a footnote.

## The corrected carbon-intensity rate

Until 2026-09-05 the mark under the CO2-per-energy slider read −0.21 %/yr,
which measures CO2 from energy over total energy supply. The slider itself
moves a wider quantity: the fossil and industrial CO2 the CMIP7 markers count,
cement included. On that basis the world improved **−0.15 %/yr** from 1990 to
2024, and the mark, the observed rate the notes compare against, and the "Kaya
at observed rates" preset now all use it.

What moved with it:

| | Before | After |
|---|---|---|
| Mark under the slider | −0.21 %/yr | −0.15 %/yr |
| "Kaya at observed rates", cumulative | 4,083.9 GtCO2 | 4,177.7 GtCO2 |
| "Kaya at observed rates", warming | 3.19 °C | 3.21 °C |

`config.json` keeps the old figure under `supersededRates` and the preset keeps
its old totals under `expected.superseded`, so anything published against the
earlier numbers can be traced. The two technology bounds still use window rates
measured on combustion alone, which `observed.json` derives from the Energy
Institute series; moving those would change the bounds themselves, and that has
not been done.

## How far the marker factors can be checked

The seven markers' Kaya factors arrived with the prototype and have no primary
source on this machine; verifying them needs the IIASA ScenarioMIP database,
which requires an account. Two checks are possible without it, and both were
run.

**Populations reconcile exactly.** HIGH takes SSP3's 12.98 billion, MEDIUM and
three others take SSP2's 9.89, HIGH-to-LOW and VERY LOW take SSP1's 8.09 to
8.12. Those match `population.json` to the last digit.

**The rates reconcile with each marker's own 2100 total, where a rate can
exist.** Compounding population, income and energy per dollar from the base
year, then solving for the carbon intensity rate that lands on the marker's own
2100 fossil CO2:

| Marker | Published rate | Rate implied by its own 2100 total |
|---|---|---|
| HIGH | −0.08 %/yr | −0.10 %/yr |
| MEDIUM | −0.87 %/yr | −0.85 %/yr |
| HIGH-to-LOW | −2.78 %/yr | −3.50 %/yr |
| MEDIUM-to-LOW | −3.06 %/yr | no rate reaches it |
| LOW, LOW-to-NEGATIVE, VERY LOW | none published | no rate reaches it |

HIGH and MEDIUM agree within 0.02 percentage points, which is as much
corroboration as an internal check can give. HIGH-to-LOW is 0.72 points out.

The last four rows are the interesting result. Those four markers reach 2100
with fossil and industrial CO2 **below zero** once their land-use term is
separated: −0.4, −3.7, −23.2 and −1.1 GtCO2 a year. A rate applied to a
positive quantity cannot reach a negative one, which explains why three of them
publish no carbon-intensity rate at all. It is the same structural limit the
CMIP7 preset note reports on the front page.

## What the tool does not represent

**Engineered carbon removal.** The four factors multiply to a positive number
whenever there are people, income and energy. Nothing in them can go below zero,
so a scenario that removes more carbon than it emits cannot be built here. Five
of the seven markers reach net negative CO2, VERY LOW from 2050 and HIGH-to-LOW
only in 2100, and the low ones rely on it.
The land use slider reaches −10 GtCO2 a year, which is the only sink the tool
has, and it stands in for land and engineered removal together.

**Gases other than CO2 and methane.** No nitrous oxide, no fluorinated gases.

**Aerosols.** Sulphate and other aerosols cool, and scenarios that burn less
coal lose that cooling as well as the warming. The emulator absorbs whatever
average relationship held across the seven markers and cannot separate it.

**Carbon cycle feedbacks.** Permafrost, weakening land and ocean sinks, and
anything else that makes the airborne fraction depend on the path rather than
the total. Whatever those contributed in the seven FaIR runs is baked into the
fitted curve at their average.

**Uncertainty.** One number is shown, not a range. The FaIR ensemble the fit
came from spans well over a degree at any given cumulative total. The emulator
reports its central behaviour.

**The timing of warming.** Only 2100 is reported, not the path to it or anything
after it.

**Internal consistency.** Nothing checks that the six assumptions belong
together. The coherence flags name a few combinations no marker contains, worded
as an observation rather than a block, because an unexamined combination is not
an impossible one. Nothing checks that the energy system implied by a given
efficiency and fuel mix could be built, financed or fuelled.

## The country comparison

The tile names the economy whose 2024 CO2 per dollar of GDP is closest to the
reader's 2100 world. It uses Energy Institute CO2 over World Bank purchasing
power GDP, restricted to 66 economies above 25 Mt CO2 and $40 billion, so a
small or poorly measured economy cannot become the answer. It compares one ratio
and nothing else: it does not say the world would resemble that country in any
other respect.

## The chart axis

The vertical axis is not fixed. It is chosen for each render to cover the
reader's path and all seven markers together, on round steps, with zero always
on it. Two things follow. A scenario that runs far above the published range
stays fully drawn rather than clipping at the top of a fixed axis. And the
seven markers stay on the same axis as the reader's line, so the comparison
holds however far the sliders are pushed, at the cost of the markers
compressing when the reader's path dwarfs them.

## Rounding

Warming is shown to two decimal places, never more. Cumulative CO2 is shown as a
whole number. Rates carry their sign, so +1.91 and −1.43 read as a pair.

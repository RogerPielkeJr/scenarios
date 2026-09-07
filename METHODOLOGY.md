# The site

An overview of what the THB Scenario Builder does, page by page, and how to
read what it puts on the screen. The two parts that follow this one give the
detail: **Methods** covers every calculation and every preset, **Data** covers
where each number came from, when, and in what units.

## What the tool does

The builder turns six assumptions into one emissions path from 2025 to 2100,
draws that path against the seven CMIP7 marker scenarios, and reports what the
path adds up to.

Nothing about the exercise depends on agreeing with any of the six numbers. The
point is the arithmetic that connects them: a reader who thinks the world will
decarbonise faster than the record can set that rate and watch what it does to
2100, on the same axis and against the same seven published scenarios as
everybody else.

## The six assumptions

Four of them multiply together in the Kaya identity, and two sit outside it:

| Slider | Sets | Range | Today |
|---|---|---|---|
| People in 2100 | A level | 6 to 14 billion | 8.14 billion |
| Income growth per person | A rate that compounds | −0.5 to +3.5 %/yr | $21,393 in 2024 |
| Energy needed per dollar | A rate that compounds | −4 to +0.5 %/yr | 3.40 MJ per dollar |
| Carbon per unit of energy | A rate that compounds | −4 to +0.5 %/yr | 65.18 kgCO2 per GJ |
| Land use CO2 in 2100 | A level | −10 to +5 GtCO2/yr | 3.83 GtCO2/yr |
| Methane in 2100 | A level | 80 to 600 Mt/yr | 380 Mt/yr |

The first four decide fossil and industrial CO2, cement included. Land use CO2
adds on top as a separate term, running in a straight line from today to
whatever the reader sets. Methane changes nothing about the CO2 path and enters
only through the warming figure.

The base year is 2025, carrying the observed 2024 world, because 2025 has not
closed in every source.

## What the chart shows

One heavy line for the reader's scenario, seven lighter lines for the CMIP7
markers, and annual CO2 including land use on the vertical axis.

That axis moves. Every render picks an axis that covers the reader's path and
all seven markers together, on round steps, with zero always on it. A scenario
far above the published range stays fully drawn instead of clipping, and the
seven markers never leave the axis the reader's own line sits on.

Whatever the reader types into **Name your scenario** names the line on the
chart, the column in the table, and every file the page hands back.

## The four figures under the chart

- **Cumulative CO2, 2025 to 2100.** Every year of the path, summed, in
  gigatonnes.
- **Warming in 2100 above 1850–1900.** A curve fitted to FaIR v2.2 runs of the
  seven markers, reading cumulative CO2 and 2100 methane and nothing else.
  Indicative, not a model result, and never shown to more than two decimals.
- **Added warming from now.** The same figure measured against the 2015–2024
  average of 1.24 °C rather than against 1850–1900.
- **Your 2100 world looks like.** The largest economy whose 2024 CO2 per dollar
  of GDP sits within 5% of the reader's 2100 world, drawn from 66 economies
  large enough to measure well. Largest, rather than nearest, so the comparison
  lands on an economy the reader recognises instead of whichever small one
  happens to sit on the number. It compares that one ratio and says nothing else
  about the country.

Load one of the four CMIP7 presets and the first three figures report what
that scenario published, rather than the reconstruction, until a slider moves.

## The eight preset buttons

Four presets come from the record and from the two technology bounds; four load
the Kaya factors a CMIP7 marker reports. Those four are the markers of the seven
that publish a carbon-intensity rate.

| Preset | Cumulative CO2 | Warming in 2100 |
|---|---|---|
| Kaya at observed rates | 4,178 Gt | 3.21 °C |
| Trend continues | 3,409 Gt | 2.94 °C |
| Slowest technical progress | 5,047 Gt | 3.47 °C |
| Ausubel methane economy | 1,585 Gt | 2.22 °C |

Every rate behind those four comes out of `scripts/build_data.py`, recomputed
from the primary series rather than typed in, and the window that produced each
one travels with it.

The four CMIP7 presets reproduce where a marker ends up far better than how it
gets there, and three of them cannot reach the scenario they name at all. The
interface reports the gap in place, computed on the spot, whenever one of them
loads. **Methods** gives the three reasons — the shape of the path, the sign of
the emissions, and the timing of the land-use sink — and the size of each miss.
MEDIUM-to-LOW is the one that lands below its marker rather than above.

## The Learn More pages

Six pages, one per assumption. Each teaches the quantity, shows what the world
has done, and hands back a value the reader built rather than guessed:

- **Population** adds up seven regional 2100 populations, each running between
  the UN's low and high variants.
- **Income per person** works in any of three directions: set a rate, set a 2100
  level, or build the world average out of the three World Bank income groups.
- **Energy per dollar** takes a compound rate from any two years of the record,
  or a multiple of the observed rate, and says where the answer falls among the
  35 twenty-five-year windows the world has actually run.
- **CO2 per unit of energy** builds a 2100 fuel mix out of seven shares, burns
  it against the IPCC emission factors, adds the industrial CO2 that no fuel
  switch touches, and takes the rate that lands there.
- **Land use** nets four flows — deforestation, other transitions and peat,
  existing regrowth, restored area — plus engineered removal.
- **Methane** sets one control per source, scaled so today's five sources
  reproduce the 380 Mt the slider starts from.

A page shows the arithmetic at every step, not just the answer. **Use in my
scenario** carries the value back to the builder, which names it, scrolls to
that slider and lights it; **Back to my scenario** returns the six numbers
untouched.

## What travels with a scenario

Six numbers and a name, encoded in the address. Every link off every page
carries them, so a reader who steps out to a Learn More page, the library or
the bibliography comes back to the scenario they left. **Copy link to this
scenario** hands over that same address.

The builder downloads a PNG and a PDF of the whole scenario sheet. Every figure
on every page downloads two ways: as a PNG carrying the figure's title, the
drawing and the numbers under it, and as a spreadsheet of those numbers. Where
a figure rests on more rows than an image can hold, the PNG prints an evenly
spaced sample and says so; the spreadsheet always carries every row.

## What every figure carries

The Honest Broker mark, the source of the numbers, and the analysis credit, in
that order, under every chart and every table on the site. The downloaded PNG
draws the same three underneath the figure and the spreadsheet writes the last
two under the table, because a figure that travels has to answer for itself.

## The library and the bibliography

The **library** collects the posts at The Honest Broker that make the argument
this tool grew out of, grouped by what each one argues. The **bibliography**
lists every work the site draws on, each with a link and a plain-language note
on what it supplied, and it generates the Learn More section of that list from
the pages themselves, so a source cited on a page cannot go missing from the
list.

## What the tool does not do

Stated in full in **Methods**, and worth having up front:

- Nothing engineered removal does can come out of the four Kaya factors, which
  stay positive whenever there are people, income and energy. The land use
  slider carries the only sink, and it stands in for land and engineered
  removal together.
- No nitrous oxide, no fluorinated gases, no aerosols as a term of their own.
- No carbon cycle feedbacks that depend on the path rather than the total.
- One warming number, not a range. The FaIR ensemble behind the fit spans well
  over a degree at any given cumulative total.
- Only 2100, not the path of warming to it or anything after it.
- No check that six assumptions belong together. A handful of combinations no
  marker contains get named as an observation, not blocked.

## How to check any of it

Every number the interface shows comes from a JSON file under `src/data/`, and
nothing gets typed into the interface code. **Data** names the script that
writes each file, the source it reads, and the vintage of that source. The
scripts that can rebuild from a primary source say so; the few series carried
over from the prototype say that instead, and name what would verify them.

# Build your own THB emissions scenario

The dashboard published at **scenarios.thehonestbroker.org**. A reader sets six
assumptions and sees where the century lands, against what the world has
actually done and against the seven published CMIP7 marker scenarios.

Analysis by Roger Pielke Jr., The Honest Broker.

- `DATA.md` lists every series, its source, its vintage and its units.
- `METHODS.md` explains the calculation, the emulator, the four presets and
  what the tool does not represent.

## Local development

Node 22.12 or later.

```sh
npm install
npm run dev          # http://localhost:5173
```

Other commands:

```sh
npm run build        # typecheck, then build to dist/
npm run preview      # serve the built site
npm test             # model and render tests (Vitest)
npm run test:visual  # screenshots at four widths (Playwright)
npm run typecheck
```

Reviewing over SSH: build, then serve `dist/` and forward the port.

```sh
npm run build && npx vite preview --port 4173 --strictPort
```

Then from your machine: `ssh -L 4173:localhost:4173 rpielke@<host>` and open
`http://localhost:4173`.

## Rebuilding the data

Every number the interface shows comes from `src/data/*.json`. Nothing is typed
into the UI code. Two scripts write those files, split by where the numbers come
from.

```sh
npm run build:data                        # the front page, from primary sources
python3 scripts/build_data.py --refresh   # same, ignoring the cached downloads
python3 scripts/extract_prototype.py      # re-read the prototype's constants
python3 scripts/build_carried_data.py     # write the carried-over data files
```

One script per Learn More page, each cacheing its own download:

```sh
python3 scripts/build_wpp.py              # UN population, for /learn/population/
python3 scripts/build_income.py           # World Bank income groups, for /learn/income/
python3 scripts/build_energy_intensity.py # EI, World Bank and Maddison
python3 scripts/build_fuel_mix.py         # EI fuel shares and IPCC emission factors
python3 scripts/build_methane.py          # EDGAR methane by sector
python3 scripts/build_land_use.py         # Global Carbon Budget land-use flux
```

Each takes `--refresh` to fetch again rather than read its cache. The raw
downloads stay out of the repository; the extracted subsets are committed, so a
build works offline.

`build_data.py` reads the Energy Institute workbook at
`/home/rpielke/EI-Stats-Review-2026.xlsx`, the World Bank API and the Global
Carbon Budget, and writes `observed.json`, `analogues.json` and `base.json`. It
caches its downloads in `scripts/_worldbank_cache.json` and
`scripts/_gcb_cache.json`, both committed, so a build works offline.

`extract_prototype.py` and `build_carried_data.py` handle the numbers that have
no primary source on this machine, which arrived with the prototype: the CMIP7
marker paths, the SSP population curves and the emulator fit. See DATA.md.

Both the scripts and their outputs are committed. Run the scripts when a source
is updated, then commit the changed JSON.

## The social card

`public/social-card.png` is what a link to the site renders as on Substack,
Bluesky or X. Every page points `og:image` at it.

```sh
python3 scripts/build_social_card.py
```

It needs `Pillow`, takes its fonts from `matplotlib`, and shells out to
`scripts/emit_card_path.mjs` for the heavy line so the card draws a path the
site's own model produced rather than a second copy of the Kaya identity
written in Python. It refuses to write the card if that path drifts from the
preset's frozen total. Commit the PNG: as with the PDF, the deploy workflow
runs no Python.

## The methodology PDF

`public/thb-scenario-builder-methodology.pdf` binds `METHODOLOGY.md`,
`METHODS.md` and `DATA.md` into one branded document, reachable from the button
at the top of the library page and from the link under the front page lead-in.

```sh
npm run build:pdf     # python3 scripts/build_methodology_pdf.py
```

It needs `reportlab` and takes its fonts from whichever `matplotlib` the
interpreter finds. **Run it and commit the PDF after editing any of the three
markdown files** -- the deploy workflow has no Python step, so Vite copies
whatever sits in `public/` and nothing rebuilds the document on the way out.
`tests/pages.test.ts` checks that the file exists and that both links point at
it, so a missing PDF fails CI rather than 404ing on the live site.

## Pages

| URL | File | What it is |
|---|---|---|
| `/` | `index.html` | The THB Scenario Builder |
| `/bibliography.html` | `bibliography.html` | The book, the scenarios work, the sources |
| `/library.html` | `library.html` | The Honest Broker posts on scenarios, in `src/library/entries.ts` |
| `/learn/` | `learn/index.html` | Index of the six Learn More pages |
| `/learn/population/` | `learn/population/index.html` | Population |
| `/learn/income/` | `learn/income/index.html` | Income per person |
| `/learn/energy-intensity/` | `learn/energy-intensity/index.html` | Energy per dollar |
| `/learn/carbon-intensity/` | `learn/carbon-intensity/index.html` | CO2 per unit of energy |
| `/learn/land-use/` | `learn/land-use/index.html` | Land use CO2 |
| `/learn/methane/` | `learn/methane/index.html` | Methane |
| `/404.html` | `404.html` | What GitHub Pages serves for any address it cannot match |

Every page is a Vite entry point, carries the masthead and the toolbar, and is
checked by `tests/pages.test.ts`. The `learn/…/index.html` layout gives clean
URLs on GitHub Pages with no rewrite rules. The 404 page stands apart: it
builds nothing in the browser, carries no scenario, tells crawlers to skip it,
and stays out of the sitemap.

The front page also carries the **scenario strip** (`src/ui/strip.ts`), fixed to
the foot of the window and shown only while the chart sits off screen. The six
sliders run down a column taller than the chart beside them, and below 860px
they sit above it entirely, so a reader working the lower sliders would
otherwise have no way to watch the answer change. The strip and the four tiles
both draw from `scenarioSummary` in `src/ui/stats.ts`, so the two can never
disagree. It carries the name "strip" because the sliders took `.readout`
first, for the large value under each track.

Every toolbar link off a page goes through `linkToolbar` in `src/ui/toolbar.ts`,
which writes the reader's scenario into the href. A link the function cannot
find by id keeps its bare path and hands the next page the defaults.

Every page also carries a work-in-progress notice in its footer, with the words
"Provide feedback" in a `[data-feedback]` span. Set `FEEDBACK_URL` in
`src/ui/toolbar.ts` and `linkFeedback` -- which `linkToolbar` already calls on
every page -- turns those words into a link everywhere at once.

## Adding a Learn More page

All six pages exist, one per slider, listed in `src/learn/registry.ts`. To add
another, or to rebuild one from scratch:

1. **Data.** Write a build script under `scripts/` that fetches from a primary
   source and writes `src/data/learn_<slug>.json` in the shared shape:
   `meta`, `series`, `bands`, `parts`, `constants`. Cache the extracted subset
   under `scripts/_<name>_cache.json` and commit that, never the raw download.
   Record the source, vintage and units in `DATA.md`.
2. **Page module.** Add `src/learn/<slug>.ts` exporting a `LearnPageSpec`
   (`src/learn/types.ts`): title, standfirst, `accent`, definition box, chart
   block, `drivers`, `markers`, builder and sources. The scaffold fixes the
   order the sections appear in — builder first, then the reading — so a page
   supplies words, colour and arithmetic only. Give the page an `accent` no
   other page uses and none of the seven scenario colours use; it carries the
   kicker, the headings, the sliders and the builder.
3. **Entry point.** Add `src/learn/main-<slug>.ts` (four lines, copy
   `main-population.ts`) and `learn/<slug>/index.html` (copy the population
   shell, change the title, heading and script path).
4. **Register it.** Flip that entry to `status: 'live'` in
   `src/learn/registry.ts`. That one change adds the link above the slider on
   the top page, opens the entry on `/learn/`, and links the factor in the
   identity graphic on every other page.
5. **Build it.** Add `'learn-<slug>': 'learn/<slug>/index.html'` to `PAGES` in
   `vite.config.ts`. `tests/pages.test.ts` fails if you forget.
6. **Test it.** Extend `tests/learn.test.ts` with the page's builder
   arithmetic, and add its screenshots to `tests/visual.spec.ts`.
7. **Write it up.** The builder's arithmetic and its assumptions go in
   `METHODS.md`.

Every figure gets a PNG and an XLS button without the page asking: the
scaffold builds the spreadsheet from the same spec the chart draws
(`plotTable` and `stripTable` in `src/ui/plot.ts`), so the numbers a reader
downloads can never disagree with the picture. XLS means SpreadsheetML, a
single XML file Excel and LibreOffice both open, written by
`src/ui/figure.ts` with no library.

Every figure and every table also carries the same three things: the THB
mark, the source of its numbers, and the analysis credit. A page names its
sources in `chart.dataSource` and `chart.extra.dataSource`; the scaffold puts
them under the figure, the XLS writes them into the workbook, and the PNG
draws them in a band under the drawing, so a figure that leaves the site says
where it came from.

Rules the six pages hold to: import the model from `src/model/`, duplicate no
arithmetic and no constants, put every number in `src/data/*.json`, give no
text block a ch-based maximum width, and label the reader's own line with
`readerLabel(scenario, fallback)` so a named scenario carries its name onto
every page. Write in the active voice and avoid forms of the verb "to be";
`tests/` will not catch that, so read the prose back.

## Sending someone a copy

```sh
python3 scripts/build_single_file.py                      # the dashboard
python3 scripts/build_single_file.py --page bibliography  # the other page
```

Each run builds that page on its own and inlines the CSS, the JavaScript and
the logo, writing `dist-single/standalone*.html`, which works straight off the
filesystem with no server. Pass `--rewrite from=to` to repoint a link that will
not exist beside a single file, for example
`--rewrite /bibliography.html=https://example.com/bibliography`.

## Tests

```sh
npm test
```

- `kaya.test.ts`, `population.test.ts`, `emulator.test.ts` cover the model.
- `presets.test.ts` checks each preset reproduces its documented cumulative CO2
  and warming, and pins the gaps that are known and deliberate.
- `render.test.ts` mounts the whole page against a DOM stub and asserts that
  every summary tile fills, for all seven presets and at both ends of all six
  sliders. This is the guard against a broken edit killing the render halfway
  through and leaving tiles empty. It also covers naming a scenario, the
  preset buttons and a value arriving from a Learn More builder.
- `state.test.ts` covers the share encoding, including a link written before
  scenarios could be named, and the rounding and clamping a builder value
  passes through.
- `learn.test.ts` mounts the population page against the same stub: every
  panel renders, the chart draws, the builder produces the sum its inputs
  imply, and a state string survives the round trip with one field changed and
  five untouched.

Playwright takes screenshots at 360, 768, 1280 and 1600 pixels in both themes,
committed under `tests/screenshots/`. Update them deliberately:

```sh
npm run test:visual:update
```

## Deploying to GitHub Pages

The site is static with no backend. `public/CNAME` carries
`scenarios.thehonestbroker.org` and the build copies it into `dist/`, matching
how the other Honest Broker dashboards are published. The repository lives at
`github.com/RogerPielkeJr/scenarios`, on `main`, which is the branch
`.github/workflows/deploy.yml` fires on.

First time, in this order. The last step comes last for a reason: the
decarbonization dashboard carries a commit that links here, and those links
lead nowhere until the domain resolves.

```sh
gh repo create RogerPielkeJr/scenarios --public --source . --push
```

1. In the repository settings, under Pages, set the source to **GitHub
   Actions**. The workflow runs typecheck and the Vitest suite, builds, and
   deploys; it does not run Playwright, which needs browsers.
2. At Cloudflare, add a CNAME record for `scenarios` pointing at
   `rogerpielkejr.github.io`, **DNS only**, proxy off.
3. Wait for the certificate, then check that
   `https://scenarios.thehonestbroker.org` serves the front page and that
   `/learn/population/` resolves as a clean URL.
4. Only then `git -C ../decarbonization push`, which puts the reciprocal links
   live on that site.

After that, every push to `main` builds and publishes.

To deploy by hand instead:

```sh
npm run build
npx gh-pages -d dist
```

### Deploying to Cloudflare Pages instead

Nothing in the build depends on GitHub Pages. In the Cloudflare dashboard,
connect the repository, set the build command to `npm run build` and the output
directory to `dist`, then add `scenarios.thehonestbroker.org` as a custom
domain. Delete `public/CNAME` if you go this way, since Cloudflare does not use
it.

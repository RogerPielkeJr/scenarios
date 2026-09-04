# Build your own emissions scenario

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
npm run build:data                      # from primary sources
python3 scripts/build_data.py --refresh # same, ignoring the cached downloads
python3 scripts/extract_prototype.py    # re-read the prototype's constants
python3 scripts/build_carried_data.py   # write the carried-over data files
```

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
  through and leaving tiles empty.

Playwright takes screenshots at 360, 768, 1280 and 1600 pixels in both themes,
committed under `tests/screenshots/`. Update them deliberately:

```sh
npm run test:visual:update
```

## Deploying to GitHub Pages

The site is static with no backend. `public/CNAME` carries the custom domain and
is copied into `dist/` by the build, matching how the other Honest Broker
dashboards are published.

First time:

1. Create the repository and push.
2. In the repository settings, under Pages, set the source to GitHub Actions.
3. At Cloudflare, add a CNAME record for `scenarios` pointing at
   `<user>.github.io`, DNS only, with the proxy off.

After that every push to `main` builds and publishes through
`.github/workflows/deploy.yml`.

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

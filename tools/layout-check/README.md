# Layout check

`check_layout.js` loads the built site (`dist/`) at 1360, 1024, 768 and 390
pixels wide: every page, with every slider at its minimum and at its maximum, and
with each preset and the theme toggle clicked. It fails on chart (SVG) text that
overlaps other text or crosses the edge of a filled shape, chart text that runs
past the chart's edge, a page that scrolls sideways, or a script error.

`.github/workflows/layout-check.yml` runs it on every push to `main` and every
pull request, and attaches screenshots of anything that fails. It checks layout
rules rather than comparing images, so unlike the committed screenshot baselines
it runs the same on any machine. The same script runs on thehonestbroker.org and
the other THB dashboards; thb-empire's `tests/layout/` holds the reference copy.

Run it locally after `npm run build`:

    cd tools/layout-check && npm install && npx playwright install chromium && cd ../..
    (cd dist && python3 -m http.server 8765 --bind 127.0.0.1 &)
    node tools/layout-check/check_layout.js --root dist --shots /tmp/layout-failures

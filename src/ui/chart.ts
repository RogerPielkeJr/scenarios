import { BASE_YEAR, END_YEAR } from '../model/config.js';
import { MARKERS, MARKER_YEARS } from '../model/markers.js';
import { at } from '../model/types.js';
import { spreadLabels } from './ticks.js';

// Height leaves room for the year labels below the plot and nothing more.
// The PNG export draws the viewBox straight onto a canvas, so any slack here
// becomes a dead band in the downloaded image.
const VIEW = { width: 660, height: 392 };
// `top` leaves room above the highest gridline for the axis label, which
// otherwise prints on top of the topmost number.
const PLOT = { left: 56, right: 588, top: 40, bottom: 350 };
const LABEL_GAP = 19;

/*
 * Type on the chart, in viewBox units.
 *
 * Larger and heavier than the page's own small print: the chart is the thing
 * a reader screenshots, exports as a PNG and reprints somewhere else, where
 * none of the surrounding page comes with it and 12px axis numbers turn to
 * grey mush. LABEL_GAP above rises with `markerLabel` -- the spreader keeps
 * the scenario names apart in viewBox units, so bigger text needs more room
 * between the lines or two of them touch.
 */
const TYPE = {
  axisNumber: 15,
  axisLabel: 15.5,
  yearLabel: 15.5,
  markerLabel: 15,
  userLabel: 17,
} as const;
/**
 * Half the visual height of a line of text, as a fraction of its size.
 *
 * Cap height runs about 0.72 of the size in this face, so text centred on a
 * position reaches roughly 0.36 of its size either way. Both the placement
 * above and the baseline it returns work from this one number.
 */
const CAP_RATIO = 0.36;
/**
 * What full clearance of the gridlines is worth, in units of drift.
 *
 * Ranking gridline clearance above proximity outright sent the label to the
 * far side of the plot whenever the only gridline-free slots lay there, and a
 * name three-quarters of the chart away from the line it names is worse than
 * a name printed over a hairline. At 3 the label will move about 24 units to
 * clear a gridline and no further.
 */
const GRID_WEIGHT = 1;

/** Roughly how many horizontal gridlines to aim for. */
const TARGET_GRIDLINES = 8;
/** Steps a reader can do arithmetic on, scaled by powers of ten. */
const NICE_STEPS = [1, 2, 2.5, 5, 10];

export interface Scale {
  min: number;
  max: number;
  step: number;
}

/**
 * Picks an axis that covers `low` to `high` and lands on round numbers.
 *
 * Zero is always on the axis, because the whole chart turns on whether a
 * path has crossed into net negative emissions, and an axis that hides the
 * line makes that impossible to see.
 */
export function niceScale(low: number, high: number, targetLines = TARGET_GRIDLINES): Scale {
  const lowest = Math.min(low, 0);
  const highest = Math.max(high, 0);
  const span = Math.max(highest - lowest, 1);
  const rough = span / Math.max(targetLines - 1, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = (NICE_STEPS.find((candidate) => candidate * magnitude >= rough)
    ?? NICE_STEPS[NICE_STEPS.length - 1] ?? 10) * magnitude;
  return {
    min: Math.floor(lowest / step) * step,
    max: Math.ceil(highest / step) * step,
    step,
  };
}

// Literal font stacks rather than the CSS custom properties used elsewhere.
// Colours stay as var() so the chart follows the theme, and the PNG export
// resolves them against the live page; fonts do not change with the theme
// and a var() in a font-family presentation attribute is not worth the risk.
const SANS = "'IBM Plex Sans',system-ui,sans-serif";
const MONO = "'IBM Plex Mono',ui-monospace,monospace";

const xFor = (year: number) => PLOT.left
  + ((year - BASE_YEAR) / (END_YEAR - BASE_YEAR)) * (PLOT.right - PLOT.left);

const yWith = (scale: Scale) => (value: number) => PLOT.bottom
  - ((value - scale.min) / (scale.max - scale.min)) * (PLOT.bottom - PLOT.top);

/** Everything the chart needs of a path: a year and a total, each year. */
export interface DrawablePath {
  points: ReadonlyArray<{ year: number; co2Gt: number }>;
}

/**
 * The axis covers the reader's path and all seven markers, so the two stay
 * comparable however far the sliders are pushed, and nothing is ever drawn
 * outside the plot.
 */
function scaleFor(path: DrawablePath): Scale {
  const values = [
    ...path.points.map((point) => point.co2Gt),
    ...MARKERS.flatMap((marker) => [...marker.co2Gt]),
  ];
  return niceScale(Math.min(...values), Math.max(...values));
}

/** Axis numbers: no more decimals than the step actually needs. */
function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gridlines(scale: Scale, yFor: (v: number) => number): string {
  let svg = '';
  const lines = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= lines; i += 1) {
    const value = scale.min + i * scale.step;
    const y = yFor(value);
    const weight = value === 0 ? 1.6 : 0.7;
    svg += `<line x1="${PLOT.left}" x2="${PLOT.right}" y1="${y}" y2="${y}" `
      + `stroke="var(--rule)" stroke-width="${weight}"/>`;
    svg += `<text x="${PLOT.left - 10}" y="${y + 5}" text-anchor="end" `
      + `font-family="${MONO}" font-size="${TYPE.axisNumber}" font-weight="500" `
      + `fill="var(--dim)">${format(value)}</text>`;
  }
  return svg;
}

/**
 * Year labels along the bottom. The first is anchored at its start and the
 * last at its end, so neither can overhang the plot and collide with the
 * axis label or the scenario labels.
 */
function yearLabels(): string {
  const years = [2025, 2050, 2075, 2100];
  return years.map((year, index) => {
    const anchor = index === 0 ? 'start' : (index === years.length - 1 ? 'end' : 'middle');
    return `<text x="${xFor(year)}" y="${PLOT.bottom + 25}" text-anchor="${anchor}" `
      + `font-family="${SANS}" font-size="${TYPE.yearLabel}" font-weight="600" `
      + `fill="var(--dim)">${year}</text>`;
  }).join('');
}

function markerPaths(yFor: (v: number) => number, highlight: string | null): string {
  return MARKERS.map((marker) => {
    const d = MARKER_YEARS.map((year, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${xFor(year).toFixed(1)},${yFor(at(marker.co2Gt, index)).toFixed(1)}`;
    }).join('');
    // A loaded CMIP7 preset brings its own marker forward, so the reader can
    // see how far a constant rate drifts from the path it names.
    const lit = marker.id === highlight;
    return `<path d="${d}" fill="none" stroke="${marker.color}" `
      + `stroke-width="${lit ? 2.6 : 1.6}" opacity="${lit ? 0.95 : 0.42}" `
      + `data-marker="${marker.id}"${lit ? ' data-highlight="1"' : ''}/>`;
  }).join('');
}

/** Right-edge scenario labels, pushed apart and given leader lines. */
function markerLabels(yFor: (v: number) => number, highlight: string | null): string {
  const placed = spreadLabels(
    MARKERS.map((marker) => ({
      value: marker,
      at: yFor(at(marker.co2Gt, marker.co2Gt.length - 1)),
    })),
    LABEL_GAP,
  );
  return placed.map(({ value: marker, anchor, at: y, moved }) => {
    const leader = moved
      ? `<line x1="${PLOT.right}" x2="${PLOT.right + 7}" y1="${anchor.toFixed(1)}" `
        + `y2="${y.toFixed(1)}" stroke="${marker.color}" stroke-width="1" opacity="0.5"/>`
      : '';
    return `${leader}<text x="${PLOT.right + 10}" y="${(y + 5).toFixed(1)}" `
      + `font-family="${SANS}" font-size="${TYPE.markerLabel}" font-weight="700" `
      + `fill="${marker.color}" `
      + `opacity="${marker.id === highlight ? 1 : 0.9}">${escapeText(marker.id)}</text>`;
  }).join('');
}

/**
 * How many characters of a name the chart draws before it cuts.
 *
 * Wide enough for every label the tool writes itself. With a published
 * scenario on screen the label reads "CMIP7 <marker> as published", and the
 * longest of those, CMIP7 LOW-to-NEGATIVE, runs 34 characters. At 30 the
 * chart ellipsised its own words: CMIP7 MEDIUM-to-LOW came out as "CMIP7
 * MEDIUM-to-LOW as publis...". A reader's own name still cuts here, and the
 * caption carries the whole of it either way.
 *
 * tests/chart.test.ts holds the placement guarantee at this length.
 */
export const NAME_LIMIT = 34;

/** Long names get an ellipsis on the chart; the caption carries the whole thing. */
function shorten(name: string, limit = NAME_LIMIT): string {
  return name.length <= limit ? name : `${name.slice(0, limit - 1).trimEnd()}\u2026`;
}

/**
 * Roughly how wide a label runs, in viewBox units.
 *
 * IBM Plex Sans Bold averages a little over half its size per character. The
 * estimate runs deliberately wide, because a label thought narrower than it
 * really is would be placed into a gap it does not fit.
 */
function labelWidth(text: string): number {
  return text.length * TYPE.userLabel * 0.6;
}

/** The y of a polyline at a given x, or null where the line does not reach. */
function yAlong(
  points: ReadonlyArray<{ x: number; y: number }>, x: number,
): number | null {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a === undefined || b === undefined) continue;
    if (x < a.x || x > b.x) continue;
    const span = b.x - a.x;
    return span === 0 ? a.y : a.y + ((x - a.x) / span) * (b.y - a.y);
  }
  return null;
}

/**
 * Every height a polyline reaches between two x, as one interval.
 *
 * Exact rather than sampled: the lines are piecewise linear, so their highest
 * and lowest points across a span are either at a vertex inside it or at one
 * of its two ends. Sampling at fixed intervals missed a kink between samples
 * and let a marker through the label.
 */
function bandBetween(
  points: ReadonlyArray<{ x: number; y: number }>, left: number, right: number,
): { top: number; bottom: number } | null {
  const heights: number[] = [];
  for (const edge of [left, right]) {
    const y = yAlong(points, edge);
    if (y !== null) heights.push(y);
  }
  for (const point of points) {
    if (point.x >= left && point.x <= right) heights.push(point.y);
  }
  if (heights.length === 0) return null;
  return { top: Math.min(...heights), bottom: Math.max(...heights) };
}

/** How far a height sits from a band, counting nothing when it is inside. */
function distanceTo(y: number, band: { top: number; bottom: number }): number {
  if (y < band.top) return band.top - y;
  if (y > band.bottom) return y - band.bottom;
  return 0;
}

/**
 * Where the reader's own label goes.
 *
 * The label used to sit a fixed 11 units above the end of the reader's line,
 * which put it straight through whatever else happened to run there. Any of
 * the sliders can move that line anywhere on the axis, so no fixed offset
 * is clear for every combination.
 *
 * Instead: the label occupies a strip of the plot, from its left edge to the
 * right of the chart. Take the band every line sweeps across that strip, then
 * walk the plot height and score every position. Clearing the seven marker
 * lines and the reader's own path comes first and absolutely, because a
 * coloured line through the text ruins both. Everything after that is a
 * trade between two goods: sitting off the gridlines, where bold text reads
 * a little cleaner, and sitting near the end of the reader's line, which is
 * what makes the label that line's name rather than a caption floating in
 * the plot. `GRID_WEIGHT` prices the first in units of the second.
 */
/** Drift past which the label stops reading as the line's name, in plot units. */
const ACCEPTABLE_DRIFT = 60;

function placeUserLabel(
  path: DrawablePath, yFor: (v: number) => number, scale: Scale, text: string,
): { x: number; y: number; connector: number | null } {
  const half = TYPE.userLabel * CAP_RATIO;
  const need = half + 2;
  const width = labelWidth(text);

  const userPoints = path.points.map((point) => ({
    x: xFor(point.year), y: yFor(point.co2Gt),
  }));
  const markerPoints = MARKERS.map((marker) => MARKER_YEARS.map((year, index) => ({
    x: xFor(year), y: yFor(at(marker.co2Gt, index)),
  })));

  const grid: Array<{ top: number; bottom: number }> = [];
  const gridlines = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= gridlines; i += 1) {
    const y = yFor(scale.min + i * scale.step);
    grid.push({ top: y, bottom: y });
  }

  /** Room around a position, past what the text needs counting for nothing. */
  const roomAt = (y: number, obstacles: ReadonlyArray<{ top: number; bottom: number }>) =>
    (obstacles.length === 0 ? need
      : Math.min(need, ...obstacles.map((band) => distanceTo(y, band))));

  const anchor = yFor(at(path.points, path.points.length - 1, 'final point').co2Gt);

  /** The best position for a label whose right edge sits at `rightEdge`. */
  function placeAt(rightEdge: number) {
    const left = Math.max(PLOT.left, rightEdge - width);
    const own = bandBetween(userPoints, left, rightEdge);
    const others: Array<{ top: number; bottom: number }> = [];
    for (const line of markerPoints) {
      const band = bandBetween(line, left, rightEdge);
      if (band !== null) others.push(band);
    }
    const bands = own === null ? others : [own, ...others];

    let best = { y: anchor, fromLines: -1, cost: Infinity };
    for (let y = PLOT.top + half; y <= PLOT.bottom - half; y += 0.5) {
      const fromLines = roomAt(y, bands);
      // Nearness is measured to the band the reader's line sweeps under the
      // label, not to its final point: on a steep path the final point is
      // nowhere near the stretch the label actually sits over.
      const near = own === null ? Math.abs(y - anchor) : distanceTo(y, own);
      const cost = near - GRID_WEIGHT * roomAt(y, grid);
      if (fromLines > best.fromLines
          || (fromLines === best.fromLines && cost < best.cost)) {
        best = { y, fromLines, cost };
      }
    }
    const drift = own === null ? Math.abs(best.y - anchor) : distanceTo(best.y, own);
    // Where the label ends up far from its line, the connector needs the edge
    // of the band to run back to.
    const reach = own === null ? anchor
      : (best.y < own.top ? own.top : own.bottom);
    return { x: rightEdge, y: best.y, fromLines: best.fromLines, drift, reach };
  }

  const edge = xFor(END_YEAR) - 6;
  let best = placeAt(edge);
  // Clearing every line comes first and absolutely, so where the right-hand
  // edge offers nothing near the reader's line the label ends up across the
  // plot from it. On the steepest paths -- reachable once removal and
  // late-arriving improvement joined the sliders -- that put the name 150
  // units from its line on a plot 310 units tall, which reads as a caption
  // rather than as that line's name. Sliding the label back along the line
  // finds a stretch with room beside it. Tried only when the right edge fails,
  // so the ordinary case still costs one pass.
  if (best.drift > ACCEPTABLE_DRIFT) {
    for (let back = 40; back <= 200; back += 40) {
      const candidate = placeAt(edge - back);
      if (candidate.fromLines >= best.fromLines && candidate.drift < best.drift) {
        best = candidate;
      }
    }
  }
  // A label this far from its line has to say which line it belongs to, so it
  // carries a hairline back to it. Every corner of the slider space that needs
  // one is a path that climbs through the markers and then dives, where the
  // only strip clear of all eight lines sits well below the one being named.
  const connector = best.drift > ACCEPTABLE_DRIFT ? best.reach : null;
  return { x: best.x, y: best.y + half, connector };
}

function userPath(
  path: DrawablePath, yFor: (v: number) => number, scale: Scale, name: string,
): string {
  const d = path.points.map((point, index) => `${index === 0 ? 'M' : 'L'}`
    + `${xFor(point.year).toFixed(1)},${yFor(point.co2Gt).toFixed(1)}`).join('');
  const text = shorten(name);
  const place = placeUserLabel(path, yFor, scale, text);
  const tie = place.connector === null ? '' : (() => {
    const x = place.x - 4;
    const from = place.y > place.connector ? place.y - TYPE.userLabel : place.y + 4;
    return `<line x1="${x.toFixed(1)}" y1="${from.toFixed(1)}" `
      + `x2="${x.toFixed(1)}" y2="${place.connector.toFixed(1)}" `
      + 'stroke="var(--you)" stroke-width="1" stroke-dasharray="2 2" '
      + 'data-user-tie="1"/>';
  })();
  const label = tie + `<text x="${place.x.toFixed(1)}" y="${place.y.toFixed(1)}" `
    + `text-anchor="end" font-family="${SANS}" font-size="${TYPE.userLabel}" `
    + `font-weight="700" fill="var(--you)" data-user-label="1">`
    + `${escapeText(text)}</text>`;
  return `<path d="${d}" fill="none" stroke="var(--you)" stroke-width="3.4" `
    + `stroke-linejoin="round" data-user-path="1"/>${label}`;
}

export interface ChartOptions {
  /** What to call the reader's path. */
  name?: string;
  /** A CMIP7 marker to bring forward, or null. */
  highlightMarker?: string | null;
}

export function renderChart(
  svg: SVGSVGElement, path: DrawablePath, options: ChartOptions = {},
): void {
  const name = options.name ?? 'Build your own';
  const highlight = options.highlightMarker ?? null;
  const scale = scaleFor(path);
  const yFor = yWith(scale);
  svg.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`);
  svg.dataset['scale'] = `${scale.min}..${scale.max} by ${scale.step}`;
  svg.innerHTML = gridlines(scale, yFor)
    // Left-anchored at the very edge. Right-anchoring it on the number column
    // pushes it past x=0, which the live SVG shows because it allows overflow
    // and the export clips, so the label lost its first character in the PNG.
    + `<text x="0" y="${PLOT.top - 18}" text-anchor="start" `
    + `font-family="${SANS}" font-size="${TYPE.axisLabel}" font-weight="600" `
    + `fill="var(--dim)">GtCO₂/yr</text>`
    + yearLabels()
    + markerPaths(yFor, highlight)
    + markerLabels(yFor, highlight)
    + userPath(path, yFor, scale, name);
}

export const CHART_GEOMETRY = { VIEW, PLOT, TYPE, CAP_RATIO, labelWidth, shorten };

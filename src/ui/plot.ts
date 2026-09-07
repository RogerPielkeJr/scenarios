/**
 * The plotting primitives the Learn More charts share.
 *
 * The top page's chart draws one thing very well and is left alone; this
 * draws the general case, which every Learn More page needs: history, one
 * or more projections, an uncertainty band, the reader's own curve and the
 * CMIP7 markers as points at 2100.
 */
import { spreadLabels } from './ticks.js';
import type { Column, FigureData } from './figure.js';

export interface Scale {
  min: number;
  max: number;
  step: number;
}

/** Roughly how many horizontal gridlines to aim for. */
const TARGET_GRIDLINES = 8;
/** Steps a reader can do arithmetic on, scaled by powers of ten. */
const NICE_STEPS = [1, 2, 2.5, 5, 10];

export interface AxisOptions {
  targetLines?: number;
  /** Forces zero onto the axis. The emissions chart needs it; a population chart does not. */
  includeZero?: boolean;
}

/** Picks an axis covering `low` to `high` that lands on round numbers. */
export function axisScale(low: number, high: number, options: AxisOptions = {}): Scale {
  const targetLines = options.targetLines ?? TARGET_GRIDLINES;
  const lowest = options.includeZero === true ? Math.min(low, 0) : low;
  const highest = options.includeZero === true ? Math.max(high, 0) : high;
  const span = Math.max(highest - lowest, 1e-9);
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

export interface Point {
  year: number;
  value: number;
}

export interface PlotSeries {
  id: string;
  label: string;
  points: readonly Point[];
  color: string;
  width?: number;
  dash?: string;
  opacity?: number;
  /** Draws the label at the series' last point, pushed clear of its neighbours. */
  labelAtEnd?: boolean;
}

export interface PlotBand {
  id: string;
  label: string;
  years: readonly number[];
  lo: readonly number[];
  hi: readonly number[];
  color: string;
  opacity?: number;
}

/** A single value at one year, drawn as a dot with a label. */
export interface PlotPoint {
  id: string;
  label: string;
  year: number;
  value: number;
  color: string;
}

/** One band of a stacked area, given as a share in the same units as the axis. */
export interface PlotArea {
  id: string;
  label: string;
  years: readonly number[];
  values: readonly number[];
  color: string;
}

export interface PlotSpec {
  xMin: number;
  xMax: number;
  xTicks: readonly number[];
  /** The unit, printed above the top gridline. */
  yLabel: string;
  /** Decimal places on the axis numbers. */
  yDecimals?: number;
  includeZero?: boolean;
  /**
   * A logarithmic vertical axis, for a quantity that compounds. It turns a
   * constant growth rate into a straight line, which is the whole point of
   * the income page, and keeps a 20-fold range legible at both ends.
   */
  yScale?: 'linear' | 'log';
  /** Pins the axis, for a quantity with fixed ends such as a share of 100. */
  yMin?: number;
  yMax?: number;
  bands?: readonly PlotBand[];
  /** Stacked from the bottom in the order given, each on top of the last. */
  areas?: readonly PlotArea[];
  series: readonly PlotSeries[];
  points?: readonly PlotPoint[];
  /** A vertical rule, for the line between record and projection. */
  divider?: { year: number; label: string } | null;
  /** Extra room on the right for end labels, in viewBox units. */
  rightGutter?: number;
}

const VIEW = { width: 680, height: 392 };
// `left` holds the widest axis number these pages print -- six figures of
// dollars per person on the income page's log axis -- clear of the viewBox
// edge at the type size below. It was 52 when the numbers were 12px.
const PLOT = { left: 68, top: 40, bottom: 348 };
const LABEL_GAP = 18;

/*
 * Type on every Learn More figure, in viewBox units, matching the front
 * page's chart. Larger and heavier than the page's own small print, because
 * a figure leaves the page as a PNG or a printed sheet with none of the
 * surrounding text to lean on. LABEL_GAP rises with `endLabel`: the spreader
 * separates end labels in viewBox units, so bigger text needs more room.
 */
const TYPE = {
  axisNumber: 15,
  axisLabel: 15.5,
  yearLabel: 15.5,
  dividerLabel: 14,
  endLabel: 15,
} as const;
/** Roughly the width of one character of `endLabel` sans, for the strip spread. */
const END_LABEL_CHAR = 8.6;
const SANS = "'IBM Plex Sans',system-ui,sans-serif";
const MONO = "'IBM Plex Mono',ui-monospace,monospace";

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function format(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

/** How many decimals the axis needs, given its own step. */
function decimalsFor(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
}

export function renderPlot(svg: SVGSVGElement, spec: PlotSpec): void {
  // End labels sit outside the plot, so the gutter has to hold the longest of
  // them. A page can ask for more room than that, never for less: at the type
  // size above, "Your rate" on the income page overran a fixed 74 and printed
  // past the edge of the figure.
  const labelled = [
    ...spec.series.filter((series) => series.labelAtEnd === true).map((s) => s.label),
    ...(spec.points ?? []).map((point) => point.label),
  ].filter((label) => label !== '');
  const needed = Math.max(0, ...labelled.map((label) => label.length))
    * END_LABEL_CHAR + 16;
  const right = VIEW.width - Math.max(spec.rightGutter ?? 74, needed);
  const values: number[] = [];
  for (const series of spec.series) values.push(...series.points.map((p) => p.value));
  for (const band of spec.bands ?? []) values.push(...band.lo, ...band.hi);
  for (const point of spec.points ?? []) values.push(point.value);
  // A stack reaches the sum of its bands, which is the number the axis has
  // to cover.
  const areas = spec.areas ?? [];
  const firstArea = areas[0];
  if (firstArea !== undefined) {
    values.push(0, ...firstArea.years.map((_year, index) => areas.reduce(
      (total, area) => total + (area.values[index] ?? 0), 0)));
  }
  const computed = axisScale(
    Math.min(...values), Math.max(...values),
    { includeZero: spec.includeZero === true },
  );
  const scale = spec.yMin === undefined && spec.yMax === undefined ? computed : {
    min: spec.yMin ?? computed.min,
    max: spec.yMax ?? computed.max,
    step: ((spec.yMax ?? computed.max) - (spec.yMin ?? computed.min)) / 5,
  };
  const decimals = spec.yDecimals ?? decimalsFor(scale.step);
  const log = spec.yScale === 'log';

  // On a log axis the ends come from the data, rounded out to the next power
  // of ten, and the gridlines land on 1, 2 and 5 times each power.
  const positive = values.filter((value) => value > 0);
  /** The nearest 1, 2 or 5 times a power of ten, outward from the data. */
  const roundLog = (value: number, direction: 'down' | 'up') => {
    const power = 10 ** Math.floor(Math.log10(value));
    const steps = [1, 2, 5, 10].map((step) => step * power);
    return direction === 'down'
      ? [...steps].reverse().find((step) => step <= value) ?? power
      : steps.find((step) => step >= value) ?? power * 10;
  };
  const logMin = roundLog(Math.min(...positive), 'down');
  const logMax = roundLog(Math.max(...positive), 'up');
  const logLines: number[] = [];
  if (log) {
    for (let power = logMin; power <= logMax; power *= 10) {
      for (const step of [1, 2, 5]) {
        const value = power * step;
        if (value >= logMin && value <= logMax) logLines.push(value);
      }
    }
  }

  const xFor = (year: number) => PLOT.left
    + ((year - spec.xMin) / (spec.xMax - spec.xMin)) * (right - PLOT.left);
  const yFor = (value: number) => {
    if (log) {
      const fraction = (Math.log10(Math.max(value, logMin)) - Math.log10(logMin))
        / (Math.log10(logMax) - Math.log10(logMin));
      return PLOT.bottom - fraction * (PLOT.bottom - PLOT.top);
    }
    return PLOT.bottom - ((value - scale.min) / (scale.max - scale.min))
      * (PLOT.bottom - PLOT.top);
  };

  let markup = '';

  const gridValues = log
    ? logLines
    : Array.from({ length: Math.round((scale.max - scale.min) / scale.step) + 1 },
      (_unused, index) => scale.min + index * scale.step);
  for (const value of gridValues) {
    const y = yFor(value);
    const weight = value === 0 && scale.min < 0 ? 1.6 : 0.7;
    markup += `<line x1="${PLOT.left}" x2="${right}" y1="${y}" y2="${y}" `
      + `stroke="var(--rule)" stroke-width="${weight}"/>`
      + `<text x="${PLOT.left - 10}" y="${y + 5}" text-anchor="end" font-family="${MONO}" `
      + `font-size="${TYPE.axisNumber}" font-weight="500" fill="var(--dim)">`
      + `${format(value, decimals)}</text>`;
  }
  markup += `<text x="0" y="${PLOT.top - 18}" text-anchor="start" font-family="${SANS}" `
    + `font-size="${TYPE.axisLabel}" font-weight="600" fill="var(--dim)">`
    + `${escapeText(spec.yLabel)}</text>`;

  spec.xTicks.forEach((year, index) => {
    const anchor = index === 0 ? 'start'
      : (index === spec.xTicks.length - 1 ? 'end' : 'middle');
    markup += `<text x="${xFor(year).toFixed(1)}" y="${PLOT.bottom + 25}" `
      + `text-anchor="${anchor}" font-family="${SANS}" font-size="${TYPE.yearLabel}" `
      + `font-weight="600" fill="var(--dim)">${year}</text>`;
  });

  // Stacked areas sit behind everything, each band drawn on the running total
  // of the bands below it.
  if (firstArea !== undefined) {
    const running = firstArea.years.map(() => 0);
    for (const area of areas) {
      const upper = area.years.map((year, index) => {
        const base = running[index] ?? 0;
        const top = base + (area.values[index] ?? 0);
        running[index] = top;
        return { year, base, top };
      });
      const forward = upper.map((point, index) => `${index === 0 ? 'M' : 'L'}`
        + `${xFor(point.year).toFixed(1)},${yFor(point.top).toFixed(1)}`).join('');
      const back = [...upper].reverse().map((point) =>
        `L${xFor(point.year).toFixed(1)},${yFor(point.base).toFixed(1)}`).join('');
      markup += `<path d="${forward}${back}Z" fill="${area.color}" opacity="0.85" `
        + `data-area="${area.id}"/>`;
    }
  }

  for (const band of spec.bands ?? []) {
    const top = band.years.map((year, i) => `${i === 0 ? 'M' : 'L'}`
      + `${xFor(year).toFixed(1)},${yFor(band.hi[i] ?? 0).toFixed(1)}`).join('');
    const bottom = [...band.years].reverse().map((year, i) => {
      const index = band.years.length - 1 - i;
      return `L${xFor(year).toFixed(1)},${yFor(band.lo[index] ?? 0).toFixed(1)}`;
    }).join('');
    markup += `<path d="${top}${bottom}Z" fill="${band.color}" `
      + `opacity="${band.opacity ?? 0.16}" data-band="${band.id}"/>`;
  }

  if (spec.divider != null) {
    const x = xFor(spec.divider.year).toFixed(1);
    markup += `<line x1="${x}" x2="${x}" y1="${PLOT.top}" y2="${PLOT.bottom}" `
      + `stroke="var(--rule)" stroke-width="1" stroke-dasharray="3 4"/>`
      + `<text x="${x}" y="${PLOT.top - 6}" text-anchor="middle" font-family="${SANS}" `
      + `font-size="${TYPE.dividerLabel}" font-weight="600" fill="var(--dim)">`
      + `${escapeText(spec.divider.label)}</text>`;
  }

  for (const series of spec.series) {
    if (series.points.length === 0) continue;
    const d = series.points.map((point, index) => `${index === 0 ? 'M' : 'L'}`
      + `${xFor(point.year).toFixed(1)},${yFor(point.value).toFixed(1)}`).join('');
    markup += `<path d="${d}" fill="none" stroke="${series.color}" `
      + `stroke-width="${series.width ?? 1.8}" opacity="${series.opacity ?? 1}" `
      + `stroke-linejoin="round"${series.dash === undefined ? '' : ` stroke-dasharray="${series.dash}"`} `
      + `data-series="${series.id}"/>`;
  }

  // End labels and marker points share one spreader, so a projection label
  // and a marker dot at the same height cannot print on top of each other.
  interface EndLabel { text: string; color: string; x: number; weight: number }
  const ends: Array<{ value: EndLabel; at: number }> = [];
  for (const series of spec.series) {
    const last = series.points[series.points.length - 1];
    if (series.labelAtEnd !== true || last === undefined) continue;
    ends.push({
      value: { text: series.label, color: series.color, x: xFor(last.year), weight: 700 },
      at: yFor(last.value),
    });
  }
  for (const point of spec.points ?? []) {
    markup += `<circle cx="${xFor(point.year).toFixed(1)}" cy="${yFor(point.value).toFixed(1)}" `
      + `r="3.2" fill="${point.color}" data-point="${point.id}"/>`;
    if (point.label === '') continue;
    ends.push({
      value: { text: point.label, color: point.color, x: xFor(point.year), weight: 600 },
      at: yFor(point.value),
    });
  }
  for (const placed of spreadLabels(ends, LABEL_GAP)) {
    const { value, at, anchor, moved } = placed;
    const leader = moved
      ? `<line x1="${value.x.toFixed(1)}" x2="${(value.x + 7).toFixed(1)}" `
        + `y1="${anchor.toFixed(1)}" y2="${at.toFixed(1)}" stroke="${value.color}" `
        + 'stroke-width="1" opacity="0.5"/>'
      : '';
    markup += `${leader}<text x="${(value.x + 10).toFixed(1)}" y="${(at + 5).toFixed(1)}" `
      + `font-family="${SANS}" font-size="${TYPE.endLabel}" font-weight="${value.weight}" `
      + `fill="${value.color}">${escapeText(value.text)}</text>`;
  }

  svg.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`);
  svg.dataset['scale'] = `${scale.min}..${scale.max} by ${scale.step}`;
  svg.innerHTML = markup;
}

export const PLOT_GEOMETRY = { VIEW, PLOT };

/**
 * A one-dimensional distribution: every value on a record laid along an
 * axis, with the reader's own choice and any reference values called out.
 *
 * The energy-intensity page uses it to put a candidate rate among the rates
 * of every 25-year window the world has actually run.
 */
export interface StripSpec {
  /** Every observation, drawn as a tick. */
  values: readonly number[];
  /** Named values drawn above the axis. */
  highlights: ReadonlyArray<{ id: string; label: string; value: number; color: string }>;
  min: number;
  max: number;
  ticks: readonly number[];
  axisLabel: string;
  /** Decimals on the axis numbers. */
  decimals?: number;
}

const STRIP = { width: 680, height: 156, left: 16, right: 610, axis: 88 };

export function renderStrip(svg: SVGSVGElement, spec: StripSpec): void {
  const xFor = (value: number) => STRIP.left
    + ((value - spec.min) / (spec.max - spec.min)) * (STRIP.right - STRIP.left);
  const decimals = spec.decimals ?? 2;
  let markup = `<line x1="${STRIP.left}" x2="${STRIP.right}" y1="${STRIP.axis}" `
    + `y2="${STRIP.axis}" stroke="var(--rule)" stroke-width="1"/>`;

  for (const value of spec.values) {
    const x = xFor(value).toFixed(1);
    markup += `<line x1="${x}" x2="${x}" y1="${STRIP.axis - 13}" y2="${STRIP.axis + 13}" `
      + 'stroke="var(--ink)" stroke-width="2" opacity="0.22" data-window="1"/>';
  }

  for (const tick of spec.ticks) {
    const x = xFor(tick).toFixed(1);
    markup += `<text x="${x}" y="${STRIP.axis + 32}" text-anchor="middle" `
      + `font-family="${SANS}" font-size="${TYPE.axisNumber}" font-weight="500" `
      + `fill="var(--dim)">${tick.toFixed(decimals)}</text>`;
  }
  // Below the tick numbers, never beside them.
  markup += `<text x="${STRIP.left}" y="${STRIP.axis + 60}" font-family="${SANS}" `
    + `font-size="${TYPE.axisLabel}" font-weight="600" fill="var(--dim)">`
    + `${escapeText(spec.axisLabel)}</text>`;

  // Highlights are spread the same way the chart spreads its end labels, so
  // two rates a whisker apart still read as two names. The gap comes from the
  // longest label, because these labels are centred on their own tick and two
  // of them can sit on the same value.
  const widest = Math.max(...spec.highlights.map((item) => item.label.length), 6);
  const placed = spreadLabels(
    spec.highlights.map((item) => ({ value: item, at: xFor(item.value) })),
    widest * END_LABEL_CHAR + 14,
  );
  for (const { value: item, anchor, at } of placed) {
    markup += `<line x1="${anchor.toFixed(1)}" x2="${anchor.toFixed(1)}" `
      + `y1="${STRIP.axis - 20}" y2="${STRIP.axis + 20}" stroke="${item.color}" `
      + `stroke-width="2.4" data-highlight="${item.id}"/>`
      + `<line x1="${anchor.toFixed(1)}" x2="${at.toFixed(1)}" y1="${STRIP.axis - 20}" `
      + `y2="${STRIP.axis - 30}" stroke="${item.color}" stroke-width="1" opacity="0.5"/>`
      + `<text x="${at.toFixed(1)}" y="${STRIP.axis - 36}" text-anchor="middle" `
      + `font-family="${SANS}" font-size="${TYPE.endLabel}" font-weight="700" `
      + `fill="${item.color}">${escapeText(item.label)}</text>`;
  }

  svg.setAttribute('viewBox', `0 0 ${STRIP.width} ${STRIP.height}`);
  svg.innerHTML = markup;
}

/**
 * The numbers behind a plot, as a table a reader can download.
 *
 * Built from the same spec the chart draws, so a spreadsheet can never
 * disagree with the picture above it.
 */
export function plotTable(spec: PlotSpec, title: string, source: string): FigureData {
  const years = new Set<number>();
  for (const series of spec.series) for (const point of series.points) years.add(point.year);
  for (const area of spec.areas ?? []) for (const year of area.years) years.add(year);
  for (const band of spec.bands ?? []) for (const year of band.years) years.add(year);
  const ordered = [...years].sort((a, b) => a - b);
  const at = (theseYears: readonly number[], values: readonly number[], year: number) => {
    const index = theseYears.indexOf(year);
    return index < 0 ? null : values[index] ?? null;
  };

  const columns: Column[] = [{ header: 'Year', values: ordered }];
  for (const area of spec.areas ?? []) {
    columns.push({
      header: area.label,
      values: ordered.map((year) => at(area.years, area.values, year)),
    });
  }
  for (const band of spec.bands ?? []) {
    columns.push({
      header: `${band.label}, low`,
      values: ordered.map((year) => at(band.years, band.lo, year)),
    });
    columns.push({
      header: `${band.label}, high`,
      values: ordered.map((year) => at(band.years, band.hi, year)),
    });
  }
  for (const series of spec.series) {
    if (series.points.length === 0) continue;
    const theseYears = series.points.map((point) => point.year);
    const values = series.points.map((point) => point.value);
    columns.push({
      header: series.label === '' ? series.id : series.label,
      values: ordered.map((year) => at(theseYears, values, year)),
    });
  }

  const extraRows = (spec.points ?? []).map((point) =>
    [`${point.label === '' ? point.id : point.label} (${point.year})`, point.value]);
  return { title, source, columns, extraRows };
}

/** The same, for the distribution strip. */
export function stripTable(spec: StripSpec, title: string, source: string): FigureData {
  return {
    title,
    source,
    columns: [{ header: spec.axisLabel, values: [...spec.values] }],
    extraRows: spec.highlights.map((item) => [item.label, item.value]),
  };
}

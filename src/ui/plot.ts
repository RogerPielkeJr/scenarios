/**
 * The plotting primitives the Learn More charts share.
 *
 * The top page's chart draws one thing very well and is left alone; this
 * draws the general case, which every Learn More page needs: history, one
 * or more projections, an uncertainty band, the reader's own curve and the
 * CMIP7 markers as points at 2100.
 */
import { spreadLabels } from './ticks.js';

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

export interface PlotSpec {
  xMin: number;
  xMax: number;
  xTicks: readonly number[];
  /** The unit, printed above the top gridline. */
  yLabel: string;
  /** Decimal places on the axis numbers. */
  yDecimals?: number;
  includeZero?: boolean;
  bands?: readonly PlotBand[];
  series: readonly PlotSeries[];
  points?: readonly PlotPoint[];
  /** A vertical rule, for the line between record and projection. */
  divider?: { year: number; label: string } | null;
  /** Extra room on the right for end labels, in viewBox units. */
  rightGutter?: number;
}

const VIEW = { width: 680, height: 392 };
const PLOT = { left: 52, top: 40, bottom: 348 };
const LABEL_GAP = 15;
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
  const right = VIEW.width - (spec.rightGutter ?? 74);
  const values: number[] = [];
  for (const series of spec.series) values.push(...series.points.map((p) => p.value));
  for (const band of spec.bands ?? []) values.push(...band.lo, ...band.hi);
  for (const point of spec.points ?? []) values.push(point.value);
  const scale = axisScale(
    Math.min(...values), Math.max(...values),
    { includeZero: spec.includeZero === true },
  );
  const decimals = spec.yDecimals ?? decimalsFor(scale.step);

  const xFor = (year: number) => PLOT.left
    + ((year - spec.xMin) / (spec.xMax - spec.xMin)) * (right - PLOT.left);
  const yFor = (value: number) => PLOT.bottom
    - ((value - scale.min) / (scale.max - scale.min)) * (PLOT.bottom - PLOT.top);

  let markup = '';

  const lines = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= lines; i += 1) {
    const value = scale.min + i * scale.step;
    const y = yFor(value);
    const weight = value === 0 && scale.min < 0 ? 1.6 : 0.7;
    markup += `<line x1="${PLOT.left}" x2="${right}" y1="${y}" y2="${y}" `
      + `stroke="var(--rule)" stroke-width="${weight}"/>`
      + `<text x="${PLOT.left - 9}" y="${y + 4}" text-anchor="end" font-family="${MONO}" `
      + `font-size="12" fill="var(--dim)">${format(value, decimals)}</text>`;
  }
  markup += `<text x="0" y="${PLOT.top - 18}" text-anchor="start" font-family="${SANS}" `
    + `font-size="12.5" fill="var(--dim)">${escapeText(spec.yLabel)}</text>`;

  spec.xTicks.forEach((year, index) => {
    const anchor = index === 0 ? 'start'
      : (index === spec.xTicks.length - 1 ? 'end' : 'middle');
    markup += `<text x="${xFor(year).toFixed(1)}" y="${PLOT.bottom + 22}" `
      + `text-anchor="${anchor}" font-family="${SANS}" font-size="13" `
      + `fill="var(--dim)">${year}</text>`;
  });

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
      + `font-size="11.5" fill="var(--dim)">${escapeText(spec.divider.label)}</text>`;
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
      value: { text: series.label, color: series.color, x: xFor(last.year), weight: 600 },
      at: yFor(last.value),
    });
  }
  for (const point of spec.points ?? []) {
    markup += `<circle cx="${xFor(point.year).toFixed(1)}" cy="${yFor(point.value).toFixed(1)}" `
      + `r="3.2" fill="${point.color}" data-point="${point.id}"/>`;
    if (point.label === '') continue;
    ends.push({
      value: { text: point.label, color: point.color, x: xFor(point.year), weight: 500 },
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
    markup += `${leader}<text x="${(value.x + 10).toFixed(1)}" y="${(at + 4).toFixed(1)}" `
      + `font-family="${SANS}" font-size="12" font-weight="${value.weight}" `
      + `fill="${value.color}">${escapeText(value.text)}</text>`;
  }

  svg.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`);
  svg.dataset['scale'] = `${scale.min}..${scale.max} by ${scale.step}`;
  svg.innerHTML = markup;
}

export const PLOT_GEOMETRY = { VIEW, PLOT };

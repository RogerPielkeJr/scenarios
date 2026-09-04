import { BASE_YEAR, END_YEAR } from '../model/config.js';
import { MARKERS, MARKER_YEARS } from '../model/markers.js';
import type { ScenarioPath } from '../model/types.js';
import { at } from '../model/types.js';
import { spreadLabels } from './ticks.js';

// Height leaves room for the year labels below the plot and nothing more.
// The PNG export draws the viewBox straight onto a canvas, so any slack here
// becomes a dead band in the downloaded image.
const VIEW = { width: 660, height: 392 };
// `top` leaves room above the highest gridline for the axis label, which
// otherwise prints on top of the topmost number.
const PLOT = { left: 56, right: 588, top: 40, bottom: 350 };
const LABEL_GAP = 13;

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

/**
 * The axis covers the reader's path and all seven markers, so the two stay
 * comparable however far the sliders are pushed, and nothing is ever drawn
 * outside the plot.
 */
function scaleFor(path: ScenarioPath): Scale {
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
    svg += `<text x="${PLOT.left - 9}" y="${y + 4}" text-anchor="end" `
      + `font-family="${MONO}" font-size="11" fill="var(--dim)">${format(value)}</text>`;
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
    return `<text x="${xFor(year)}" y="${PLOT.bottom + 22}" text-anchor="${anchor}" `
      + `font-family="${SANS}" font-size="12" fill="var(--dim)">${year}</text>`;
  }).join('');
}

function markerPaths(yFor: (v: number) => number): string {
  return MARKERS.map((marker) => {
    const d = MARKER_YEARS.map((year, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${xFor(year).toFixed(1)},${yFor(at(marker.co2Gt, index)).toFixed(1)}`;
    }).join('');
    return `<path d="${d}" fill="none" stroke="${marker.color}" stroke-width="1.6" `
      + `opacity="0.42" data-marker="${marker.id}"/>`;
  }).join('');
}

/** Right-edge scenario labels, pushed apart and given leader lines. */
function markerLabels(yFor: (v: number) => number): string {
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
    return `${leader}<text x="${PLOT.right + 10}" y="${(y + 4).toFixed(1)}" `
      + `font-family="${SANS}" font-size="11" font-weight="600" fill="${marker.color}" `
      + `opacity="0.85">${escapeText(marker.id)}</text>`;
  }).join('');
}

function userPath(path: ScenarioPath, yFor: (v: number) => number): string {
  const d = path.points.map((point, index) => `${index === 0 ? 'M' : 'L'}`
    + `${xFor(point.year).toFixed(1)},${yFor(point.co2Gt).toFixed(1)}`).join('');
  const final = path.final;
  const label = `<text x="${(xFor(END_YEAR) - 6).toFixed(1)}" `
    + `y="${(yFor(final.co2Gt) - 11).toFixed(1)}" text-anchor="end" `
    + `font-family="${SANS}" font-size="13" font-weight="600" fill="var(--you)">Build your own</text>`;
  return `<path d="${d}" fill="none" stroke="var(--you)" stroke-width="3.4" `
    + `stroke-linejoin="round" data-user-path="1"/>${label}`;
}

export function renderChart(svg: SVGSVGElement, path: ScenarioPath): void {
  const scale = scaleFor(path);
  const yFor = yWith(scale);
  svg.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`);
  svg.dataset['scale'] = `${scale.min}..${scale.max} by ${scale.step}`;
  svg.innerHTML = gridlines(scale, yFor)
    // Left-anchored at the very edge. Right-anchoring it on the number column
    // pushes it past x=0, which the live SVG shows because it allows overflow
    // and the export clips, so the label lost its first character in the PNG.
    + `<text x="0" y="${PLOT.top - 18}" text-anchor="start" `
    + `font-family="${SANS}" font-size="11.5" fill="var(--dim)">GtCO2/yr</text>`
    + yearLabels()
    + markerPaths(yFor)
    + markerLabels(yFor)
    + userPath(path, yFor);
}

export const CHART_GEOMETRY = { VIEW, PLOT };

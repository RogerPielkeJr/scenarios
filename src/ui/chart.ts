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
const RANGE = { min: -30, max: 90, step: 15 };
const LABEL_GAP = 13;

// Literal font stacks rather than the CSS custom properties used elsewhere.
// Colours stay as var() so the chart follows the theme, and the PNG export
// resolves them against the live page; fonts do not change with the theme
// and a var() in a font-family presentation attribute is not worth the risk.
const SANS = "'IBM Plex Sans',system-ui,sans-serif";
const MONO = "'IBM Plex Mono',ui-monospace,monospace";

const xFor = (year: number) => PLOT.left
  + ((year - BASE_YEAR) / (END_YEAR - BASE_YEAR)) * (PLOT.right - PLOT.left);

const yFor = (value: number) => PLOT.bottom
  - ((value - RANGE.min) / (RANGE.max - RANGE.min)) * (PLOT.bottom - PLOT.top);

const clamp = (value: number) => Math.max(RANGE.min, Math.min(RANGE.max, value));

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gridlines(): string {
  let svg = '';
  for (let value = RANGE.min; value <= RANGE.max; value += RANGE.step) {
    const y = yFor(value);
    const weight = value === 0 ? 1.6 : 0.7;
    svg += `<line x1="${PLOT.left}" x2="${PLOT.right}" y1="${y}" y2="${y}" `
      + `stroke="var(--rule)" stroke-width="${weight}"/>`;
    svg += `<text x="${PLOT.left - 9}" y="${y + 4}" text-anchor="end" `
      + `font-family="${MONO}" font-size="11" fill="var(--dim)">${value}</text>`;
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

function markerPaths(): string {
  return MARKERS.map((marker) => {
    const d = MARKER_YEARS.map((year, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${xFor(year).toFixed(1)},${yFor(clamp(at(marker.co2Gt, index))).toFixed(1)}`;
    }).join('');
    return `<path d="${d}" fill="none" stroke="${marker.color}" stroke-width="1.6" `
      + `opacity="0.42" data-marker="${marker.id}"/>`;
  }).join('');
}

/** Right-edge scenario labels, pushed apart and given leader lines. */
function markerLabels(): string {
  const placed = spreadLabels(
    MARKERS.map((marker) => ({
      value: marker,
      at: yFor(clamp(at(marker.co2Gt, marker.co2Gt.length - 1))),
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

function userPath(path: ScenarioPath): string {
  const d = path.points.map((point, index) => `${index === 0 ? 'M' : 'L'}`
    + `${xFor(point.year).toFixed(1)},${yFor(clamp(point.co2Gt)).toFixed(1)}`).join('');
  const final = path.final;
  const label = `<text x="${(xFor(END_YEAR) - 6).toFixed(1)}" `
    + `y="${(yFor(clamp(final.co2Gt)) - 11).toFixed(1)}" text-anchor="end" `
    + `font-family="${SANS}" font-size="13" font-weight="600" fill="var(--you)">yours</text>`;
  return `<path d="${d}" fill="none" stroke="var(--you)" stroke-width="3.4" `
    + `stroke-linejoin="round" data-user-path="1"/>${label}`;
}

export function renderChart(svg: SVGSVGElement, path: ScenarioPath): void {
  svg.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`);
  svg.innerHTML = gridlines()
    // Left-anchored at the very edge. Right-anchoring it on the number column
    // pushes it past x=0, which the live SVG shows because it allows overflow
    // and the export clips, so the label lost its first character in the PNG.
    + `<text x="0" y="${PLOT.top - 18}" text-anchor="start" `
    + `font-family="${SANS}" font-size="11.5" fill="var(--dim)">GtCO2/yr</text>`
    + yearLabels()
    + markerPaths()
    + markerLabels()
    + userPath(path);
}

export const CHART_GEOMETRY = { VIEW, PLOT, RANGE };

/**
 * Downloads the reader's scenario as a sheet: the chart, the six assumptions
 * behind it and what they add up to, with the logo and the credit line.
 *
 * The chart is drawn with CSS custom properties so it follows the theme, and
 * canvas cannot resolve those, so every var() is replaced with the value the
 * live page computes before the SVG is serialised. The logo and the text are
 * painted onto the canvas rather than embedded in the SVG, which keeps the
 * canvas clean of any cross-origin taint.
 */
import { INPUT_SPECS } from '../model/config.js';
import { addedWarming, warming } from '../model/emulator.js';
import { nearestAnalogue } from '../model/analogue.js';
import { MARKER_BY_ID, placeAmongMarkers, type PublishedPath } from '../model/markers.js';
import type { ScenarioInputs, ScenarioPath } from '../model/types.js';
import { displayName, type Scenario } from '../state.js';
import { degrees, formatInput, signedDegrees, thousands } from '../format.js';
import { jpegToPdf } from './pdf.js';

const SCALE = 2;
const SHEET = { width: 720, pad: 26 };
const CREDIT = 'Analysis by Roger Pielke Jr., The Honest Broker';
const DATA_SOURCE = 'Data: ScenarioMIP CMIP7 marker scenarios; Energy Institute, World Bank '
  + 'and Global Carbon Budget for the base year';
const LOGO_SRC = '/thb-logo.png';
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = 'Spectral, Georgia, serif';

function resolveVariables(markup: string, styles: CSSStyleDeclaration): string {
  return markup.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, name: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value === '' ? whole : value;
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${source}`));
    image.src = source;
  });
}

function viewBoxOf(svg: SVGSVGElement): { width: number; height: number } {
  const parts = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  const width = parts[2];
  const height = parts[3];
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('chart has no usable viewBox');
  }
  return { width: width as number, height: height as number };
}

function summaryOf(
  inputs: ScenarioInputs, path: ScenarioPath, published: PublishedPath | null,
): Array<[string, string, string]> {
  const high = MARKER_BY_ID['H'];
  const cumulativeGt = published === null ? path.cumulativeGt : published.cumulativeGt;
  const t = published === null ? warming(path.cumulativeGt, inputs.methane) : published.warmingC;
  const added = published === null
    ? addedWarming(path.cumulativeGt, inputs.methane)
    : published.warmingC - 1.24;
  const country = nearestAnalogue(path.final.kgCo2PerUsd);
  return [
    ['Cumulative CO2, 2025 to 2100', thousands(cumulativeGt),
      published !== null ? `GtCO2 · as published by ${published.label}`
        : (high === undefined ? 'GtCO2'
          : `GtCO2 · CMIP7 HIGH reaches ${thousands(high.cumulativeGt)}`)],
    ['Warming in 2100 above 1850-1900', degrees(t),
      published === null ? placeAmongMarkers(t) : `as published by ${published.label}`],
    ['Added warming from now', signedDegrees(added),
      'above the 2015-2024 average of 1.24 °C'],
    ['Your 2100 world looks like', country === null ? 'no economy today' : country.name,
      country === null ? 'cleaner than anywhere on earth'
        : `${path.final.kgCo2PerUsd.toFixed(3)} kg CO2 per dollar`],
  ];
}

/** Paints the whole sheet and hands back the canvas. */
async function drawSheet(
  svg: SVGSVGElement, scenario: Scenario, path: ScenarioPath, published: PublishedPath | null,
): Promise<HTMLCanvasElement> {
  const { inputs } = scenario;
  const title = published === null ? displayName(scenario.name)
    : `${published.label} as published`;
  const styles = window.getComputedStyle(document.documentElement);
  const paper = styles.getPropertyValue('--panel').trim() || '#ffffff';
  const ink = styles.getPropertyValue('--ink').trim() || '#16243a';
  const dim = styles.getPropertyValue('--dim').trim() || '#5a6c82';
  const rule = styles.getPropertyValue('--rule').trim() || '#c9d4e0';
  const navy = styles.getPropertyValue('--navy').trim() || '#1f3a5f';

  const view = viewBoxOf(svg);
  const chartWidth = SHEET.width - SHEET.pad * 2;
  const chartHeight = (view.height / view.width) * chartWidth;
  const summary = summaryOf(inputs, path, published);

  const chartTop = 86;
  const summaryTop = chartTop + chartHeight + 20;
  const summaryHeight = 58;
  const inputsTop = summaryTop + summaryHeight + 26;
  const rowHeight = 22;
  const height = inputsTop + INPUT_SPECS.length * rowHeight + 60;

  const canvas = document.createElement('canvas');
  canvas.width = SHEET.width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d canvas context');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, SHEET.width, height);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = ink;
  ctx.font = `600 22px ${SERIF}`;
  ctx.fillText(title, SHEET.pad, 42, SHEET.width - SHEET.pad * 2 - 46);
  ctx.fillStyle = dim;
  ctx.font = `12.5px ${SANS}`;
  ctx.fillText('Build your own THB emissions scenario', SHEET.pad, 62);

  try {
    const logo = await loadImage(LOGO_SRC);
    ctx.drawImage(logo, SHEET.width - SHEET.pad - 34, 20, 34, 34);
  } catch {
    // A missing logo should not cost the reader the sheet.
  }

  ctx.strokeStyle = navy;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SHEET.pad, 74);
  ctx.lineTo(SHEET.width - SHEET.pad, 74);
  ctx.stroke();

  const markup = resolveVariables(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" `
    + `viewBox="0 0 ${view.width} ${view.height}">${svg.innerHTML}</svg>`,
    styles,
  );
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    ctx.drawImage(await loadImage(url), SHEET.pad, chartTop, chartWidth, chartHeight);
  } finally {
    URL.revokeObjectURL(url);
  }

  const columnWidth = chartWidth / summary.length;
  summary.forEach(([label, value, note], index) => {
    const x = SHEET.pad + index * columnWidth;
    if (index > 0) {
      ctx.strokeStyle = rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 8, summaryTop - 4);
      ctx.lineTo(x - 8, summaryTop + summaryHeight - 12);
      ctx.stroke();
    }
    ctx.fillStyle = dim;
    ctx.font = `10.5px ${SANS}`;
    ctx.fillText(label, x, summaryTop + 8, columnWidth - 14);
    ctx.fillStyle = ink;
    ctx.font = `500 19px ${MONO}`;
    ctx.fillText(value, x, summaryTop + 32, columnWidth - 14);
    ctx.fillStyle = dim;
    ctx.font = `10.5px ${SANS}`;
    ctx.fillText(note, x, summaryTop + 47, columnWidth - 14);
  });

  ctx.fillStyle = dim;
  ctx.font = `600 11.5px ${SANS}`;
  ctx.fillText('YOUR ASSUMPTIONS', SHEET.pad, inputsTop - 10);

  INPUT_SPECS.forEach((spec, index) => {
    const y = inputsTop + index * rowHeight + 12;
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SHEET.pad, y + 6);
    ctx.lineTo(SHEET.width - SHEET.pad, y + 6);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = `13px ${SERIF}`;
    ctx.fillText(spec.label, SHEET.pad, y);
    ctx.font = `500 13px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(formatInput(spec.id, inputs[spec.id]), SHEET.pad + 330, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = dim;
    ctx.font = `11.5px ${SERIF}`;
    ctx.fillText(spec.units, SHEET.pad + 344, y);
  });

  ctx.fillStyle = dim;
  ctx.font = `11px ${SANS}`;
  ctx.fillText(DATA_SOURCE, SHEET.pad, height - 30, SHEET.width - SHEET.pad * 2);
  ctx.fillText(CREDIT, SHEET.pad, height - 15);

  return canvas;
}

function save(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error(`could not encode ${type}`)) : resolve(blob)),
      type, quality,
    );
  });
}

export async function downloadScenarioPng(
  svg: SVGSVGElement, scenario: Scenario, path: ScenarioPath,
  published: PublishedPath | null, filename: string,
): Promise<void> {
  const canvas = await drawSheet(svg, scenario, path, published);
  save(await toBlob(canvas, 'image/png'), filename);
}

export async function downloadScenarioPdf(
  svg: SVGSVGElement, scenario: Scenario, path: ScenarioPath,
  published: PublishedPath | null, filename: string,
): Promise<void> {
  const canvas = await drawSheet(svg, scenario, path, published);
  const jpeg = new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer());
  save(jpegToPdf(jpeg, canvas.width, canvas.height), filename);
}

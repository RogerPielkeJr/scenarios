/**
 * How wide a line of chart text really prints, for the charts that size a
 * margin or a gap to fit their labels.
 *
 * Every chart estimates widths from a per-character figure for IBM Plex
 * Sans, and that estimate alone let labels run off the figure wherever the
 * face fell back to a wider one: "Middle income" printed past the right edge
 * of the income chart in DejaVu Sans. Measuring in the live SVG catches the
 * face actually on screen; the estimate stays as the floor, because a chart
 * drawn before the web font arrives measures the fallback, and because the
 * test DOM measures nothing at all.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Room added to a measured width, so a face a hair wider still fits. */
export const MEASURE_SLACK = 4;

export interface TextStyle {
  size: number;
  weight: number;
  family: string;
}

/**
 * The width of `text` in the SVG's own units, or 0 where the browser cannot
 * say: a detached or hidden SVG, or a DOM without layout.
 */
export function measureText(svg: SVGSVGElement, text: string, style: TextStyle): number {
  const doc = svg.ownerDocument;
  const probe = doc.createElementNS(SVG_NS, 'text');
  if (typeof (probe as SVGTextElement).getComputedTextLength !== 'function') return 0;
  probe.setAttribute('font-family', style.family);
  probe.setAttribute('font-size', String(style.size));
  probe.setAttribute('font-weight', String(style.weight));
  probe.setAttribute('visibility', 'hidden');
  probe.textContent = text;
  svg.appendChild(probe);
  let width = 0;
  try {
    width = (probe as SVGTextElement).getComputedTextLength();
  } catch {
    width = 0;
  }
  probe.remove();
  return Number.isFinite(width) ? width : 0;
}

/** The wider of the estimate and the measured width plus slack. */
export function textWidth(
  svg: SVGSVGElement, text: string, style: TextStyle, estimate: number,
): number {
  const measured = measureText(svg, text, style);
  return measured > 0 ? Math.max(estimate, measured + MEASURE_SLACK) : estimate;
}

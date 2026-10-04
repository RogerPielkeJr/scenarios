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
 * Lays a hidden probe of `text` into the SVG, reads it with `read`, and takes
 * it out again. Returns 0 wherever the browser cannot say.
 */
function probe(
  svg: SVGSVGElement, text: string, style: TextStyle,
  read: (node: SVGTextElement) => number,
): number {
  const node = svg.ownerDocument.createElementNS(SVG_NS, 'text') as SVGTextElement;
  if (typeof node.getComputedTextLength !== 'function' || typeof node.getBBox !== 'function') {
    return 0;
  }
  node.setAttribute('font-family', style.family);
  node.setAttribute('font-size', String(style.size));
  node.setAttribute('font-weight', String(style.weight));
  node.setAttribute('visibility', 'hidden');
  node.textContent = text;
  svg.appendChild(node);
  let value = 0;
  try {
    value = read(node);
  } catch {
    value = 0;
  }
  node.remove();
  return Number.isFinite(value) ? value : 0;
}

/**
 * The width of `text` in the SVG's own units, or 0 where the browser cannot
 * say: a detached or hidden SVG, or a DOM without layout.
 */
export function measureText(svg: SVGSVGElement, text: string, style: TextStyle): number {
  return probe(svg, text, style, (node) => node.getComputedTextLength());
}

/*
 * IBM Plex Sans reaches 1.025 of its size above the baseline and 0.275 below,
 * so a line of it stands 1.3 of its size tall. The browser's box for a text
 * runs that full height whatever the letters, and two boxes stacked closer
 * than that touch.
 */
const LINE_HEIGHT_EM = 1.3;

/**
 * How far apart two stacked lines of text have to sit so their boxes clear:
 * the face's own height as measured in the live SVG, or 1.3 of the size where
 * nothing can be measured, plus a unit of air. Never less than `minimum`.
 *
 * The end labels used to stack on a fixed gap of 18 units for 15-unit text,
 * which clears DejaVu Sans (17.3 tall) but not IBM Plex Sans (19.5), so with
 * the real web font every crowded stack of scenario names overlapped.
 */
export function stackGap(svg: SVGSVGElement, style: TextStyle, minimum: number): number {
  const measured = probe(svg, 'Hg', style, (node) => node.getBBox().height);
  const height = measured > 0 ? measured : style.size * LINE_HEIGHT_EM;
  return Math.max(minimum, height + 1);
}

/** The wider of the estimate and the measured width plus slack. */
export function textWidth(
  svg: SVGSVGElement, text: string, style: TextStyle, estimate: number,
): number {
  const measured = measureText(svg, text, style);
  return measured > 0 ? Math.max(estimate, measured + MEASURE_SLACK) : estimate;
}

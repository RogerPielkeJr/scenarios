// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CHART_GEOMETRY, niceScale, renderChart } from '../src/ui/chart.js';
import { INPUT_SPECS } from '../src/model/config.js';
import { computePath } from '../src/model/kaya.js';
import type { ScenarioInputs } from '../src/model/types.js';

describe('niceScale', () => {
  it('covers the data it is given', () => {
    for (const [low, high] of [[-25, 55], [0, 12], [-120, 340], [-3, 3], [10, 11]]) {
      const scale = niceScale(low as number, high as number);
      expect(scale.min).toBeLessThanOrEqual(low as number);
      expect(scale.max).toBeGreaterThanOrEqual(high as number);
    }
  });

  // The chart turns on whether a path has crossed into net negative
  // emissions, so the zero line is never allowed off the axis.
  it('always keeps zero on the axis', () => {
    for (const [low, high] of [[20, 90], [-90, -20], [5, 6]]) {
      const scale = niceScale(low as number, high as number);
      expect(scale.min).toBeLessThanOrEqual(0);
      expect(scale.max).toBeGreaterThanOrEqual(0);
    }
  });

  it('lands on round numbers a reader can do arithmetic on', () => {
    for (const [low, high] of [[-25, 55], [-120, 340], [0, 7], [-4000, 9000]]) {
      const scale = niceScale(low as number, high as number);
      const mantissa = scale.step / 10 ** Math.floor(Math.log10(scale.step));
      expect([1, 2, 2.5, 5, 10]).toContain(Number(mantissa.toFixed(6)));
      expect(scale.min % scale.step).toBeCloseTo(0, 9);
      expect(scale.max % scale.step).toBeCloseTo(0, 9);
    }
  });

  it('produces a readable number of gridlines', () => {
    for (const [low, high] of [[-25, 55], [0, 12], [-120, 340], [-3, 3], [-1, 900]]) {
      const scale = niceScale(low as number, high as number);
      const lines = (scale.max - scale.min) / scale.step;
      expect(lines).toBeGreaterThanOrEqual(3);
      expect(lines).toBeLessThanOrEqual(14);
    }
  });

  it('widens rather than clipping when a scenario runs high', () => {
    const modest = niceScale(-25, 55);
    const extreme = niceScale(-25, 260);
    expect(extreme.max).toBeGreaterThan(modest.max);
    expect(extreme.max).toBeGreaterThanOrEqual(260);
  });

  it('never returns a zero or negative step', () => {
    for (const [low, high] of [[0, 0], [5, 5], [-2, -2]]) {
      expect(niceScale(low as number, high as number).step).toBeGreaterThan(0);
    }
  });
});

// @vitest-environment jsdom is set per-file, so this suite builds its own SVG
// element through the DOM the environment already provides.
describe('the reader’s own label on the chart', () => {
  /** Every point of a polyline, read back out of the `d` this module wrote. */
  function polyline(d: string): Array<{ x: number; y: number }> {
    return [...d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  }

  function yAt(points: Array<{ x: number; y: number }>, x: number): number | null {
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1] as { x: number; y: number };
      const b = points[i] as { x: number; y: number };
      if (x < a.x || x > b.x) continue;
      return b.x === a.x ? a.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
    }
    return null;
  }

  /** The worst overlap between the label's box and any line, in viewBox units. */
  function overlap(svg: SVGSVGElement, name: string): number {
    const label = svg.querySelector('[data-user-label]');
    expect(label).not.toBeNull();
    const size = CHART_GEOMETRY.TYPE.userLabel;
    const half = size * CHART_GEOMETRY.CAP_RATIO;
    const baseline = Number(label?.getAttribute('y'));
    const right = Number(label?.getAttribute('x'));
    const centre = baseline - half;
    const left = Math.max(CHART_GEOMETRY.PLOT.left,
      right - CHART_GEOMETRY.labelWidth(CHART_GEOMETRY.shorten(name)));

    const lines = [...svg.querySelectorAll('[data-marker], [data-user-path]')]
      .map((node) => polyline(node.getAttribute('d') ?? ''));

    // Far denser than the placement's own nine samples, so a line dipping
    // between two of them would be caught here rather than shipped.
    let worst = 0;
    for (let x = left; x <= right; x += 1) {
      for (const line of lines) {
        const y = yAt(line, x);
        if (y === null) continue;
        worst = Math.max(worst, half - Math.abs(y - centre));
      }
    }
    return worst;
  }

  function render(inputs: ScenarioInputs, name: string): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    renderChart(svg as SVGSVGElement, computePath(inputs), { name });
    return svg as SVGSVGElement;
  }

  // Every slider at its floor, its default and its ceiling, in every
  // combination: 3^6 = 729 charts, which is every corner and every middle of
  // the space a reader can reach.
  const CORNERS: ScenarioInputs[] = (() => {
    const axes = INPUT_SPECS.map((spec) => [spec.min, spec.default, spec.max]);
    const out: ScenarioInputs[] = [];
    for (const population of axes[0] ?? []) {
      for (const income of axes[1] ?? []) {
        for (const energyPerDollar of axes[2] ?? []) {
          for (const co2PerEnergy of axes[3] ?? []) {
            for (const landUse of axes[4] ?? []) {
              for (const methane of axes[5] ?? []) {
                out.push({ population, income, energyPerDollar,
                  co2PerEnergy, landUse, methane } as ScenarioInputs);
              }
            }
          }
        }
      }
    }
    return out;
  })();

  it('covers every corner of the slider space', () => {
    expect(CORNERS.length).toBe(3 ** INPUT_SPECS.length);
  });

  it('never lands on a marker line or on the reader’s own path', () => {
    const failures: string[] = [];
    for (const inputs of CORNERS) {
      const worst = overlap(render(inputs, 'Build your own'), 'Build your own');
      if (worst > 0) failures.push(`${JSON.stringify(inputs)} overlaps by ${worst.toFixed(2)}`);
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });

  // A long name widens the label, which widens the strip of the plot it has
  // to keep clear, so the same guarantee has to hold at the longest name the
  // chart will draw.
  it('holds for the longest name the chart draws', () => {
    const names = ['A', 'Trend continues', 'A'.repeat(30), 'A'.repeat(60)];
    const failures: string[] = [];
    for (const name of names) {
      for (const inputs of CORNERS) {
        const worst = overlap(render(inputs, name), name);
        if (worst > 0) failures.push(`"${name.slice(0, 12)}" ${JSON.stringify(inputs)} by ${worst.toFixed(2)}`);
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });

  it('stays inside the plot', () => {
    for (const inputs of CORNERS) {
      const svg = render(inputs, 'Build your own');
      const label = svg.querySelector('[data-user-label]');
      const y = Number(label?.getAttribute('y'));
      const half = CHART_GEOMETRY.TYPE.userLabel * CHART_GEOMETRY.CAP_RATIO;
      // The chart rounds every coordinate to one decimal, so the comparison
      // carries that much slack and no more.
      expect(y - 2 * half).toBeGreaterThanOrEqual(CHART_GEOMETRY.PLOT.top - 0.06);
      expect(y).toBeLessThanOrEqual(CHART_GEOMETRY.PLOT.bottom + 0.06);
    }
  });

  // The label is the reader's line's name. Placement that wandered off to
  // clear space elsewhere in the plot would say nothing.
  //
  // Nearness is measured to the stretch of the line that runs under the label,
  // not to the line's last point: a steep line sweeps a tall band across the
  // label's own width, and a label sitting snug against that band reads as
  // attached however far the last point has moved away.
  it('stays against the line it names', () => {
    const worst: Array<[number, string]> = [];
    for (const inputs of CORNERS) {
      const svg = render(inputs, 'Build your own');
      const path = polyline(svg.querySelector('[data-user-path]')?.getAttribute('d') ?? '');
      const right = Number(svg.querySelector('[data-user-label]')?.getAttribute('x'));
      const left = Math.max(CHART_GEOMETRY.PLOT.left,
        right - CHART_GEOMETRY.labelWidth('Build your own'));
      const heights: number[] = [];
      for (let x = left; x <= right; x += 1) {
        const y = yAt(path, x);
        if (y !== null) heights.push(y);
      }
      const half = CHART_GEOMETRY.TYPE.userLabel * CHART_GEOMETRY.CAP_RATIO;
      const centre = Number(svg.querySelector('[data-user-label]')?.getAttribute('y')) - half;
      const gap = Math.max(0, Math.min(...heights) - centre, centre - Math.max(...heights));
      worst.push([gap, JSON.stringify(inputs)]);
    }
    // Across all 729 corners the label never sits more than about 78 units
    // clear of its own line, on a plot 310 units tall, and it only gets that
    // far where the markers close off everything nearer. The bound guards
    // against a change that lets it wander further, not against that case.
    worst.sort((a, b) => b[0] - a[0]);
    expect(worst[0]?.[0], worst[0]?.[1]).toBeLessThan(90);
  });
});

/**
 * The strip that carries the reader's two headline numbers with them.
 *
 * The sliders run down a column taller than the chart beside them, and
 * below 860px they sit above the chart entirely: at 360px the front page runs
 * about 8,400px, with the first slider a quarter of the way down and the chart
 * around three fifths. A reader who moves the methane slider at the foot of
 * that column has the chart and the four tiles well off screen, so the tool
 * answers a question the reader cannot watch it answer.
 *
 * The strip shows itself only while the chart sits out of view, so it never
 * repeats a number already on screen, and it offers the chart back in one
 * press. The body carries `.has-strip` from here rather than from the
 * markup, so the page reserves room for the strip only when a script exists
 * to draw it.
 */
import type { ScenarioSummary } from './stats.js';
import { degrees, thousands } from '../format.js';

export interface Strip {
  /** Redraws the numbers. Safe to call whether or not the strip shows. */
  update(name: string, summary: ScenarioSummary): void;
  /** Whether the strip shows right now. */
  shown(): boolean;
  /**
   * Tells the strip where the chart is.
   *
   * The observer calls this in a browser. jsdom has no IntersectionObserver,
   * so the tests call it directly.
   */
  chartInView(visible: boolean): void;
}

const IDS = ['scenario-strip', 'strip-name', 'strip-cumulative', 'strip-warming',
  'strip-jump'] as const;

/**
 * Wires the strip up, or returns null if the page does not carry one.
 *
 * `chart` is the element the strip watches and scrolls back to: the figure
 * rather than the drawing, so the caption and the credit come with it.
 */
export function installStrip(root: Document, chart: Element): Strip | null {
  const found = IDS.map((id) => root.getElementById(id));
  if (found.some((element) => element === null)) return null;
  const [strip, nameEl, cumulativeEl, warmingEl, jump] =
    found as [HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement];

  let chartVisible = true;

  function apply(): void {
    strip.hidden = chartVisible;
  }

  jump.addEventListener('click', () => {
    const view = root.defaultView;
    const still = view?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
    chart.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  });

  const view = root.defaultView;
  if (view !== null && typeof view.IntersectionObserver === 'function') {
    // A sliver of the chart counts as in view: a reader who can see the line
    // move does not need the strip, and a threshold of 0 would keep it up
    // while the top of the chart still showed.
    const observer = new view.IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry === undefined) return;
      chartVisible = entry.isIntersecting;
      apply();
    }, { threshold: 0.18 });
    observer.observe(chart);
  }

  root.body.classList.add('has-strip');
  apply();

  return {
    update(name, summary) {
      nameEl.textContent = name;
      cumulativeEl.textContent = thousands(summary.cumulativeGt);
      warmingEl.textContent = degrees(summary.warmingC);
    },
    shown: () => !strip.hidden,
    chartInView(visible) {
      chartVisible = visible;
      apply();
    },
  };
}

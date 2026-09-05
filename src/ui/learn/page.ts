/**
 * The scaffold every Learn More page fills.
 *
 * A page module supplies the words, the chart and the builder arithmetic;
 * this puts them in the same order, in the same grid, with the same controls,
 * so the six pages read as siblings.
 */
import { MARKERS, markerValueFor } from '../../model/markers.js';
import { SPEC_BY_ID } from '../../model/config.js';
import { formatInput } from '../../format.js';
import { LEARN_ENTRIES } from '../../learn/registry.js';
import type { KeyEntry, LearnPageSpec, ProseBlock, Source } from '../../learn/types.js';
import { decodeScenario, defaultScenario, hashFor, type Scenario } from '../../state.js';
import { plotTable, renderPlot, renderStrip, stripTable } from '../plot.js';
import { attachFigureButtons, type FigureButtons } from '../figure.js';
import { installThemeToggle } from '../theme.js';
import { collectOutputs, panel, type RenderReport } from '../report.js';
import { buildIdentity } from './identity.js';
import { renderBuilder, type BuilderHandle } from './builder.js';

const CREDIT = 'Source: analysis by Roger Pielke Jr., The Honest Broker';

const OUTPUT_IDS = [
  'learn-title', 'learn-standfirst', 'definition-body', 'chart-caption',
  'markers-table', 'builder-result-value', 'sources-list',
];

function element<K extends keyof HTMLElementTagNameMap>(
  root: Document, tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = root.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One section of the page, in the same two-column band as the header. */
function band(root: Document, heading: string, note?: string): {
  section: HTMLElement; body: HTMLElement;
} {
  const section = element(root, 'section', 'learn-block banded');
  const left = element(root, 'div', 'band-left');
  const title = element(root, 'h2', undefined, heading);
  left.appendChild(title);
  if (note !== undefined) left.appendChild(element(root, 'p', 'block-note', note));
  const body = element(root, 'div', 'band-right');
  section.append(left, body);
  return { section, body };
}

function paragraphs(root: Document, into: HTMLElement, lines: readonly string[]): void {
  for (const line of lines) {
    const p = element(root, 'p');
    p.innerHTML = line;
    into.appendChild(p);
  }
}

function proseBlock(root: Document, block: ProseBlock): HTMLElement {
  const { section, body } = band(root, block.heading, block.note);
  paragraphs(root, body, block.paragraphs);
  return section;
}

/** The seven markers' own value for this page's factor. */
function markerTable(root: Document, spec: LearnPageSpec): HTMLTableElement {
  const table = element(root, 'table', 'kaya markers-table');
  table.id = 'markers-table';
  const input = SPEC_BY_ID[spec.input];
  const rows = MARKERS.map((marker) => {
    const value = markerValueFor(marker, spec.input);
    return `<tr><th scope="row"><span class="swatch" style="background:${marker.color}"></span>`
      + `CMIP7 ${marker.label}</th>`
      + `<td>${value === null ? '—' : formatInput(spec.input, value)}</td>`
      + `<td class="units">${input.units}</td></tr>`;
  }).join('');
  table.innerHTML = '<thead><tr><th scope="col">Scenario</th>'
    + '<th scope="col">Assumes</th><th scope="col">Units</th></tr></thead>'
    + `<tbody>${rows}</tbody>`;
  return table;
}

/** The key under a figure, in the same shape as the top page's legend. */
function buildKey(root: Document, entries: readonly KeyEntry[]): HTMLElement {
  const key = element(root, 'div', 'legend chart-key');
  for (const item of entries) {
    const entry = element(root, 'div', 'legend-item');
    const swatch = element(root, 'span', item.dot === true ? 'swatch swatch-dot'
      : (item.dash === true ? 'swatch swatch-dash' : 'swatch'));
    swatch.style.background = item.color;
    entry.appendChild(swatch);
    entry.appendChild(element(root, 'b', undefined, item.label));
    key.appendChild(entry);
  }
  return key;
}

function sourceList(root: Document, sources: readonly Source[]): HTMLElement {
  const list = element(root, 'ol', 'refs');
  list.id = 'sources-list';
  for (const source of sources) {
    const item = root.createElement('li');
    const line = element(root, 'p', 'ref');
    const link = root.createElement('a');
    link.href = source.url;
    link.textContent = source.title;
    link.rel = 'noopener';
    line.appendChild(link);
    line.appendChild(root.createTextNode(`. ${source.publisher}, ${source.vintage}.`));
    item.appendChild(line);
    item.appendChild(element(root, 'p', 'gloss', source.used));
    list.appendChild(item);
  }
  return list;
}

function siblingNav(root: Document, slug: string): HTMLElement {
  const nav = element(root, 'nav', 'siblings banded');
  nav.setAttribute('aria-label', 'The other assumptions');
  const left = element(root, 'div', 'band-left');
  left.appendChild(element(root, 'h2', undefined, 'The other five'));
  const body = element(root, 'div', 'band-right');
  const list = element(root, 'ul', 'sibling-list');
  for (const entry of LEARN_ENTRIES) {
    if (entry.slug === slug) continue;
    const item = root.createElement('li');
    if (entry.status === 'live') {
      const link = root.createElement('a');
      link.href = `/learn/${entry.slug}/`;
      link.textContent = entry.title;
      item.appendChild(link);
    } else {
      item.appendChild(element(root, 'span', 'forthcoming', entry.title));
      item.appendChild(element(root, 'span', 'forthcoming-tag', 'in preparation'));
    }
    item.appendChild(element(root, 'span', 'sibling-summary', entry.summary));
    list.appendChild(item);
  }
  body.appendChild(list);
  nav.append(left, body);
  return nav;
}

function backLink(root: Document, scenario: Scenario, fresh: boolean): HTMLElement {
  const nav = element(root, 'nav', 'back-strip');
  const link = root.createElement('a');
  link.className = 'back-link';
  link.href = `/${hashFor(scenario)}`;
  link.textContent = fresh
    ? '← Start a fresh scenario'
    : '← Back to my scenario, unchanged';
  nav.appendChild(link);
  return nav;
}

export interface LearnPage {
  scenario: Scenario;
  builder: BuilderHandle;
  chart: SVGSVGElement;
  render(): RenderReport;
  lastReport(): RenderReport | null;
}

export function mountLearnPage(spec: LearnPageSpec, root: Document = document): LearnPage {
  const view = root.defaultView;
  const incoming = decodeScenario(view?.location.search ?? '');
  const scenario = incoming ?? defaultScenario();
  const fresh = incoming === null;

  const main = root.getElementById('learn-main');
  if (main === null) throw new Error('missing element #learn-main');
  main.textContent = '';

  // The page's own colour, and the reader's own name for their scenario.
  root.documentElement.style.setProperty('--accent', spec.accent);
  root.documentElement.dataset['learnPage'] = spec.slug;

  const title = root.getElementById('learn-title');
  if (title !== null) title.textContent = spec.title;
  const standfirst = root.getElementById('learn-standfirst');
  if (standfirst !== null) standfirst.textContent = spec.standfirst;

  const toolbarBack = root.getElementById('back-toolbar');
  if (toolbarBack instanceof HTMLAnchorElement) toolbarBack.href = `/${hashFor(scenario)}`;

  main.appendChild(backLink(root, scenario, fresh));

  // The builder comes first: a reader arrives here to set a number, and the
  // explanation reads better once they have moved something.
  const builderBlock = band(root, spec.builder.heading, spec.builder.note);
  paragraphs(root, builderBlock.body, spec.builder.paragraphs);
  const builderHost = element(root, 'div', 'builder');
  builderBlock.body.appendChild(builderHost);
  builderBlock.section.classList.add('builder-block');
  main.appendChild(builderBlock.section);

  // Definition.
  const definition = band(root, 'What it measures');
  const facts = element(root, 'dl', 'definition-grid');
  const entries: Array<[string, string]> = [
    ['Quantity', spec.definition.quantity],
    ['Units', spec.definition.units],
    ['In the identity', spec.definition.place],
    ['Today', spec.definition.today],
  ];
  for (const [term, value] of entries) {
    const pair = element(root, 'div');
    pair.appendChild(element(root, 'dt', undefined, term));
    pair.appendChild(element(root, 'dd', undefined, value));
    facts.appendChild(pair);
  }
  definition.body.appendChild(facts);
  const body = element(root, 'div', 'definition-body');
  body.id = 'definition-body';
  paragraphs(root, body, spec.definition.paragraphs);
  definition.body.appendChild(body);
  main.appendChild(definition.section);

  // The identity, with this factor inked.
  const identity = band(root, 'Where it sits');
  identity.body.appendChild(buildIdentity(root, { active: spec.input }));
  main.appendChild(identity.section);

  // The record.
  const record = band(root, spec.chart.heading, spec.chart.note);
  paragraphs(root, record.body, spec.chart.paragraphs);
  const figure = element(root, 'figure', 'chart-figure');
  const chart = root.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chart.id = 'learn-chart';
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', spec.chart.caption);
  figure.appendChild(chart);
  const caption = element(root, 'figcaption', 'caption');
  const captionText = element(root, 'span', undefined, spec.chart.caption);
  captionText.id = 'chart-caption';
  caption.appendChild(captionText);
  caption.appendChild(element(root, 'span', 'credit', CREDIT));
  figure.appendChild(caption);
  record.body.appendChild(figure);

  record.body.appendChild(buildKey(root, spec.chart.key));
  const chartButtons = attachFigureButtons(
    root, chart, { title: spec.title, columns: [] }, `${spec.slug}-figure`,
  );
  record.body.appendChild(chartButtons.element);

  // A second figure, where one chart cannot carry the story: a distribution
  // on one page, a second time series on another.
  let extra: SVGSVGElement | null = null;
  let extraButtons: FigureButtons | null = null;
  if (spec.chart.extra !== undefined) {
    const block = spec.chart.extra;
    const figure = element(root, 'figure', 'chart-figure extra-figure');
    extra = root.createElementNS('http://www.w3.org/2000/svg', 'svg');
    extra.id = 'learn-extra';
    extra.setAttribute('role', 'img');
    extra.setAttribute('aria-label', block.caption);
    figure.appendChild(extra);
    const extraCaption = element(root, 'figcaption', 'caption');
    const extraText = element(root, 'span', undefined, block.caption);
    extraText.id = 'extra-caption';
    extraCaption.appendChild(extraText);
    extraCaption.appendChild(element(root, 'span', 'credit', CREDIT));
    figure.appendChild(extraCaption);
    record.body.appendChild(figure);
    if (block.key !== undefined) record.body.appendChild(buildKey(root, block.key));
    extraButtons = attachFigureButtons(
      root, extra, { title: spec.title, columns: [] }, `${spec.slug}-figure-2`,
    );
    record.body.appendChild(extraButtons.element);
  }
  main.appendChild(record.section);

  main.appendChild(proseBlock(root, spec.drivers));

  const markers = band(root, spec.markers.heading, spec.markers.note);
  paragraphs(root, markers.body, spec.markers.paragraphs);
  const scroller = element(root, 'div', 'scroll-x');
  scroller.appendChild(markerTable(root, spec));
  markers.body.appendChild(scroller);
  main.appendChild(markers.section);

  const sources = band(root, 'Sources');
  sources.body.appendChild(sourceList(root, spec.sources));
  main.appendChild(sources.section);

  main.appendChild(siblingNav(root, spec.slug));
  main.appendChild(backLink(root, scenario, fresh));

  let report: RenderReport | null = null;
  let builder: BuilderHandle | null = null;

  function render(): RenderReport {
    const results: RenderReport['panels'] = [];
    const outcome = builder?.outcome();
    if (outcome === undefined) return { panels: results, outputs: {} };
    panel(results, 'chart', chart, () => {
      const plot = spec.chart.spec(outcome, scenario);
      renderPlot(chart, plot);
      chartButtons.update(plotTable(plot, `${spec.title} — ${spec.chart.heading}`));
    });
    if (extra !== null && spec.chart.extra !== undefined) {
      const block = spec.chart.extra;
      panel(results, 'extra', extra, () => {
        if (extra === null) return;
        if (block.kind === 'strip') {
          const strip = block.spec(outcome, scenario);
          renderStrip(extra, strip);
          extraButtons?.update(stripTable(strip, `${spec.title} — distribution`));
        } else {
          const plot = block.spec(outcome, scenario);
          renderPlot(extra, plot);
          extraButtons?.update(plotTable(plot, `${spec.title} — second figure`));
        }
      });
    }
    report = { panels: results, outputs: collectOutputs(root, OUTPUT_IDS) };
    return report;
  }

  builder = renderBuilder(root, builderHost, spec.builder, spec.input, scenario, () => {
    render();
  });
  const resultValue = builderHost.querySelector('.builder-result-value');
  if (resultValue !== null) resultValue.id = 'builder-result-value';

  const themeButton = root.getElementById('theme-toggle');
  const themeLabel = root.getElementById('theme-label');
  if (themeButton !== null && themeLabel !== null) installThemeToggle(themeButton, themeLabel);

  render();
  return { scenario, builder, chart, render, lastReport: () => report };
}

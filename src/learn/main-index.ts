/**
 * The /learn/ index: the identity with every factor linked, and the six pages
 * with the finished ones open and the rest marked as in preparation.
 */
import '../styles.css';
import { LEARN_ENTRIES } from './registry.js';
import {
  decodeScenario, defaultScenario, hashFor, learnHref,
} from '../state.js';
import { buildIdentity } from '../ui/learn/identity.js';
import { installThemeToggle } from '../ui/theme.js';
import { linkToolbar } from '../ui/toolbar.js';

const STANDFIRST = 'Six assumptions decide any emissions future. Each page below explains one '
  + 'of them: what it measures, what the world has done with it, what the CMIP7 scenarios '
  + 'assume, and how to build a value of your own and carry it back into your scenario.';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function band(heading: string): { section: HTMLElement; body: HTMLElement } {
  const section = element('section', 'learn-block banded');
  const left = element('div', 'band-left');
  left.appendChild(element('h2', undefined, heading));
  const body = element('div', 'band-right');
  section.append(left, body);
  return { section, body };
}

function mount(): void {
  const scenario = decodeScenario(window.location.search) ?? defaultScenario();
  const fresh = decodeScenario(window.location.search) === null;

  const standfirst = document.getElementById('learn-standfirst');
  if (standfirst !== null) standfirst.textContent = STANDFIRST;
  linkToolbar(document, scenario);

  const main = document.getElementById('learn-main');
  if (main === null) throw new Error('missing element #learn-main');
  main.textContent = '';

  const back = element('nav', 'back-strip');
  const backLink = document.createElement('a');
  backLink.className = 'back-link';
  backLink.href = `/${hashFor(scenario)}`;
  backLink.textContent = fresh ? '← Start a fresh scenario' : '← Back to my scenario, unchanged';
  back.appendChild(backLink);
  main.appendChild(back);

  const identity = band('The identity');
  identity.body.appendChild(buildIdentity(document, { active: null, linked: true, scenario }));
  main.appendChild(identity.section);

  const pages = band('The six pages');
  const list = element('ol', 'learn-index');
  for (const entry of LEARN_ENTRIES) {
    const item = document.createElement('li');
    const head = element('div', 'learn-index-head');
    if (entry.status === 'live') {
      const link = document.createElement('a');
      link.href = learnHref(entry.slug, scenario);
      link.textContent = entry.title;
      head.appendChild(link);
    } else {
      head.appendChild(element('span', 'forthcoming', entry.title));
      head.appendChild(element('span', 'forthcoming-tag', 'in preparation'));
    }
    item.appendChild(head);
    item.appendChild(element('p', 'gloss', entry.summary));
    list.appendChild(item);
  }
  pages.body.appendChild(list);
  main.appendChild(pages.section);

  main.appendChild(back.cloneNode(true));

  const themeButton = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');
  if (themeButton !== null && themeLabel !== null) installThemeToggle(themeButton, themeLabel);
}

mount();

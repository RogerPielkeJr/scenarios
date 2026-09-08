/**
 * The library page: every post grouped under the argument it belongs to,
 * with the reader's scenario carried through the links back into the tool.
 */
import { LIBRARY_SECTIONS, type LibraryEntry } from './entries.js';
import { decodeScenario, defaultScenario, hashFor } from '../state.js';
import { installThemeToggle } from '../ui/theme.js';
import { linkToolbar } from '../ui/toolbar.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const ARCHIVE = 'https://rogerpielkejr.substack.com/archive';

/** `2026-07-15` reads as `July 15, 2026`, with no timezone to shift it. */
export function readableDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const name = MONTHS[Number(month) - 1];
  if (year === undefined || name === undefined || day === undefined) return iso;
  return `${name} ${Number(day)}, ${year}`;
}

function element<K extends keyof HTMLElementTagNameMap>(
  root: Document, tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = root.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function buildCard(root: Document, entry: LibraryEntry): HTMLAnchorElement {
  const card = root.createElement('a');
  card.className = 'library-card';
  card.href = entry.url;
  card.target = '_blank';
  card.rel = 'noopener';

  const cover = root.createElement('img');
  cover.className = 'library-cover';
  cover.src = entry.image;
  // The title underneath says everything the cover says, so a screen reader
  // gains nothing from a second description of it.
  cover.alt = '';
  cover.loading = 'lazy';
  card.appendChild(cover);

  const body = element(root, 'div', 'library-body');
  body.appendChild(element(root, 'p', 'library-date', readableDate(entry.date)));
  body.appendChild(element(root, 'h3', undefined, entry.title));
  body.appendChild(element(root, 'p', 'gloss', entry.gloss));
  card.appendChild(body);

  return card;
}

function strip(root: Document, href: string, text: string): HTMLElement {
  const nav = element(root, 'nav', 'back-strip');
  const link = root.createElement('a');
  link.className = 'back-link';
  link.href = href;
  link.textContent = text;
  nav.appendChild(link);
  return nav;
}

export function mountLibrary(root: Document = document): void {
  const view = root.defaultView;
  const incoming = decodeScenario(view?.location.search ?? '');
  const scenario = incoming ?? defaultScenario();

  // A reader who arrives from the builder leaves with the numbers and
  // the name they came in with; a reader who arrives cold starts fresh.
  linkToolbar(root, scenario);

  const main = root.getElementById('library-main');
  if (main === null) throw new Error('missing element #library-main');
  main.textContent = '';

  main.appendChild(strip(root, `/${hashFor(scenario)}`,
    incoming === null ? '← Start a fresh scenario' : '← Back to my scenario, unchanged'));

  for (const section of LIBRARY_SECTIONS) {
    const block = element(root, 'section', 'learn-block banded');
    block.id = section.id;
    const left = element(root, 'div', 'band-left');
    left.appendChild(element(root, 'h2', undefined, section.title));
    left.appendChild(element(root, 'p', 'block-note', section.note));
    const right = element(root, 'div', 'band-right');
    const grid = element(root, 'div', 'library-grid');
    for (const entry of section.entries) grid.appendChild(buildCard(root, entry));
    right.appendChild(grid);
    block.append(left, right);
    main.appendChild(block);
  }

  main.appendChild(strip(root, ARCHIVE, 'Every post at The Honest Broker →'));

  const themeButton = root.getElementById('theme-toggle');
  const themeLabel = root.getElementById('theme-label');
  if (themeButton !== null && themeLabel !== null) installThemeToggle(themeButton, themeLabel);
}

import './styles.css';
import { installThemeToggle } from './ui/theme.js';
import { linkToolbar } from './ui/toolbar.js';
import { decodeScenario, defaultScenario } from './state.js';
import { LEARN_ENTRIES } from './learn/registry.js';
import { citedSources } from './learn/sources/index.js';

const button = document.getElementById('theme-toggle');
const label = document.getElementById('theme-label');
if (button !== null && label !== null) installThemeToggle(button, label);

// This page held the one route back that dropped the reader's scenario.
linkToolbar(document, decodeScenario(window.location.search) ?? defaultScenario());

function render(): void {
  const list = document.getElementById('learn-sources');
  const intro = document.getElementById('learn-sources-intro');
  if (list === null) return;

  const cited = citedSources();
  const pages = LEARN_ENTRIES.filter((entry) => entry.status === 'live').length;
  if (intro !== null) {
    intro.textContent = `Every work the ${pages} Learn More pages cite, ${cited.length} of `
      + 'them, each with what that page took from it. A work several pages share appears once.';
  }

  list.textContent = '';
  for (const { source, pages: where } of cited) {
    const item = document.createElement('li');
    const line = document.createElement('p');
    line.className = 'ref';
    const link = document.createElement('a');
    link.href = source.url;
    link.textContent = source.title;
    link.rel = 'noopener';
    line.appendChild(link);
    line.appendChild(document.createTextNode(`. ${source.publisher}, ${source.vintage}.`));
    item.appendChild(line);

    const gloss = document.createElement('p');
    gloss.className = 'gloss';
    gloss.textContent = source.used;
    item.appendChild(gloss);

    const cites = document.createElement('p');
    cites.className = 'cited-by';
    cites.textContent = `Cited by: ${where.join(', ')}.`;
    item.appendChild(cites);

    list.appendChild(item);
  }
}

render();

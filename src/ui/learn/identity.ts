/**
 * The Kaya identity across the top of every Learn More page, with the page's
 * own factor inked and the rest ghosted. Laid out as flowing HTML rather than
 * a drawing, so it wraps rather than shrinks on a narrow screen.
 */
import { LEARN_ENTRIES } from '../../learn/registry.js';
import type { InputId } from '../../model/types.js';

/** The four factors that multiply, in the order the identity writes them. */
const CHAIN: Array<{ input: InputId; short: string }> = [
  { input: 'population', short: 'People' },
  { input: 'income', short: 'GDP per person' },
  { input: 'energyPerDollar', short: 'Energy per dollar' },
  { input: 'co2PerEnergy', short: 'CO2 per unit of energy' },
];

function factorNode(
  root: Document, input: InputId, text: string, active: InputId | null, linked: boolean,
): HTMLElement {
  const entry = LEARN_ENTRIES.find((candidate) => candidate.input === input);
  const live = entry !== undefined && entry.status === 'live' && linked && input !== active;
  const node = root.createElement(live ? 'a' : 'span');
  node.className = input === active ? 'factor is-active' : 'factor';
  node.textContent = text;
  if (live && node instanceof HTMLAnchorElement) node.href = `/learn/${entry.slug}/`;
  return node;
}

export interface IdentityOptions {
  /** The factor to ink, or null on the index where none leads. */
  active?: InputId | null;
  /** Links every other live factor to its page. */
  linked?: boolean;
}

export function buildIdentity(root: Document, options: IdentityOptions = {}): HTMLElement {
  const active = options.active ?? null;
  const linked = options.linked ?? true;
  const wrapper = root.createElement('div');
  wrapper.className = 'identity';

  const line = root.createElement('div');
  line.className = 'identity-line';
  CHAIN.forEach((factor, index) => {
    if (index > 0) {
      const operator = root.createElement('span');
      operator.className = 'op';
      operator.textContent = '×';
      line.appendChild(operator);
    }
    line.appendChild(factorNode(root, factor.input, factor.short, active, linked));
  });
  const equals = root.createElement('span');
  equals.className = 'op op-equals';
  equals.textContent = '=';
  line.appendChild(equals);
  const result = root.createElement('span');
  result.className = 'identity-result';
  result.textContent = 'Fossil and industrial CO2';
  line.appendChild(result);
  wrapper.appendChild(line);

  const tail = root.createElement('div');
  tail.className = 'identity-line identity-tail';
  const plus = root.createElement('span');
  plus.className = 'op';
  plus.textContent = '+';
  tail.appendChild(plus);
  tail.appendChild(factorNode(root, 'landUse', 'Land use CO2', active, linked));
  const total = root.createElement('span');
  total.className = 'op op-equals';
  total.textContent = '=';
  tail.appendChild(total);
  const totalLabel = root.createElement('span');
  totalLabel.className = 'identity-result';
  totalLabel.textContent = 'Total CO2';
  tail.appendChild(totalLabel);
  wrapper.appendChild(tail);

  const aside = root.createElement('p');
  aside.className = 'identity-aside';
  aside.appendChild(root.createTextNode('The identity above covers CO2 only. Methane warms '
    + 'the world through a coefficient of its own: '));
  aside.appendChild(factorNode(root, 'methane', 'Methane', active, linked));
  aside.appendChild(root.createTextNode('.'));
  wrapper.appendChild(aside);

  return wrapper;
}

/**
 * The Kaya identity across the top of every Learn More page, with the page's
 * own factor inked and the rest ghosted. Laid out as flowing HTML rather than
 * a drawing, so it wraps rather than shrinks on a narrow screen.
 */
import { LEARN_ENTRIES } from '../../learn/registry.js';
import { learnHref, type Scenario } from '../../state.js';
import type { InputId } from '../../model/types.js';

/** The four factors that multiply, in the order the identity writes them. */
const CHAIN: Array<{ input: InputId; short: string }> = [
  { input: 'population', short: 'People' },
  { input: 'income', short: 'GDP per person' },
  { input: 'energyPerDollar', short: 'Energy per dollar' },
  { input: 'co2PerEnergy', short: 'CO₂ per unit of energy' },
];

function factorNode(
  root: Document, input: InputId, text: string, active: InputId | null, linked: boolean,
  scenario: Scenario,
): HTMLElement {
  const entry = LEARN_ENTRIES.find((candidate) => candidate.input === input);
  const live = entry !== undefined && entry.status === 'live' && linked && input !== active;
  const node = root.createElement(live ? 'a' : 'span');
  node.className = input === active ? 'factor is-active' : 'factor';
  node.textContent = text;
  // Through learnHref, never a bare path: a bare one drops the reader's six
  // numbers and their name on the way, and the Use button on the page they
  // land on then carries the defaults home over all of them.
  if (live && node instanceof HTMLAnchorElement) node.href = learnHref(entry.slug, scenario);
  return node;
}

export interface IdentityOptions {
  /**
   * The reader's scenario, which every factor link carries.
   *
   * Required, not optional: this is the third place a bare link to a Learn
   * More page has reset the reader's scenario, so the type now refuses one.
   */
  scenario: Scenario;
  /** The factor to ink, or null on the index where none leads. */
  active?: InputId | null;
  /** Links every other live factor to its page. */
  linked?: boolean;
}

export function buildIdentity(root: Document, options: IdentityOptions): HTMLElement {
  const active = options.active ?? null;
  const linked = options.linked ?? true;
  const { scenario } = options;
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
    line.appendChild(factorNode(root, factor.input, factor.short, active, linked,
      scenario));
  });
  const equals = root.createElement('span');
  equals.className = 'op op-equals';
  equals.textContent = '=';
  line.appendChild(equals);
  const result = root.createElement('span');
  result.className = 'identity-result';
  result.textContent = 'Fossil and industrial CO₂';
  line.appendChild(result);
  wrapper.appendChild(line);

  const tail = root.createElement('div');
  tail.className = 'identity-line identity-tail';
  const plus = root.createElement('span');
  plus.className = 'op';
  plus.textContent = '+';
  tail.appendChild(plus);
  tail.appendChild(factorNode(root, 'landUse', 'Land use CO₂', active, linked, scenario));
  const total = root.createElement('span');
  total.className = 'op op-equals';
  total.textContent = '=';
  tail.appendChild(total);
  const totalLabel = root.createElement('span');
  totalLabel.className = 'identity-result';
  totalLabel.textContent = 'Total CO₂';
  tail.appendChild(totalLabel);
  wrapper.appendChild(tail);

  const aside = root.createElement('p');
  aside.className = 'identity-aside';
  aside.appendChild(root.createTextNode('The identity above covers CO₂ only. Methane enters '
    + 'the warming figure through a separate coefficient: '));
  aside.appendChild(factorNode(root, 'methane', 'Methane', active, linked, scenario));
  aside.appendChild(root.createTextNode('.'));
  wrapper.appendChild(aside);

  return wrapper;
}

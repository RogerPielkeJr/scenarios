/**
 * The receiving half of a Learn More hand-off.
 *
 * A builder returns the reader to /?applied=<field>#s=<state>. The state
 * itself carries the new value, so this only has to say which field moved,
 * show the reader where it landed, and clear the marker out of the address
 * bar so a copied link opens without a stale message.
 */
import { INPUT_IDS, type InputId, type ScenarioInputs } from '../model/types.js';
import { SPEC_BY_ID } from '../model/config.js';
import { LEARN_BY_INPUT } from '../learn/registry.js';
import { formatInputWithUnit } from '../format.js';

const HIGHLIGHT_MS = 1500;

/** The field a Learn More builder replaced, or null. */
export function appliedInput(search: string): InputId | null {
  const value = new URLSearchParams(search.replace(/^\?/, '')).get('applied');
  return INPUT_IDS.find((id) => id === value) ?? null;
}

function reducedMotion(view: Window): boolean {
  return typeof view.matchMedia === 'function'
    && view.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Names the value and where it came from, scrolls its slider into view and
 * lights it briefly. Returns the line it inserted, or null when the page
 * carries no such control.
 */
export function announceHandoff(
  root: Document, id: InputId, inputs: ScenarioInputs,
): HTMLElement | null {
  const controls = root.getElementById('controls');
  if (controls === null) return null;

  const spec = SPEC_BY_ID[id];
  const entry = LEARN_BY_INPUT[id];
  const line = root.createElement('div');
  line.className = 'handoff';
  line.setAttribute('role', 'status');

  const text = root.createElement('p');
  text.innerHTML = `<b>${spec.label}</b> set to `
    + `<b>${formatInputWithUnit(id, inputs[id])}</b> on the `
    + `${entry === undefined ? 'Learn More' : entry.title.toLowerCase()} page.`;
  line.appendChild(text);

  const dismiss = root.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'handoff-dismiss';
  dismiss.setAttribute('aria-label', 'Dismiss this message');
  dismiss.textContent = 'Dismiss';
  dismiss.addEventListener('click', () => line.remove());
  line.appendChild(dismiss);

  controls.parentElement?.insertBefore(line, controls);

  const control = controls.querySelector(`[data-input="${id}"]`);
  if (control instanceof HTMLElement) {
    const view = root.defaultView;
    if (typeof control.scrollIntoView === 'function') {
      control.scrollIntoView({
        behavior: view !== null && reducedMotion(view) ? 'auto' : 'smooth',
        block: 'center',
      });
    }
    control.classList.add('is-applied');
    view?.setTimeout(() => control.classList.remove('is-applied'), HIGHLIGHT_MS);
  }
  return line;
}

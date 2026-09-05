import { INPUT_SPECS } from '../model/config.js';
import { MARKER_BY_ID, markerValueFor } from '../model/markers.js';
import { presetByLabel } from '../model/bounds.js';
import type { ScenarioInputs } from '../model/types.js';
import { formatInput } from '../format.js';

const OBSERVED = presetByLabel('Kaya at observed rates');
const HIGH = MARKER_BY_ID['H'];

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cell(text: string, className?: string): string {
  const attribute = className === undefined ? '' : ` class="${className}"`;
  return `<td${attribute}>${text}</td>`;
}

/**
 * Your six assumptions against the observed record and against CMIP7 HIGH.
 * A dash means that scenario publishes no value for that factor.
 */
export function renderTable(
  table: HTMLTableElement, inputs: ScenarioInputs, name = 'Build your own',
): void {
  const header = '<thead><tr>'
    + `<th scope="col">Assumption</th><th scope="col">${escapeText(name)}</th>`
    + '<th scope="col">Observed</th><th scope="col">CMIP7 HIGH</th>'
    + '<th scope="col">Units</th></tr></thead>';

  const rows = INPUT_SPECS.map((spec) => {
    const observed = OBSERVED?.inputs[spec.id];
    const high = HIGH === undefined ? null : markerValueFor(HIGH, spec.id);
    return '<tr>'
      + `<th scope="row">${spec.label}</th>`
      + cell(formatInput(spec.id, inputs[spec.id]), 'yours')
      + cell(observed === undefined ? '—' : formatInput(spec.id, observed))
      + cell(high === null ? '—' : formatInput(spec.id, high))
      + cell(spec.units, 'units')
      + '</tr>';
  }).join('');

  table.innerHTML = `${header}<tbody>${rows}</tbody>`;
}

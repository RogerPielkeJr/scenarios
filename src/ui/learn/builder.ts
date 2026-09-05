/**
 * The builder every Learn More page ends with: a set of controls the reader
 * moves, an assembled value, and the link that carries it back into the
 * scenario. The arithmetic belongs to the page; everything here is the
 * apparatus around it.
 */
import { SPEC_BY_ID, fitToSlider, withInput } from '../../model/config.js';
import { formatInput, formatInputWithUnit } from '../../format.js';
import { returnHref, type Scenario } from '../../state.js';
import type { InputId } from '../../model/types.js';
import type { BuilderBlock, BuilderOutcome, BuilderPart } from '../../learn/types.js';
import { buildScale } from '../scale.js';
import type { Tick } from '../ticks.js';

const MARK_COLORS: Record<string, string> = {
  low: 'var(--dim)',
  medium: 'var(--navy)',
  high: 'var(--dim)',
  observed: 'var(--navy)',
};

function element<K extends keyof HTMLElementTagNameMap>(
  root: Document, tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = root.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The marks under one builder control, in the shape the shared scale takes. */
function ticksFor(part: BuilderPart): Tick[] {
  return part.marks.map((mark) => ({
    position: ((mark.value - part.min) / (part.max - part.min)) * 100,
    label: mark.label,
    color: MARK_COLORS[mark.kind] ?? 'var(--dim)',
    id: mark.label,
    priority: mark.kind === 'medium' || mark.kind === 'observed',
  }));
}

export interface BuilderHandle {
  element: HTMLElement;
  values(): Record<string, number>;
  outcome(): BuilderOutcome;
  /** The outcome as the slider will actually take it. */
  fitted(): { value: number; clamped: 'min' | 'max' | null };
  set(id: string, value: number): void;
  /** Where the Use button currently points. */
  href(): string;
}

export function renderBuilder(
  root: Document,
  container: HTMLElement,
  block: BuilderBlock,
  input: InputId,
  scenario: Scenario,
  onChange?: (outcome: BuilderOutcome) => void,
): BuilderHandle {
  const spec = SPEC_BY_ID[input];
  const values: Record<string, number> = {};
  const readouts = new Map<string, HTMLElement>();
  const ranges = new Map<string, HTMLInputElement>();

  const controls = element(root, 'div', 'builder-controls');
  for (const part of block.parts) {
    values[part.id] = part.default;
    const wrapper = element(root, 'div', 'builder-part');
    wrapper.dataset['part'] = part.id;

    const head = element(root, 'div', 'builder-part-head');
    const heading = element(root, 'h3', undefined, part.label);
    heading.id = `part-${part.id}`;
    head.appendChild(heading);
    const readout = element(root, 'div', 'builder-readout');
    readout.id = `readout-${part.id}`;
    head.appendChild(readout);
    wrapper.appendChild(head);
    readouts.set(part.id, readout);

    if (part.note !== undefined) wrapper.appendChild(element(root, 'p', 'why', part.note));

    const range = root.createElement('input');
    range.type = 'range';
    range.id = `part-input-${part.id}`;
    range.min = String(part.min);
    range.max = String(part.max);
    range.step = String(part.step);
    range.value = String(part.default);
    range.setAttribute('aria-labelledby', heading.id);
    wrapper.appendChild(range);
    ranges.set(part.id, range);

    wrapper.appendChild(buildScale(root, ticksFor(part)));
    controls.appendChild(wrapper);
  }
  container.appendChild(controls);

  const result = element(root, 'div', 'builder-result');
  const resultKey = element(root, 'div', 'builder-result-key', 'Your value');
  const resultValue = element(root, 'div', 'builder-result-value');
  const resultDetail = element(root, 'ul', 'builder-detail');
  const resultFit = element(root, 'p', 'builder-fit');
  const action = root.createElement('a');
  action.className = 'use-button';
  action.textContent = block.action;
  result.append(resultKey, resultValue, resultDetail, resultFit, action);
  container.appendChild(result);

  function currentOutcome(): BuilderOutcome {
    return block.combine({ ...values });
  }

  function refresh(): void {
    for (const part of block.parts) {
      const readout = readouts.get(part.id);
      const value = values[part.id] ?? part.default;
      if (readout) readout.textContent = value.toFixed(part.decimals) + part.unitSuffix;
    }
    const outcome = currentOutcome();
    const fit = fitToSlider(input, outcome.value);
    resultValue.textContent = outcome.headline;

    resultDetail.textContent = '';
    for (const line of outcome.detail) {
      resultDetail.appendChild(element(root, 'li', undefined, line));
    }

    const rounded = `The slider takes this as ${formatInputWithUnit(input, fit.value)}.`;
    const clampNote = fit.clamped === null ? ''
      : ` The slider stops at ${formatInput(input, fit.clamped === 'min' ? spec.min : spec.max)}`
        + `${spec.unitSuffix}, so your ${formatInput(input, outcome.value)}${spec.unitSuffix} `
        + 'arrives clamped.';
    resultFit.textContent = rounded + clampNote;

    action.href = returnHref(
      { inputs: withInput(scenario.inputs, input, fit.value), name: scenario.name },
      input,
    );
    onChange?.(outcome);
  }

  for (const part of block.parts) {
    const range = ranges.get(part.id);
    range?.addEventListener('input', () => {
      values[part.id] = Number(range.value);
      refresh();
    });
  }
  refresh();

  return {
    element: container,
    values: () => ({ ...values }),
    outcome: currentOutcome,
    fitted: () => fitToSlider(input, currentOutcome().value),
    set(id, value) {
      if (!(id in values)) throw new Error(`no builder part "${id}"`);
      values[id] = value;
      const range = ranges.get(id);
      if (range) range.value = String(value);
      refresh();
    },
    href: () => action.href,
  };
}

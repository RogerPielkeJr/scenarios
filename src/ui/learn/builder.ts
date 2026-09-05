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
import type {
  BuilderBlock, BuilderMode, BuilderOutcome, BuilderPart,
} from '../../learn/types.js';
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
  /** The active mode's part values. */
  values(): Record<string, number>;
  outcome(): BuilderOutcome;
  /** The outcome as the slider will actually take it. */
  fitted(): { value: number; clamped: 'min' | 'max' | null };
  set(id: string, value: number): void;
  /** Switches to another way of assembling the value. */
  selectMode(id: string): void;
  mode(): string;
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
  const first = block.modes[0];
  if (first === undefined) throw new Error('a builder needs at least one mode');

  // Each mode keeps its own values, so switching back and forth does not
  // silently reset what the reader set.
  const values = new Map<string, Record<string, number>>();
  const panels = new Map<string, HTMLElement>();
  const readouts = new Map<string, HTMLElement>();
  const ranges = new Map<string, HTMLInputElement>();
  let active: BuilderMode = first;

  const switcher = element(root, 'div', 'builder-modes');
  switcher.setAttribute('role', 'tablist');
  const modeNote = element(root, 'p', 'builder-mode-note');
  const buttons = new Map<string, HTMLButtonElement>();
  if (block.modes.length > 1) {
    for (const mode of block.modes) {
      const button = root.createElement('button');
      button.type = 'button';
      button.className = 'mode-button';
      button.textContent = mode.label;
      button.dataset['mode'] = mode.id;
      button.setAttribute('aria-pressed', String(mode.id === first.id));
      button.addEventListener('click', () => select(mode.id));
      switcher.appendChild(button);
      buttons.set(mode.id, button);
    }
    container.append(switcher, modeNote);
  }

  for (const mode of block.modes) {
    const controls = element(root, 'div', 'builder-controls');
    controls.dataset['modePanel'] = mode.id;
    const modeValues: Record<string, number> = {};
    for (const part of mode.parts) {
      modeValues[part.id] = part.default;
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
      range.addEventListener('input', () => {
        const current = values.get(mode.id);
        if (current) current[part.id] = Number(range.value);
        refresh();
      });
      wrapper.appendChild(range);
      ranges.set(part.id, range);

      wrapper.appendChild(buildScale(root, ticksFor(part)));
      controls.appendChild(wrapper);
    }
    values.set(mode.id, modeValues);
    panels.set(mode.id, controls);
    container.appendChild(controls);
  }

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

  function activeValues(): Record<string, number> {
    return values.get(active.id) ?? {};
  }

  function currentOutcome(): BuilderOutcome {
    return active.combine({ ...activeValues() });
  }

  function select(id: string): void {
    const mode = block.modes.find((candidate) => candidate.id === id);
    if (mode === undefined) throw new Error(`no builder mode "${id}"`);
    active = mode;
    for (const [modeId, panel] of panels) panel.hidden = modeId !== id;
    for (const [modeId, button] of buttons) {
      button.setAttribute('aria-pressed', String(modeId === id));
    }
    modeNote.textContent = mode.note ?? '';
    refresh();
  }

  function refresh(): void {
    const current = activeValues();
    for (const part of active.parts) {
      const readout = readouts.get(part.id);
      const value = current[part.id] ?? part.default;
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

  select(first.id);

  return {
    element: container,
    values: () => ({ ...activeValues() }),
    outcome: currentOutcome,
    fitted: () => fitToSlider(input, currentOutcome().value),
    set(id, value) {
      const current = activeValues();
      if (!(id in current)) throw new Error(`no part "${id}" in builder mode "${active.id}"`);
      current[id] = value;
      const range = ranges.get(id);
      if (range) range.value = String(value);
      refresh();
    },
    selectMode: select,
    mode: () => active.id,
    href: () => action.href,
  };
}

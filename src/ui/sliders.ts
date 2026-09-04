import { INPUT_SPECS, SPEC_BY_ID } from '../model/config.js';
import { MARKERS, markerValueFor } from '../model/markers.js';
import type { InputId, ScenarioInputs } from '../model/types.js';
import { formatInputWithUnit } from '../format.js';
import { placeTicks, type Tick } from './ticks.js';

/** Width of the slider track we lay labels out against, in CSS pixels. */
const TRACK_WIDTH_PX = 380;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Every mark that belongs under one slider: the observed value first, then
 * each CMIP7 marker that publishes a value for this factor and that falls
 * inside the slider's range.
 */
function ticksFor(id: InputId): Tick[] {
  const spec = SPEC_BY_ID[id];
  const toPosition = (value: number) => ((value - spec.min) / (spec.max - spec.min)) * 100;
  const ticks: Tick[] = [{
    position: toPosition(spec.reference.value),
    label: spec.reference.label,
    color: 'var(--navy)',
    id: 'reference',
    priority: true,
  }];
  for (const marker of MARKERS) {
    const value = markerValueFor(marker, id);
    if (value === null || value < spec.min || value > spec.max) continue;
    ticks.push({ position: toPosition(value), label: marker.id, color: marker.color, id: marker.id });
  }
  return ticks;
}

/** Builds the calibrated scale that sits under one slider track. */
function buildScale(id: InputId): HTMLDivElement {
  const scale = element('div', 'scale');
  scale.appendChild(element('div', 'axis'));

  for (const tick of placeTicks(ticksFor(id), { trackWidthPx: TRACK_WIDTH_PX })) {
    const mark = element('div');
    mark.className = tick.row === null
      ? 'mark mark-hidden'
      : `mark mark-row${tick.row}`;
    mark.style.left = `${tick.position}%`;
    mark.style.background = tick.color;
    scale.appendChild(mark);
    if (tick.row === null) continue;

    const label = element('div', `label label-row${tick.row}`, tick.label);
    label.style.left = `${tick.position}%`;
    label.style.color = tick.color;
    scale.appendChild(label);
  }
  return scale;
}

export interface SliderPanel {
  /** Redraws the readouts and moves the handles to match the state. */
  update(inputs: ScenarioInputs): void;
}

export function renderSliders(
  container: HTMLElement,
  onInput: (id: InputId, value: number) => void,
): SliderPanel {
  container.textContent = '';
  const readouts = new Map<InputId, HTMLElement>();
  const ranges = new Map<InputId, HTMLInputElement>();

  for (const spec of INPUT_SPECS) {
    const control = element('div', 'control');
    const heading = element('h3', undefined, spec.label);
    heading.id = `label-${spec.id}`;
    control.appendChild(heading);
    control.appendChild(element('p', 'why', spec.help));

    const readout = element('div', 'readout');
    readout.id = `readout-${spec.id}`;
    control.appendChild(readout);
    readouts.set(spec.id, readout);

    const range = document.createElement('input');
    range.type = 'range';
    range.id = `input-${spec.id}`;
    range.min = String(spec.min);
    range.max = String(spec.max);
    range.step = String(spec.step);
    range.value = String(spec.default);
    range.setAttribute('aria-labelledby', heading.id);
    range.addEventListener('input', () => onInput(spec.id, Number(range.value)));
    control.appendChild(range);
    ranges.set(spec.id, range);

    control.appendChild(buildScale(spec.id));
    container.appendChild(control);
  }

  return {
    update(inputs) {
      for (const spec of INPUT_SPECS) {
        const readout = readouts.get(spec.id);
        const range = ranges.get(spec.id);
        if (readout) readout.textContent = formatInputWithUnit(spec.id, inputs[spec.id]);
        if (range && Number(range.value) !== inputs[spec.id]) range.value = String(inputs[spec.id]);
      }
    },
  };
}

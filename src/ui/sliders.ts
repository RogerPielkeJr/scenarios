import { INPUT_SPECS, SPEC_BY_ID } from '../model/config.js';
import { MARKERS, markerValueFor } from '../model/markers.js';
import { liveEntryFor } from '../learn/registry.js';
import type { InputId } from '../model/types.js';
import { learnHref, type Scenario } from '../state.js';
import { formatInputWithUnit } from '../format.js';
import { buildScale } from './scale.js';
import type { Tick } from './ticks.js';

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

export interface SliderPanel {
  /** Redraws the readouts, moves the handles, and repoints the Learn More links. */
  update(scenario: Scenario): void;
}

export function renderSliders(
  container: HTMLElement,
  onInput: (id: InputId, value: number) => void,
): SliderPanel {
  container.textContent = '';
  const readouts = new Map<InputId, HTMLElement>();
  const ranges = new Map<InputId, HTMLInputElement>();
  const learnLinks = new Map<InputId, HTMLAnchorElement>();

  for (const spec of INPUT_SPECS) {
    const control = element('div', 'control');
    control.dataset['input'] = spec.id;

    // The link sits above the heading and carries the reader's scenario with
    // it, so a Learn More page opens on the numbers they already set.
    const entry = liveEntryFor(spec.id);
    if (entry !== null) {
      const link = document.createElement('a');
      link.className = 'learn-link';
      link.textContent = entry.linkText;
      link.href = `/learn/${entry.slug}/`;
      control.appendChild(link);
      learnLinks.set(spec.id, link);
    }

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

    control.appendChild(buildScale(document, ticksFor(spec.id)));
    container.appendChild(control);
  }

  return {
    update(scenario) {
      const { inputs } = scenario;
      for (const spec of INPUT_SPECS) {
        const readout = readouts.get(spec.id);
        const range = ranges.get(spec.id);
        const link = learnLinks.get(spec.id);
        if (readout) readout.textContent = formatInputWithUnit(spec.id, inputs[spec.id]);
        if (range && Number(range.value) !== inputs[spec.id]) range.value = String(inputs[spec.id]);
        const entry = liveEntryFor(spec.id);
        if (link && entry) link.href = learnHref(entry.slug, scenario);
      }
    },
  };
}

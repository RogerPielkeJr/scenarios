import { INPUT_SPECS, clampInput, defaultInputs } from './model/config.js';
import { PRESETS } from './model/bounds.js';
import type { ScenarioInputs } from './model/types.js';

const HASH_PREFIX = '#s=';

/** Order is fixed by INPUT_SPECS, so old links keep working. */
function orderedIds() {
  return INPUT_SPECS.map((spec) => spec.id);
}

export function encodeInputs(inputs: ScenarioInputs): string {
  return orderedIds().map((id) => String(inputs[id])).join('_');
}

/**
 * Reads a scenario out of a URL hash. Returns null for anything malformed,
 * so a mangled link opens the default scenario rather than a broken page.
 */
export function decodeInputs(hash: string): ScenarioInputs | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const parts = hash.slice(HASH_PREFIX.length).split('_');
  const ids = orderedIds();
  if (parts.length !== ids.length) return null;
  const values = parts.map(Number);
  if (values.some((v) => !Number.isFinite(v))) return null;
  const inputs = defaultInputs();
  ids.forEach((id, i) => {
    inputs[id] = clampInput(id, values[i] as number);
  });
  return inputs;
}

export function hashFor(inputs: ScenarioInputs): string {
  return HASH_PREFIX + encodeInputs(inputs);
}

export function shareUrl(inputs: ScenarioInputs): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${hashFor(inputs)}`;
}

/** Holds the six values and tells listeners when they change. */
export class ScenarioState {
  private inputs: ScenarioInputs;
  private listeners: Array<(inputs: ScenarioInputs) => void> = [];

  constructor(initial?: ScenarioInputs | null) {
    this.inputs = initial ?? defaultInputs();
  }

  get(): ScenarioInputs {
    return { ...this.inputs };
  }

  set<K extends keyof ScenarioInputs>(id: K, value: number): void {
    this.inputs[id] = clampInput(id, value);
    this.emit();
  }

  replace(inputs: ScenarioInputs): void {
    this.inputs = { ...inputs };
    this.emit();
  }

  /** True when the current values match a preset exactly. */
  matchingPresetId(): string | null {
    const current = this.inputs;
    const match = PRESETS.find((preset) => orderedIds()
      .every((id) => Math.abs(preset.inputs[id] - current[id]) < 1e-9));
    return match ? match.id : null;
  }

  onChange(listener: (inputs: ScenarioInputs) => void): void {
    this.listeners.push(listener);
  }

  private emit(): void {
    const snapshot = this.get();
    for (const listener of this.listeners) listener(snapshot);
  }
}

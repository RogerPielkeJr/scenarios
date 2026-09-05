import { INPUT_SPECS, clampInput, defaultInputs } from './model/config.js';
import { PRESETS } from './model/bounds.js';
import type { InputId, ScenarioInputs } from './model/types.js';

/**
 * A scenario is the six numbers plus whatever the reader called it. The name
 * travels with the numbers through share links and through the Learn More
 * pages, so a named scenario stays named wherever it is opened.
 */
export interface Scenario {
  inputs: ScenarioInputs;
  /** Empty until the reader types one; the interface then says "Build your own". */
  name: string;
}

export const MAX_NAME_LENGTH = 60;
export const DEFAULT_SCENARIO_NAME = 'Build your own';

/** Collapses whitespace and caps the length, so a name cannot bloat a link. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

/** What the interface calls the reader's path when they have not named it. */
export function displayName(name: string): string {
  return name === '' ? DEFAULT_SCENARIO_NAME : name;
}

/** Every input at its default, with no name. */
export function defaultScenario(): Scenario {
  return { inputs: defaultInputs(), name: '' };
}

/** Order is fixed by INPUT_SPECS, so old links keep working. */
function orderedIds(): InputId[] {
  return INPUT_SPECS.map((spec) => spec.id);
}

export function encodeInputs(inputs: ScenarioInputs): string {
  return orderedIds().map((id) => String(inputs[id])).join('_');
}

/**
 * `s=10.2_1.91_-1.62_-0.48_1_300&n=Fast%20electrification`.
 *
 * The six numbers keep the shape they have always had, so links written
 * before scenarios could be named still open. The name rides alongside.
 */
export function encodeScenario(scenario: Scenario): string {
  const numbers = `s=${encodeInputs(scenario.inputs)}`;
  const name = cleanName(scenario.name);
  return name === '' ? numbers : `${numbers}&n=${encodeURIComponent(name)}`;
}

/**
 * Reads a scenario out of a URL hash or query string. Returns null for
 * anything malformed, so a mangled link opens the default scenario rather
 * than a broken page.
 */
export function decodeScenario(text: string): Scenario | null {
  const body = text.replace(/^[#?]/, '');
  if (body === '') return null;
  const params = new URLSearchParams(body);
  const numbers = params.get('s');
  if (numbers === null) return null;
  const parts = numbers.split('_');
  const ids = orderedIds();
  if (parts.length !== ids.length) return null;
  const values = parts.map(Number);
  if (values.some((v) => !Number.isFinite(v))) return null;
  const inputs = defaultInputs();
  ids.forEach((id, i) => {
    inputs[id] = clampInput(id, values[i] as number);
  });
  return { inputs, name: cleanName(params.get('n') ?? '') };
}

export function hashFor(scenario: Scenario): string {
  return `#${encodeScenario(scenario)}`;
}

/**
 * The address bar entry for a scenario on the page it already sits on.
 *
 * Replacing history with a bare hash resolves against the current URL and
 * keeps any query string, which would leave ?applied= behind for a reader
 * to copy into a link.
 */
export function pathWithScenario(scenario: Scenario): string {
  return `${window.location.pathname}${hashFor(scenario)}`;
}

export function shareUrl(scenario: Scenario): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${hashFor(scenario)}`;
}

/** The link from a slider on the top page to its Learn More page. */
export function learnHref(slug: string, scenario: Scenario): string {
  return `/learn/${slug}/?${encodeScenario(scenario)}`;
}

/**
 * The link back to the scenario builder. `applied` names the one field a
 * builder replaced, which the top page uses to say where the value came
 * from and then strips out of the address bar.
 */
export function returnHref(scenario: Scenario, applied?: InputId): string {
  const query = applied === undefined ? '' : `?applied=${applied}`;
  return `/${query}${hashFor(scenario)}`;
}

/** Holds the scenario and tells listeners when it changes. */
export class ScenarioState {
  private inputs: ScenarioInputs;
  private label: string;
  private listeners: Array<(scenario: Scenario) => void> = [];

  constructor(initial?: Scenario | null) {
    this.inputs = initial?.inputs ?? defaultInputs();
    this.label = initial?.name ?? '';
  }

  get(): ScenarioInputs {
    return { ...this.inputs };
  }

  name(): string {
    return this.label;
  }

  scenario(): Scenario {
    return { inputs: this.get(), name: this.label };
  }

  set<K extends keyof ScenarioInputs>(id: K, value: number): void {
    this.inputs[id] = clampInput(id, value);
    this.emit();
  }

  setName(name: string): void {
    this.label = cleanName(name);
    this.emit();
  }

  replace(inputs: ScenarioInputs): void {
    this.inputs = { ...inputs };
    this.emit();
  }

  /** True when the current values match a preset exactly. The name is free. */
  matchingPresetId(): string | null {
    const current = this.inputs;
    const match = PRESETS.find((preset) => orderedIds()
      .every((id) => Math.abs(preset.inputs[id] - current[id]) < 1e-9));
    return match ? match.id : null;
  }

  onChange(listener: (scenario: Scenario) => void): void {
    this.listeners.push(listener);
  }

  private emit(): void {
    const snapshot = this.scenario();
    for (const listener of this.listeners) listener(snapshot);
  }
}

/**
 * Render boundaries, shared by Build your own climate scenario and the Learn More pages.
 *
 * A single failed edit used to take a whole page down halfway through the
 * render, leaving some panels filled and others showing a dash with no clue
 * why. A broken panel now says so in place and every other panel still draws.
 */
export interface PanelResult {
  name: string;
  ok: boolean;
  error?: string;
}

export interface RenderReport {
  panels: PanelResult[];
  /** Text of every output element after the render, keyed by element id. */
  outputs: Record<string, string>;
}

export function panel(
  results: PanelResult[], name: string, target: Element | null, draw: () => void,
): void {
  try {
    draw();
    results.push({ name, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, error: message });
    if (target !== null) target.textContent = 'unavailable';
    console.error(`[kaya] panel "${name}" failed to render:`, error);
  }
}

/** The text of the named elements, for a test to check nothing came out empty. */
export function collectOutputs(root: Document, ids: readonly string[]): Record<string, string> {
  const outputs: Record<string, string> = {};
  for (const id of ids) {
    outputs[id] = root.getElementById(id)?.textContent?.trim() ?? '';
  }
  return outputs;
}

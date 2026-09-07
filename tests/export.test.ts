// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from '../src/app.js';
import { summaryOf } from '../src/ui/export.js';
import { PRESETS } from '../src/model/bounds.js';
import { computePath } from '../src/model/kaya.js';
import { MARKER_BY_ID, publishedPath } from '../src/model/markers.js';
import { markerIdForPreset } from '../src/model/flags.js';
import { ANCHORS } from '../src/model/emulator.js';

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
function loadPage(): void {
  const body = HTML.slice(HTML.indexOf('<body>') + 6, HTML.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', '/');
}

const text = (id: string) => document.getElementById(id)?.textContent ?? '';

describe('the downloaded scenario sheet', () => {
  beforeEach(() => { loadPage(); });

  // A sheet that disagreed with the page it came from would be worse than no
  // sheet. This file used to recompute all three numbers and carried 1.24 and
  // "2015-2024" as literals while the page read them from the emulator data.
  it('carries exactly what the tiles carry, for every preset', () => {
    const app = mountApp();
    for (const preset of PRESETS) {
      app.apply(preset.inputs);
      const markerId = markerIdForPreset(preset.id);
      const marker = markerId === null ? undefined : MARKER_BY_ID[markerId];
      const published = marker === undefined ? null : publishedPath(marker);
      const rows = summaryOf(preset.inputs, computePath(preset.inputs), published);
      const value = (label: string) => rows.find((row) => row[0].startsWith(label))?.[1];
      const note = (label: string) => rows.find((row) => row[0].startsWith(label))?.[2];

      expect(value('Cumulative CO2'), preset.label).toBe(text('tile-cumulative'));
      expect(value('Warming in 2100'), preset.label).toBe(text('tile-warming'));
      expect(value('Added warming'), preset.label).toBe(text('tile-added'));
      expect(value('Your 2100 world'), preset.label).toBe(text('tile-analogue'));
      expect(note('Your 2100 world'), preset.label).toBe(text('tile-analogue-note'));
      expect(note('Added warming'), preset.label).toBe(text('tile-added-note'));
    }
  });

  it('names the anchor period from the data rather than from a literal', () => {
    const rows = summaryOf(PRESETS[0]!.inputs, computePath(PRESETS[0]!.inputs), null);
    const added = rows.find((row) => row[0].startsWith('Added warming'));
    expect(added?.[2]).toContain(ANCHORS.recentPeriod);
    expect(added?.[2]).toContain(ANCHORS.recentMeanC.toFixed(2));
    const warmingRow = rows.find((row) => row[0].startsWith('Warming in 2100'));
    expect(warmingRow?.[0]).toContain(ANCHORS.baseline);
  });
});

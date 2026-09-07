/**
 * Writes the default preset's emissions path to a JSON file, for the social
 * card to draw.
 *
 * scripts/build_social_card.py runs this rather than reimplementing the Kaya
 * identity in Python: the card shows a line the site would draw, and a second
 * implementation of the model would drift from the first without anything
 * noticing. Vite resolves the TypeScript and the JSON imports exactly as the
 * browser does.
 *
 * Run: node scripts/emit_card_path.mjs <out.json>
 */
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: emit_card_path.mjs <out.json>');

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { computePath } = await server.ssrLoadModule('/src/model/kaya.ts');
  const { PRESETS } = await server.ssrLoadModule('/src/model/bounds.ts');
  const { DEFAULT_PRESET } = await server.ssrLoadModule('/src/model/config.ts');

  const preset = PRESETS.find((p) => p.label === DEFAULT_PRESET) ?? PRESETS[0];
  const path = computePath(preset.inputs);
  writeFileSync(out, JSON.stringify({
    label: preset.label,
    cumulativeGt: path.cumulativeGt,
    expectedGt: preset.expected?.cumulative_gt ?? null,
    points: path.points.map((p) => [p.year, Number(p.co2Gt.toFixed(4))]),
  }, null, 1));
  process.stdout.write(`${preset.label}: ${path.cumulativeGt.toFixed(1)} GtCO2\n`);
} finally {
  await server.close();
}

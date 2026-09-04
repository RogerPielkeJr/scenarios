import { describe, expect, it } from 'vitest';
import { placeTicks, spreadLabels, type Tick } from '../src/ui/ticks.js';

const OPTIONS = { trackWidthPx: 380 };

function tick(position: number, label: string, priority = false): Tick {
  return { position, label, color: '#000', priority };
}

describe('placeTicks', () => {
  it('keeps every tick, labelled or not', () => {
    const crowded = Array.from({ length: 12 }, (_, i) => tick(50 + i * 0.2, `M${i}`));
    const placed = placeTicks(crowded, OPTIONS);
    expect(placed).toHaveLength(12);
    expect(placed.some((p) => p.row === null)).toBe(true);
  });

  it('returns ticks in position order', () => {
    const placed = placeTicks([tick(80, 'H'), tick(10, 'L'), tick(45, 'M')], OPTIONS);
    expect(placed.map((p) => p.label)).toEqual(['L', 'M', 'H']);
  });

  it('puts well-separated labels all in the first row', () => {
    const placed = placeTicks([tick(5, 'A'), tick(50, 'B'), tick(95, 'C')], OPTIONS);
    expect(placed.map((p) => p.row)).toEqual([0, 0, 0]);
  });

  it('drops to a second row when labels collide', () => {
    const placed = placeTicks([tick(50, 'AAAA'), tick(53, 'BBBB')], OPTIONS);
    expect(placed.map((p) => p.row)).toEqual([0, 1]);
  });

  it('hides a label when neither row has space, keeping the tick', () => {
    const placed = placeTicks(
      [tick(50, 'AAAA'), tick(51, 'BBBB'), tick(52, 'CCCC')], OPTIONS,
    );
    expect(placed.filter((p) => p.row === null)).toHaveLength(1);
    expect(placed).toHaveLength(3);
  });

  // The observed mark is the one a reader needs on every track.
  it('never drops a priority label, whatever crowds it', () => {
    const crowded = Array.from({ length: 10 }, (_, i) => tick(48 + i * 0.3, `M${i}`));
    const placed = placeTicks([...crowded, tick(50, 'observed', true)], OPTIONS);
    const reference = placed.find((p) => p.label === 'observed');
    expect(reference?.row).not.toBeNull();
  });

  it('respects a wider track by fitting more labels', () => {
    const ticks = [tick(50, 'AAAA'), tick(53, 'BBBB')];
    const narrow = placeTicks(ticks, { trackWidthPx: 200 });
    const wide = placeTicks(ticks, { trackWidthPx: 1200 });
    expect(narrow.map((p) => p.row)).toEqual([0, 1]);
    expect(wide.map((p) => p.row)).toEqual([0, 0]);
  });
});

describe('spreadLabels', () => {
  it('leaves well-separated labels where they are', () => {
    const result = spreadLabels([{ value: 'a', at: 10 }, { value: 'b', at: 60 }], 13);
    expect(result.map((r) => r.at)).toEqual([10, 60]);
    expect(result.every((r) => !r.moved)).toBe(true);
  });

  it('pushes colliding labels apart in order and marks them moved', () => {
    const result = spreadLabels(
      [{ value: 'a', at: 10 }, { value: 'b', at: 12 }, { value: 'c', at: 14 }], 13,
    );
    expect(result.map((r) => r.at)).toEqual([10, 23, 36]);
    expect(result.map((r) => r.moved)).toEqual([false, true, true]);
    expect(result.map((r) => r.value)).toEqual(['a', 'b', 'c']);
  });

  it('keeps each label pointing at what it labels', () => {
    const result = spreadLabels([{ value: 'a', at: 10 }, { value: 'b', at: 11 }], 13);
    expect(result.map((r) => r.anchor)).toEqual([10, 11]);
  });
});

/**
 * Label de-collision, used twice: for the calibration marks under each
 * slider and for the scenario labels at the right edge of the chart.
 */

export interface Tick {
  /** Position along the track, 0 to 100. */
  position: number;
  label: string;
  color: string;
  /** Anything the caller wants back on the placed tick. */
  id?: string;
  /**
   * Placed before the rest and so never dropped for want of room. The
   * observed value is the one mark a reader needs on every track, so it
   * keeps its label even when the scenario marks crowd around it.
   */
  priority?: boolean;
}

export interface PlacedTick extends Tick {
  /** Which row the label sits in, or null when the label is hidden. */
  row: number | null;
}

export interface PlaceOptions {
  /** How many label rows are available. Two, in this design. */
  rows?: number;
  /** Track width in pixels, used to turn label widths into percentages. */
  trackWidthPx: number;
  /** Approximate width of one character at the label font size. */
  charWidthPx?: number;
  /** Padding either side of a label, in pixels. */
  paddingPx?: number;
}

/**
 * Places labels along a horizontal track.
 *
 * Sorts by position, puts each label in the first row where it clears the
 * previous label in that row, and hides the label when no row has space.
 * A hidden label keeps its tick, because the tick is the data and the label
 * is only the name for it.
 */
export function placeTicks(ticks: readonly Tick[], options: PlaceOptions): PlacedTick[] {
  const rowCount = options.rows ?? 2;
  const charWidth = options.charWidthPx ?? 6.3;
  const padding = options.paddingPx ?? 9;

  // Labels are centred on their tick, so each one occupies an interval
  // either side of it. Rows hold intervals rather than a single running
  // edge, because priority labels are placed out of left-to-right order.
  const occupied: Array<Array<[number, number]>> = Array.from({ length: rowCount }, () => []);
  const placed = new Map<Tick, number | null>();

  const byPosition = [...ticks].sort((a, b) => a.position - b.position);
  const order = [
    ...byPosition.filter((tick) => tick.priority === true),
    ...byPosition.filter((tick) => tick.priority !== true),
  ];

  for (const tick of order) {
    const halfWidth = ((tick.label.length * charWidth + padding) / options.trackWidthPx) * 50;
    const span: [number, number] = [tick.position - halfWidth, tick.position + halfWidth];
    let row: number | null = null;
    for (let candidate = 0; candidate < rowCount; candidate += 1) {
      const taken = occupied[candidate] ?? [];
      if (taken.every(([start, end]) => span[1] <= start || span[0] >= end)) {
        taken.push(span);
        occupied[candidate] = taken;
        row = candidate;
        break;
      }
    }
    placed.set(tick, row);
  }

  return byPosition.map((tick) => ({ ...tick, row: placed.get(tick) ?? null }));
}

export interface SpreadItem<T> {
  value: T;
  /** Where the label wants to be. */
  at: number;
}

export interface SpreadResult<T> {
  value: T;
  /** Where the thing being labelled actually is. */
  anchor: number;
  /** Where the label ended up. */
  at: number;
  /** True when the label had to move, so it needs a leader line. */
  moved: boolean;
}

/**
 * Pushes labels apart along a vertical axis, keeping their order, so that
 * none is closer than `minGap` to the one above it. Labels that move get a
 * leader line back to what they label.
 */
export function spreadLabels<T>(
  items: readonly SpreadItem<T>[],
  minGap: number,
  moveThreshold = 1.5,
): SpreadResult<T>[] {
  const sorted = [...items].sort((a, b) => a.at - b.at);
  let previous = Number.NEGATIVE_INFINITY;
  return sorted.map((item) => {
    const at = Math.max(item.at, previous + minGap);
    previous = at;
    return {
      value: item.value,
      anchor: item.at,
      at,
      moved: Math.abs(at - item.at) > moveThreshold,
    };
  });
}

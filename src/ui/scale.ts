/**
 * The calibrated track that sits under a slider, used by the six sliders on
 * the top page and by every Learn More builder, so a mark means the same
 * thing wherever a reader meets one.
 */
import { placeTicks, type Tick } from './ticks.js';

/** Width the labels are laid out against, in CSS pixels. */
const TRACK_WIDTH_PX = 380;
/** One character at the 12px label size, measured off the rendered scale. */
const LABEL_CHAR_PX = 6.9;
/** Inside these margins a label anchors to the end rather than centring. */
const END_ZONE = 6;

export function buildScale(root: Document, ticks: readonly Tick[]): HTMLDivElement {
  const scale = root.createElement('div');
  scale.className = 'scale';
  const axis = root.createElement('div');
  axis.className = 'axis';
  scale.appendChild(axis);

  for (const tick of placeTicks(ticks, {
    trackWidthPx: TRACK_WIDTH_PX, charWidthPx: LABEL_CHAR_PX,
  })) {
    // A mark at either extreme would otherwise hang over the edge of the
    // track and scroll the whole page sideways on a narrow screen.
    const edge = tick.position <= END_ZONE ? ' at-start'
      : (tick.position >= 100 - END_ZONE ? ' at-end' : '');

    const mark = root.createElement('div');
    mark.className = (tick.row === null ? 'mark mark-hidden' : `mark mark-row${tick.row}`) + edge;
    mark.style.left = `${tick.position}%`;
    mark.style.background = tick.color;
    scale.appendChild(mark);
    if (tick.row === null) continue;

    const label = root.createElement('div');
    label.className = `label label-row${tick.row}${edge}`;
    label.textContent = tick.label;
    label.style.left = `${tick.position}%`;
    label.style.color = tick.color;
    scale.appendChild(label);
  }
  return scale;
}

import type {Pt} from './geometry';
import type {LabelDir, Stop} from './types';

// Average glyph advance of a 600-weight sans as a fraction of the font size; used to size the pill before it is
// drawn, so the camera can keep it in frame.
const GLYPH_EM = 0.56;
/** Share of the label font size the count number is enlarged by. */
export const COUNT_SCALE = 1.28;

/** The label appears this many frames after the ring, so the order reads: line lands, element lights, label explains. */
export const LABEL_DELAY = 5;

export type LabelPlacement = {at: Pt; dir: LabelDir};

/** Gap between an element's ring and a label placed beside it, in capture pixels. */
const RING_GAP = 16;

/**
 * Where a stop's label is declared to sit: the portrait override on vertical renders, the stop's own
 * placement otherwise, and without either, to the right of its ring.
 */
export function labelPlacement(stop: Stop, portrait: boolean): LabelPlacement {
  if (portrait && stop.portraitLabel) return stop.portraitLabel;
  if (stop.labelAt && stop.labelDir) return {at: stop.labelAt, dir: stop.labelDir};
  const ring = stop.ring;
  return ring ? {at: {x: ring.x + ring.w + RING_GAP, y: ring.y + ring.h / 2}, dir: 'right'} : {at: stop.look ?? {x: 0, y: 0}, dir: 'right'};
}

export function countText(stop: Stop, value: number): string {
  const count = stop.count;
  if (!count) return '';
  const decimals = count.decimals ?? 0;
  // Fixed locale so every render worker prints the same string.
  return `${count.prefix ?? ''}${value.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}${count.suffix ?? ''}`;
}

/** Size of the label pill in frame pixels. */
export function labelSize(stop: Stop, portrait: boolean): {fontSize: number; width: number; height: number} {
  const fontSize = portrait ? 33 : 30;
  const finalCount = stop.count ? countText(stop, stop.count.to) : '';
  const width = (stop.label.length + (stop.count ? finalCount.length * 1.35 + 1 : 0)) * fontSize * GLYPH_EM + fontSize * 1.7;
  return {fontSize, width, height: fontSize * 1.95};
}

/** Horizontal and vertical extent of the pill around its anchor, in frame pixels, for a placement direction. */
export function labelExtent(dir: LabelDir, width: number, height: number): {x0: number; x1: number; y0: number; y1: number} {
  return {
    x0: dir === 'right' ? 0 : dir === 'left' ? -width : -width / 2,
    x1: dir === 'right' ? width : dir === 'left' ? 0 : width / 2,
    y0: dir === 'down' ? 0 : dir === 'up' ? -height : -height / 2,
    y1: dir === 'down' ? height : dir === 'up' ? 0 : height / 2,
  };
}

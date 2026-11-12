/** Layout of the closing line under the pulled-back map. The camera and the caption both read it, so they cannot disagree. */

// Average glyph advance of a 700-weight display face with tight tracking, as a fraction of the font size.
export const GLYPH_EM = 0.54;
export const CLOSING_LINE_HEIGHT = 1.06;
/**
 * Clear space between the lowest screen edge and the top of the closing type, in frame pixels. The brief asks for
 * at least 40 px; 64 leaves room for the type's own internal leading and the slow settle after the camera arrives.
 */
export const CLOSING_GAP = 64;
/** Landscape: distance from the bottom of the frame to the last line of type. */
const LANDSCAPE_BOTTOM = 84;
/** Portrait: where the type starts, as a fraction of the frame height, plus a fixed drop. */
const PORTRAIT_TOP = {fraction: 0.46, drop: 240};

export type ClosingLayout = {size: number; blockHeight: number; top: number; bandTop: number};

export function closingLayout(width: number, height: number, portrait: boolean, sideSafe: number, lines: readonly string[]): ClosingLayout {
  const wanted = 88;
  const widest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.min(wanted, (width - sideSafe * 2) / (widest * GLYPH_EM));
  const blockHeight = lines.length * size * CLOSING_LINE_HEIGHT;
  const top = portrait ? height * PORTRAIT_TOP.fraction + PORTRAIT_TOP.drop : height - LANDSCAPE_BOTTOM - blockHeight;
  // The solid band behind the type starts halfway into the gap, so a clear strip of background remains above it.
  return {size, blockHeight, top, bandTop: top - CLOSING_GAP / 2};
}

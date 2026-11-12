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
/** Portrait: air kept between the top safe band and the map, in frame pixels. */
const PORTRAIT_TOP_AIR = 24;
/** Portrait: clear space kept at each side of the map. The platform's side margin is for text, not for a picture. */
const PORTRAIT_MAP_PAD = 24;
/** Portrait: the closing type is capped here; the width of the frame usually decides first. */
const PORTRAIT_WANTED = 124;

export type ClosingLayout = {size: number; blockHeight: number; top: number; bandTop: number; lines: readonly string[]; map?: {scale: number; top: number; height: number}};

type ClosingFrame = {width: number; height: number; portrait: boolean; safe: {top: number; bottom: number; side: number}};

/**
 * Where the closing type sits and, in portrait, how large the map may be. `map` is the size of the whole map in
 * world pixels and `settleMax` the growth of the slow settle after landing. Landscape keeps the type at the
 * bottom edge and the map fills what is left above it. Portrait stacks map, CLOSING_GAP and type as one block,
 * as large as the width allows inside the platform's safe margins, and centres that block between them.
 */
export function closingLayout(frame: ClosingFrame, lines: readonly string[], portraitLines: readonly string[] | undefined, map: {w: number; h: number}, settleMax: number): ClosingLayout {
  const {width, height, portrait, safe} = frame;
  const used = portrait && portraitLines ? portraitLines : lines;
  const widest = Math.max(...used.map((l) => l.length), 1);
  const wanted = portrait ? PORTRAIT_WANTED : 88;
  const size = Math.min(wanted, (width - safe.side * 2) / (widest * GLYPH_EM));
  const blockHeight = used.length * size * CLOSING_LINE_HEIGHT;
  if (!portrait) {
    const top = height - LANDSCAPE_BOTTOM - blockHeight;
    // The solid band behind the type starts halfway into the gap, so a clear strip of background remains above it.
    return {size, blockHeight, top, bandTop: top - CLOSING_GAP / 2, lines: used};
  }
  const regionTop = safe.top + PORTRAIT_TOP_AIR;
  const available = height - safe.bottom - regionTop;
  const scale = Math.min((width - PORTRAIT_MAP_PAD * 2) / map.w, (available - CLOSING_GAP - blockHeight) / map.h) / settleMax;
  const mapHeight = map.h * scale * settleMax;
  const mapTop = regionTop + (available - (mapHeight + CLOSING_GAP + blockHeight)) / 2;
  const top = mapTop + mapHeight + CLOSING_GAP;
  return {size, blockHeight, top, bandTop: top - CLOSING_GAP / 2, lines: used, map: {scale, top: mapTop, height: mapHeight}};
}

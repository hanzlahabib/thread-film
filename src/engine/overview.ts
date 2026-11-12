import {CLOSING_GAP, closingLayout, type ClosingLayout} from './closing';
import type {Journey} from './types';

/** Size and margins of a composition, as far as the closing overview needs them. */
export type OverviewFrame = {width: number; height: number; portrait: boolean; safe: {top: number; bottom: number; side: number}};

/** Frames after the pull-back lands over which the camera keeps creeping in, and its rate per frame. */
export const SETTLE_RATE = 0.0006;
/** Air kept between the top band that holds the HUD and the highest screen edge in the overview, in frame pixels. */
export const OVERVIEW_TOP_AIR = 24;

/** Growth of the slow settle after the pull-back lands, as a factor on the camera scale. */
export function settleGrowth(outroFrames: number): number {
  return 1 + SETTLE_RATE * outroFrames;
}

/** Layout of the closing line for a map of `size` world pixels; the overview camera and the caption both read it. */
export function closingForSize(frame: OverviewFrame, outro: Journey['outro'], size: {w: number; h: number}): ClosingLayout {
  return closingLayout(frame, outro.lines, outro.portraitLines, size, settleGrowth(outro.frames));
}

/**
 * Scale at which a map of `size` world pixels is shown in the overview: as large as the width allows, inside
 * the band between the HUD strip and the closing line (landscape), or as the stacked block of map, gap and type
 * (portrait). The arrangement chooser compares arrangements by this number, and the camera uses it.
 */
export function overviewScale(frame: OverviewFrame, outro: Journey['outro'], size: {w: number; h: number}): number {
  const closing = closingForSize(frame, outro, size);
  if (closing.map) return closing.map.scale;
  const regionTop = frame.safe.top + OVERVIEW_TOP_AIR;
  const regionBottom = closing.top - CLOSING_GAP;
  return Math.min(((frame.width - frame.safe.side * 2) * 0.94) / size.w, (regionBottom - regionTop) / size.h) / settleGrowth(outro.frames);
}

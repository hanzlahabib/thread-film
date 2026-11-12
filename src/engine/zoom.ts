import type {Pt} from './geometry';
import type {Camera, Frame, TimedStop} from './model';
import type {ZoomHint} from './types';

/** A stop's zoom once resolved: a hint, or the number the journey asked for. */
export type Level = ZoomHint | number;

/** Slow push-in while resting, so a hold never looks frozen. */
export const REST_PUSH = 0.035;
/** Where the focus sits in the frame, as a fraction of its height. Vertical renders sit a little above centre. */
export const FOCUS_Y = {landscape: 0.5, portrait: 0.47};
/** Room kept between an element's ring and the frame edge when fitting, in frame pixels. */
export const FIT_PAD = 24;

/** The element is framed with this fraction of the screen's width around it. */
const CONTEXT_FRACTION = 0.2;
/** An element this close to the top or bottom (as a fraction of the screen's height) takes that bar or nav into the frame. */
const NEAR_EDGE = 0.22;
/** A phone or tablet keeps this fraction of the frame's width free at each side: the device is never cropped at its edges. */
const EDGE_MARGIN = 0.12;
/** The frame always shows at least this fraction of the screen's height, so a close-up still reads as part of a device. */
const MIN_VISIBLE = 0.4;
/** Ring area as a fraction of the screen's area: below SMALL the element is small, below MID it is medium-sized. */
const SMALL_ELEMENT = 0.025;
const MID_ELEMENT = 0.12;

export type ZoomRange = {wide: number; medium: number; tight: number};

type Box = {x0: number; y0: number; x1: number; y1: number};

/** Bounding box of everything the camera must keep: landing point, stub, ring and look point (capture pixels). */
function focusBox(stop: TimedStop): Box {
  const pts: Pt[] = [stop.local, stop.look];
  if (stop.stub) pts.push(stop.stub);
  if (stop.ring) pts.push({x: stop.ring.x, y: stop.ring.y}, {x: stop.ring.x + stop.ring.w, y: stop.ring.y + stop.ring.h});
  return {x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y))};
}

/** The focus box with its context: 20% of the screen's width all round, plus the bar or nav it is near. */
function contextBox(stop: TimedStop): Box {
  const {width, height} = stop.shot;
  const m = width * CONTEXT_FRACTION;
  const f = focusBox(stop);
  const box = {x0: f.x0 - m, y0: f.y0 - m, x1: f.x1 + m, y1: f.y1 + m};
  if (f.y0 < height * NEAR_EDGE) box.y0 = 0;
  if (f.y1 > height * (1 - NEAR_EDGE)) box.y1 = height;
  return {x0: Math.max(0, box.x0), y0: Math.max(0, box.y0), x1: Math.min(width, box.x1), y1: Math.min(height, box.y1)};
}

/** How large the element is on its screen. */
export function elementSize(stop: TimedStop): 'small' | 'mid' | 'large' {
  if (!stop.ring) return 'mid';
  const share = (stop.ring.w * stop.ring.h) / (stop.shot.width * stop.shot.height);
  return share < SMALL_ELEMENT ? 'small' : share < MID_ELEMENT ? 'mid' : 'large';
}

/** The region of the frame the content may use, in frame pixels. */
function region(frame: Frame) {
  const left = frame.safe.side + FIT_PAD;
  const right = frame.width - frame.safe.side - FIT_PAD;
  const top = frame.safe.top + FIT_PAD;
  const bottom = frame.height - frame.safe.bottom - FIT_PAD;
  return {left, right, top, bottom, w: right - left, h: bottom - top, cy: (top + bottom) / 2};
}

/**
 * The three zoom levels of a stop in this frame, in frame pixels per capture pixel. 'wide' fits the whole
 * screen with its chrome inside the safe area. 'tight' is the largest scale at which the element and its
 * context (see contextBox) still fit the safe area, and never so large that a phone or tablet is cropped at
 * its edges (EDGE_MARGIN) or the frame shows less than MIN_VISIBLE of the screen's height. 'medium' is the
 * geometric mean. The slow push-in at rest is budgeted for, so the limits hold until the stop is left.
 */
export function zoomRange(stop: TimedStop, frame: Frame): ZoomRange {
  const {width, height, inset, device} = stop.shot;
  const outerW = width + inset.side * 2;
  const outerH = height + inset.top + inset.bottom;
  const r = region(frame);
  const wide = Math.min(r.w / outerW, r.h / outerH);
  const box = contextBox(stop);
  let tight = Math.min(r.w / (box.x1 - box.x0), r.h / (box.y1 - box.y0), r.h / (height * MIN_VISIBLE));
  if (device) tight = Math.min(tight, (frame.width * (1 - 2 * EDGE_MARGIN)) / outerW);
  tight = Math.max(wide, tight / (1 + REST_PUSH));
  return {wide, medium: Math.sqrt(wide * tight), tight};
}

/**
 * Camera that rests on a stop at `level`. The whole screen is centred while it fits across the frame;
 * otherwise the context box is centred, kept inside the screen so the frame never shows the empty world
 * beside it. A number is the zoom the journey asked for, held between half of 'wide' and 'tight'.
 */
export function policyCamera(stop: TimedStop, frame: Frame, level: Level): Camera {
  const range = zoomRange(stop, frame);
  const scale = typeof level === 'number' ? Math.min(Math.max(level, range.wide * 0.5), range.tight) : range[level];
  const {width, height, inset} = stop.shot;
  const x0 = stop.origin.x - inset.side;
  const y0 = stop.origin.y - inset.top;
  const x1 = stop.origin.x + width + inset.side;
  const y1 = stop.origin.y + height + inset.bottom;
  const r = region(frame);
  const box = contextBox(stop);
  const boxCx = stop.origin.x + (box.x0 + box.x1) / 2;
  const boxCy = stop.origin.y + (box.y0 + box.y1) / 2;
  const visW = (frame.width - frame.safe.side * 2) / scale;
  const visH = r.h / scale;
  const cx = x1 - x0 <= visW ? (x0 + x1) / 2 : Math.min(Math.max(boxCx, x0 + visW / 2), x1 - visW / 2);
  const wantY = y1 - y0 <= visH ? (y0 + y1) / 2 : Math.min(Math.max(boxCy, y0 + visH / 2), y1 - visH / 2);
  // The camera centre sits at FOCUS_Y of the frame, the content region's middle may not: shift to match.
  const fy = frame.portrait ? FOCUS_Y.portrait : FOCUS_Y.landscape;
  return {cx, cy: wantY - (r.cy - frame.height * fy) / scale, scale};
}

/**
 * Zoom of every stop in this frame. Stops with a hint or a number keep it. The rest are chosen from the size
 * of the element: the first stop on a screen is 'wide' (the establishing shot), a small element is 'tight', a
 * larger one 'medium' (in 9:16 on a phone: 'wide', the whole device height), and no three consecutive stops
 * share a level.
 */
export function zoomPlan(stops: readonly TimedStop[], frame: Frame): Level[] {
  const levels: Level[] = [];
  stops.forEach((stop, i) => {
    if (typeof stop.zoom === 'number' || stop.zoom) {
      levels.push(stop.zoom as Level);
      return;
    }
    const size = elementSize(stop);
    const first = i === 0 || stops[i - 1].screen !== stop.screen;
    let level: ZoomHint = first ? 'wide' : size === 'small' ? 'tight' : frame.portrait && stop.shot.device ? 'wide' : size === 'mid' ? 'medium' : 'wide';
    // Two whole-device shots in a row make the film monotonous: a medium-sized element alternates.
    if (levels[i - 1] === 'wide' && level === 'wide' && size === 'mid') level = 'medium';
    if (levels[i - 1] === level && levels[i - 2] === level) level = level === 'medium' ? (size === 'large' ? 'wide' : 'tight') : 'medium';
    levels.push(level);
  });
  return levels;
}

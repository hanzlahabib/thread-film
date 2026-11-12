import {Easing} from 'remotion';
import {Trail, lerp, type Pt} from './geometry';
import {labelExtent, labelPlacement, labelSize} from './labels';
import {chromeInsets} from './chrome';
import {CLOSING_GAP, closingLayout} from './closing';
import type {Theme} from './theme';
import {buildTrail} from './trail';
import {CAPTURE_W, type Journey, type Stop} from './types';

export const FPS = 30;

// One easing for every hop of the line: it leaves fast and lands softly.
const ramp = Easing.bezier(0.55, 0, 0.1, 1);
// Runs that pass several elements keep an even pace so each one can register.
const glide = Easing.inOut(Easing.quad);

const DEFAULT_TRAVEL = 20;
const DEFAULT_FLIGHT = 38;
const DEFAULT_HOLD = 44;
/** Narration for a screen starts this many frames into the flight that opens it. */
const NARRATION_LEAD = 10;
/** Frames kept free after a screen's narration before the next flight starts. */
const NARRATION_TAIL = 12;
/** Frames the closing pull-back takes to reach the overview. */
const OVERVIEW_TRAVEL = 46;

export type TimedStop = Stop & {
  index: number;
  /** Trail distance of the landing point. */
  s: number;
  /** World position of the landing point. */
  world: Pt;
  /** The landing point in capture pixels. */
  local: Pt;
  origin: Pt;
  /** Frames at which the head leaves the previous stop, lands here, and leaves again. */
  depart: number;
  arrive: number;
  leave: number;
  /** True when the hop here crosses from one screen to the next. */
  flight: boolean;
  easing: 'ramp' | 'glide';
};

export type NarrationCue = {file: string; frame: number; frames: number};
export type TickCue = {frame: number; world: Pt};

export type Bounds = {minX: number; minY: number; maxX: number; maxY: number};

/** Everything the components need, computed once per film from the journey. */
export type Model = {
  journey: Journey;
  trail: Trail;
  /** SVG path data of the whole line. */
  path: string;
  stops: TimedStop[];
  ticks: TickCue[];
  narration: NarrationCue[];
  introEnd: number;
  overviewStart: number;
  overviewArrive: number;
  durationInFrames: number;
  bounds: Bounds;
};

/**
 * Lays the journey out in space and time. Travel times are the motion design and stay fixed; rests are
 * stretched per screen until the screen is long enough for its narration clip, when it has one.
 */
export function buildModel(journey: Journey, theme: Theme, narrationSeconds: Record<string, number> = {}): Model {
  const trail = buildTrail(journey);
  const framesOf = (file: string | undefined): number => (file && narrationSeconds[file] ? Math.ceil(narrationSeconds[file] * FPS) : 0);
  const narration: NarrationCue[] = [];

  const introVoice = framesOf(journey.intro.narration);
  const introEnd = Math.max(journey.intro.frames, introVoice === 0 ? 0 : 14 + introVoice + 6);
  if (introVoice > 0 && journey.intro.narration) narration.push({file: journey.intro.narration, frame: 14, frames: introVoice});

  const stops: TimedStop[] = [];
  let cursor = introEnd;
  for (const screen of journey.screens) {
    const group = journey.stops.filter((s) => s.screen === screen.id);
    if (group.length === 0) continue;
    const travelOf = (stop: Stop, first: boolean) => stop.travel ?? (first && stops.length > 0 ? DEFAULT_FLIGHT : DEFAULT_TRAVEL);
    const base = group.reduce((n, stop, i) => n + travelOf(stop, i === 0) + (stop.hold ?? DEFAULT_HOLD), 0);
    const voice = framesOf(screen.narration);
    const need = voice === 0 ? 0 : NARRATION_LEAD + voice + NARRATION_TAIL;
    const extraPerHold = Math.max(0, need - base) / group.length;
    if (voice > 0 && screen.narration) narration.push({file: screen.narration, frame: cursor + NARRATION_LEAD, frames: voice});
    group.forEach((stop, i) => {
      const s = trail.marks[stop.id];
      if (s === undefined) throw new Error(`Stop "${stop.id}" has no matching mark on the route of screen "${screen.id}".`);
      const world = trail.at(s);
      const depart = cursor;
      const arrive = depart + travelOf(stop, i === 0);
      const leave = arrive + Math.round((stop.hold ?? DEFAULT_HOLD) + extraPerHold);
      stops.push({...stop, index: stops.length, s, world, local: {x: world.x - screen.origin.x, y: world.y - screen.origin.y}, origin: screen.origin, depart, arrive, leave, flight: i === 0 && stops.length > 0, easing: stop.pace ?? 'ramp'});
      cursor = leave;
    });
  }
  if (stops.length === 0) throw new Error('The journey has no stops.');

  const overviewStart = cursor;
  const overviewArrive = overviewStart + OVERVIEW_TRAVEL;
  const bounds = journey.screens.reduce<Bounds>(
    (b, s) => {
      const inset = chromeInsets(s, theme);
      return {
        minX: Math.min(b.minX, s.origin.x - inset.side),
        minY: Math.min(b.minY, s.origin.y - inset.top),
        maxX: Math.max(b.maxX, s.origin.x + CAPTURE_W + inset.side),
        maxY: Math.max(b.maxY, s.origin.y + s.height + inset.bottom),
      };
    },
    {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity},
  );
  const model: Model = {
    journey,
    trail,
    path: trail.toPath(),
    stops,
    ticks: [],
    narration,
    introEnd,
    overviewStart,
    overviewArrive,
    durationInFrames: overviewArrive + journey.outro.frames,
    bounds,
  };
  model.ticks = stops.flatMap((stop) =>
    (stop.ticks ?? []).map((tick) => {
      const s = trail.marks[tick.mark];
      if (s === undefined) throw new Error(`Tick mark "${tick.mark}" is not on the route of screen "${stop.screen}".`);
      return {frame: frameAtDistance(model, s), world: {x: stop.origin.x + tick.at.x, y: stop.origin.y + tick.at.y}};
    }),
  );
  // Fail early on a mis-ordered journey instead of rendering a line that runs backwards.
  stops.forEach((stop, i) => {
    if (i > 0 && stop.s < stops[i - 1].s) throw new Error(`Stop "${stop.id}" comes before "${stops[i - 1].id}" on the route but after it in the stops list.`);
  });
  return model;
}

/** The stop the head is resting on or travelling towards at `frame`, and the eased 0..1 progress of that hop. */
export function hopAt(model: Model, frame: number): {to: TimedStop; from: TimedStop | null; e: number; resting: boolean} {
  const {stops} = model;
  const to = stops.find((s) => frame < s.leave) ?? stops[stops.length - 1];
  const from = to.index > 0 ? stops[to.index - 1] : null;
  if (frame >= to.arrive) return {to, from, e: 1, resting: true};
  const raw = Math.min(1, Math.max(0, (frame - to.depart) / Math.max(1, to.arrive - to.depart)));
  return {to, from, e: (to.easing === 'glide' ? glide : ramp)(raw), resting: false};
}

/** Trail distance drawn at `frame`. */
export function drawnAt(model: Model, frame: number): number {
  const {to, from, e} = hopAt(model, frame);
  return lerp(from ? from.s : 0, to.s, e);
}

function frameAtDistance(model: Model, s: number): number {
  for (let f = 0; f < model.overviewStart; f++) if (drawnAt(model, f) >= s) return f;
  return model.overviewStart;
}

export type Camera = {cx: number; cy: number; scale: number};

/** Size and orientation of the composition, and the margins kept free of text and labels. */
export type Frame = {width: number; height: number; portrait: boolean; safe: {top: number; bottom: number; side: number}};

// Vertical video loses its top and bottom to platform UI: keep about 8% at the sides, 12% free at the top and 18%
// at the bottom. Landscape needs far less.
const PORTRAIT_SAFE = {side: 0.08, top: 0.12, bottom: 0.18};
const LANDSCAPE_SAFE = {side: 0.04, top: 0.07, bottom: 0.05};

export function makeFrame(width: number, height: number): Frame {
  const portrait = height > width;
  const m = portrait ? PORTRAIT_SAFE : LANDSCAPE_SAFE;
  return {width, height, portrait, safe: {side: Math.round(width * m.side), top: Math.round(height * m.top), bottom: Math.round(height * m.bottom)}};
}

// How far the camera pulls back at the middle of a hop, as a fraction of its zoom.
const FLIGHT_DIP = 0.52;
const LONG_HOP_DIP = 0.16;
const LONG_HOP = 900;
/** How strongly the camera chases the head when the path bends away from the straight line between stops. */
const CHASE = 0.85;
/** Slow push-in while resting, so a hold never looks frozen. */
const REST_PUSH = 0.035;
/** Vertical renders are narrower, so they frame a little tighter on each element when there is room. */
const PORTRAIT_ZOOM = 1.08;
/** Where the focus sits in the frame, as a fraction of its height. Vertical renders sit a little above centre. */
const FOCUS_Y = {landscape: 0.5, portrait: 0.47};
/** Room kept between an element's ring and the frame edge when fitting, in frame pixels. */
const FIT_PAD = 24;
const MIN_FIT_SCALE = 0.05;
const FIT_ITERATIONS = 22;

/**
 * Zoom for a stop: the one asked for, reduced just enough that the landing point, its ring and its label all
 * sit inside the safe area around the look point. This is what frames the working region of a screen in 9:16.
 */
function fitScale(stop: TimedStop, frame: Frame, wanted: number): number {
  const fy = frame.portrait ? FOCUS_Y.portrait : FOCUS_Y.landscape;
  const room = {
    left: frame.width / 2 - frame.safe.side - FIT_PAD,
    right: frame.width / 2 - frame.safe.side - FIT_PAD,
    up: frame.height * fy - frame.safe.top - FIT_PAD,
    down: frame.height * (1 - fy) - frame.safe.bottom - FIT_PAD,
  };
  const look = stop.look;
  const points: Pt[] = [stop.local];
  if (stop.stub) points.push(stop.stub);
  if (stop.ring) points.push({x: stop.ring.x, y: stop.ring.y}, {x: stop.ring.x + stop.ring.w, y: stop.ring.y + stop.ring.h});
  const place = labelPlacement(stop, frame.portrait);
  const size = labelSize(stop, frame.portrait);
  const ext = labelExtent(place.dir, size.width, size.height);
  const fits = (s: number): boolean => {
    const ok = (p: Pt, x0 = 0, x1 = 0, y0 = 0, y1 = 0) => {
      const dx = (p.x - look.x) * s;
      const dy = (p.y - look.y) * s;
      return dx + x0 >= -room.left && dx + x1 <= room.right && dy + y0 >= -room.up && dy + y1 <= room.down;
    };
    return points.every((p) => ok(p)) && ok(place.at, ext.x0, ext.x1, ext.y0, ext.y1);
  };
  if (fits(wanted)) return wanted;
  let lo = MIN_FIT_SCALE;
  let hi = wanted;
  for (let i = 0; i < FIT_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function stopCamera(stop: TimedStop, frame: Frame): Camera {
  const wanted = stop.zoom * (frame.portrait ? PORTRAIT_ZOOM : 1);
  return {cx: stop.origin.x + stop.look.x, cy: stop.origin.y + stop.look.y, scale: fitScale(stop, frame, wanted)};
}

function introCamera(model: Model, frame: Frame): Camera {
  const first = model.journey.screens[0];
  // The whole first screen with air around it.
  const scale = Math.min((frame.width - frame.safe.side * 2) / CAPTURE_W * 0.92, ((frame.height - frame.safe.top - frame.safe.bottom) * 0.9) / first.height);
  return {cx: first.origin.x + CAPTURE_W / 2, cy: first.origin.y + first.height / 2, scale};
}

/** Frames after the pull-back lands over which the camera keeps creeping in, and its rate per frame. */
const SETTLE_RATE = 0.0006;
/** Air kept between the top band that holds the HUD and the highest screen edge in the overview, in frame pixels. */
const OVERVIEW_TOP_AIR = 24;

/**
 * The whole map, fitted into the band between the HUD strip at the top and the closing line at the bottom, with
 * CLOSING_GAP of clear space left between the lowest screen edge and the type. The slow settle after landing is
 * budgeted for, so the gap is never eaten once the camera has stopped.
 */
function overviewCamera(model: Model, frame: Frame): Camera {
  const {bounds} = model;
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const closing = closingLayout(frame.width, frame.height, frame.portrait, frame.safe.side, model.journey.outro.lines);
  const settleMax = 1 + SETTLE_RATE * model.journey.outro.frames;
  const regionTop = frame.safe.top + OVERVIEW_TOP_AIR;
  const regionBottom = closing.top - CLOSING_GAP;
  const fitW = ((frame.width - frame.safe.side * (frame.portrait ? 1 : 2)) * (frame.portrait ? 1 : 0.94)) / w;
  const scale = Math.min(fitW, (regionBottom - regionTop) / h) / settleMax;
  // Centre the map vertically in the region (the settle grows it about the camera centre, which is its middle).
  const fy = frame.portrait ? FOCUS_Y.portrait : FOCUS_Y.landscape;
  const lift = ((regionTop + regionBottom) / 2 - frame.height * fy) / scale;
  return {cx: (bounds.minX + bounds.maxX) / 2, cy: (bounds.minY + bounds.maxY) / 2 - lift, scale};
}

/** Camera at `frame`: rests on each stop and, between stops, follows the head of the line. */
export function cameraAt(model: Model, frame: number, view: Frame): Camera {
  if (frame >= model.overviewStart) {
    const a = stopCamera(model.stops[model.stops.length - 1], view);
    const b = overviewCamera(model, view);
    const e = glide(Math.min(1, (frame - model.overviewStart) / (model.overviewArrive - model.overviewStart)));
    const settle = Math.max(0, frame - model.overviewArrive) * SETTLE_RATE;
    return {cx: lerp(a.cx, b.cx, e), cy: lerp(a.cy, b.cy, e), scale: Math.exp(lerp(Math.log(a.scale * (1 + REST_PUSH)), Math.log(b.scale), e)) * (1 + settle)};
  }
  const {to, from, e, resting} = hopAt(model, frame);
  const b = stopCamera(to, view);
  if (resting) {
    const rest = (frame - to.arrive) / Math.max(1, to.leave - to.arrive);
    return {...b, scale: b.scale * (1 + REST_PUSH * rest)};
  }
  const a = from ? stopCamera(from, view) : introCamera(model, view);
  const aScale = from ? a.scale * (1 + REST_PUSH) : a.scale;
  const anchorA = from ? from.world : model.trail.at(0);
  const head = model.trail.at(lerp(from ? from.s : 0, to.s, e));
  // Chasing only the head's deviation from the straight line keeps the move continuous at both ends.
  const chase = from ? CHASE : CHASE * e;
  const cx = lerp(a.cx, b.cx, e) + chase * (head.x - lerp(anchorA.x, to.world.x, e));
  const cy = lerp(a.cy, b.cy, e) + chase * (head.y - lerp(anchorA.y, to.world.y, e));
  const dip = to.flight ? FLIGHT_DIP : to.s - (from ? from.s : 0) > LONG_HOP ? LONG_HOP_DIP : 0;
  return {cx, cy, scale: Math.exp(lerp(Math.log(aScale), Math.log(b.scale), e)) * (1 - dip * Math.sin(Math.PI * e))};
}

/** World point to frame pixels. On vertical renders the focus sits a little above centre. */
export function project(camera: Camera, view: Frame, p: Pt): Pt {
  const fy = view.portrait ? FOCUS_Y.portrait : FOCUS_Y.landscape;
  return {x: (p.x - camera.cx) * camera.scale + view.width / 2, y: (p.y - camera.cy) * camera.scale + view.height * fy};
}

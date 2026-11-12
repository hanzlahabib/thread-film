import type {Rect} from './geometry';
import {labelPlacement, labelSize} from './labels';
import {project, stopCamera, type Camera, type Frame, type Model, type TimedStop} from './model';
import type {LabelDir} from './types';

/** Where a label is drawn, in frame pixels. */
export type LabelBox = {left: number; top: number; width: number; height: number; dir: LabelDir};

/** Ring outline pad drawn by Thread, in capture pixels; a label must stay clear of the outline too. */
const RING_PAD = 6;
/** Frame pixels between an element's ring and a label placed beside it, and between a device and a label in its gutter. */
const GAP = 14;
/** Frame pixels kept clear around text: a label that touches a word's box is as bad as one over it. */
const TEXT_PAD = 3;
/** A landing without a ring is treated as a box this size, in frame pixels. */
const POINT_BOX = 24;
/** Sideways steps along an element's edge that are tried for a label: in units of the label's width (above and below) or height (beside). */
const SLIDES = [0, -1, 1, -2, 2, -3, 3];
const SLIDE_X = 0.3;
const SLIDE_Y = 0.9;
/** How much each kind of overlap costs, per fraction of the label covered. Text is what the film must not hide; another stop's ring is worse. */
const COST = {text: 1, content: 0.12, ring: 3, otherScreen: 0.6, distance: 0.15, declaredBonus: 0.02};

type Choice = {mode: 'declared'} | {mode: 'ring'; dir: LabelDir; slide: number} | {mode: 'gutter'; side: 'left' | 'right'};

type Obstacle = {rect: Rect; cost: number};

const overlap = (a: Rect, b: Rect): number => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const pad = (r: Rect, p: number): Rect => ({x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2});

/** True when a stop's label is searched for instead of used as declared: phones, tablets and screens that list their text. */
export function isSearched(stop: TimedStop): boolean {
  return stop.shot.device || stop.shot.text !== undefined;
}

type Mapped = {camera: Camera; view: Frame};
const toFrame = ({camera, view}: Mapped, stop: TimedStop, r: Rect): Rect => {
  const a = project(camera, view, {x: stop.origin.x + r.x, y: stop.origin.y + r.y});
  return {x: a.x, y: a.y, w: r.w * camera.scale, h: r.h * camera.scale};
};

/** A stop's element in frame pixels: its ring with the outline pad, else a small box at the landing point. */
function elementRect(m: Mapped, stop: TimedStop, ringPad = RING_PAD): Rect {
  if (stop.ring) return toFrame(m, stop, pad(stop.ring, ringPad));
  const p = project(m.camera, m.view, stop.world);
  return {x: p.x - POINT_BOX / 2, y: p.y - POINT_BOX / 2, w: POINT_BOX, h: POINT_BOX};
}

/** The device or window around a stop's capture, in frame pixels. */
function screenRect(m: Mapped, stop: TimedStop): Rect {
  const {width, height, inset} = stop.shot;
  const a = project(m.camera, m.view, {x: stop.origin.x - inset.side, y: stop.origin.y - inset.top});
  return {x: a.x, y: a.y, w: (width + inset.side * 2) * m.camera.scale, h: (height + inset.top + inset.bottom) * m.camera.scale};
}

function obstaclesFor(model: Model, stop: TimedStop, m: Mapped): Obstacle[] {
  const out: Obstacle[] = [];
  const text = stop.shot.text;
  // Even where no text lies under it, a label over the screen hides some of the design: gutters beside the device are preferred when equal.
  if (text) out.push({rect: toFrame(m, stop, {x: 0, y: 0, w: stop.shot.width, h: stop.shot.height}), cost: COST.content});
  if (text) for (const r of text) out.push({rect: pad(toFrame(m, stop, r), TEXT_PAD), cost: COST.text});
  else out.push({rect: toFrame(m, stop, {x: 0, y: 0, w: stop.shot.width, h: stop.shot.height}), cost: COST.text});
  out.push({rect: elementRect(m, stop), cost: COST.ring});
  const seen = new Set<string>([stop.screen]);
  for (const other of model.stops) {
    if (other.screen === stop.screen) {
      if (other.id !== stop.id && other.ring) out.push({rect: elementRect(m, other), cost: COST.ring});
    } else if (!seen.has(other.screen)) {
      seen.add(other.screen);
      out.push({rect: screenRect(m, other), cost: COST.otherScreen});
    }
  }
  return out;
}

function clampBox(b: LabelBox, view: Frame): LabelBox {
  const left = Math.min(Math.max(b.left, view.safe.side), Math.max(view.safe.side, view.width - view.safe.side - b.width));
  const top = Math.min(Math.max(b.top, view.safe.top), Math.max(view.safe.top, view.height - view.safe.bottom - b.height));
  return {...b, left, top};
}

/** The box a choice gives, with the camera in `m`, clamped into the safe area (a label is moved, never cropped). */
function boxFor(choice: Choice, model: Model, stop: TimedStop, m: Mapped, size: {width: number; height: number}): LabelBox {
  const {width, height} = size;
  if (choice.mode === 'declared') {
    const place = labelPlacement(stop, m.view.portrait);
    const at = project(m.camera, m.view, {x: stop.origin.x + place.at.x, y: stop.origin.y + place.at.y});
    const dir = place.dir;
    return clampBox({left: dir === 'right' ? at.x : dir === 'left' ? at.x - width : at.x - width / 2, top: dir === 'down' ? at.y : dir === 'up' ? at.y - height : at.y - height / 2, width, height, dir}, m.view);
  }
  const el = elementRect(m, stop);
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  if (choice.mode === 'gutter') {
    const dev = screenRect(m, stop);
    const left = choice.side === 'left' ? dev.x - GAP - width : dev.x + dev.w + GAP;
    return clampBox({left, top: cy - height / 2, width, height, dir: choice.side}, m.view);
  }
  const dx = choice.slide * SLIDE_X * width;
  const dy = choice.slide * SLIDE_Y * height;
  switch (choice.dir) {
    case 'up':
      return clampBox({left: cx - width / 2 + dx, top: el.y - GAP - height, width, height, dir: 'up'}, m.view);
    case 'down':
      return clampBox({left: cx - width / 2 + dx, top: el.y + el.h + GAP, width, height, dir: 'down'}, m.view);
    case 'left':
      return clampBox({left: el.x - GAP - width, top: cy - height / 2 + dy, width, height, dir: 'left'}, m.view);
    default:
      return clampBox({left: el.x + el.w + GAP, top: cy - height / 2 + dy, width, height, dir: 'right'}, m.view);
  }
}

const rectOf = (b: LabelBox): Rect => ({x: b.left, y: b.top, w: b.width, h: b.height});

/** Fraction of the label's area covered, weighted by what covers it. Lower is better. */
function cost(box: LabelBox, obstacles: readonly Obstacle[], centre: {x: number; y: number}, diagonal: number): number {
  const r = rectOf(box);
  const area = r.w * r.h;
  const covered = obstacles.reduce((sum, o) => sum + (overlap(r, o.rect) / area) * o.cost, 0);
  const d = Math.hypot(box.left + box.width / 2 - centre.x, box.top + box.height / 2 - centre.y) / diagonal;
  return covered + COST.distance * d;
}

const choices = new WeakMap<Model, Map<string, Choice>>();

/**
 * Which placement a stop's label takes, decided once per stop and frame size with the camera at rest: the
 * declared placement first, then the other three sides of the element at a few offsets along its edge, then the
 * gutter on either side of the device. The one that covers the least text, and no ring, wins; ties keep the
 * earlier (declared) candidate.
 */
function choose(model: Model, stop: TimedStop, view: Frame, size: {width: number; height: number}): Choice {
  const key = `${stop.id}|${view.width}x${view.height}`;
  const cache = choices.get(model) ?? new Map<string, Choice>();
  choices.set(model, cache);
  const hit = cache.get(key);
  if (hit) return hit;
  const m: Mapped = {camera: stopCamera(model, stop, view), view};
  const obstacles = obstaclesFor(model, stop, m);
  const el = elementRect(m, stop);
  const centre = {x: el.x + el.w / 2, y: el.y + el.h / 2};
  const diagonal = Math.hypot(view.width, view.height);
  const declared = stop.labelAt !== undefined || (view.portrait && stop.portraitLabel !== undefined);
  const first = declared ? labelPlacement(stop, view.portrait).dir : undefined;
  const dirs = [...new Set<LabelDir>([...(first ? [first] : []), 'up', 'down', 'left', 'right'])];
  const list: Choice[] = [
    ...(declared ? [{mode: 'declared'} as const] : []),
    ...dirs.flatMap((dir) => SLIDES.map((slide) => ({mode: 'ring', dir, slide}) as const)),
    ...(stop.shot.device ? [{mode: 'gutter', side: 'right'} as const, {mode: 'gutter', side: 'left'} as const] : []),
  ];
  let best = list[0];
  let bestCost = Infinity;
  list.forEach((c, i) => {
    const score = cost(boxFor(c, model, stop, m, size), obstacles, centre, diagonal) - (i === 0 && declared ? COST.declaredBonus : 0);
    if (score < bestCost - 1e-9) {
      best = c;
      bestCost = score;
    }
  });
  cache.set(key, best);
  return best;
}

/**
 * Where a stop's label is drawn with the camera as given. Phones, tablets and screens that list their text get
 * the searched placement; every other screen keeps the declared one, exactly as written in the journey.
 */
export function labelBox(model: Model, stop: TimedStop, camera: Camera, view: Frame): LabelBox {
  const size = labelSize(stop, view.portrait);
  const m: Mapped = {camera, view};
  const choice: Choice = isSearched(stop) ? choose(model, stop, view, size) : {mode: 'declared'};
  return boxFor(choice, model, stop, m, size);
}

/** What the label of a stop covers once placed, with the camera at rest, in frame pixels squared. For the validator. */
export function labelCoverage(model: Model, stop: TimedStop, view: Frame): {text: number; ownElement: number; otherRing: string[]} {
  const camera = stopCamera(model, stop, view);
  const m: Mapped = {camera, view};
  const box = rectOf(labelBox(model, stop, camera, view));
  const text = (stop.shot.text ?? []).reduce((sum, r) => sum + overlap(box, pad(toFrame(m, stop, r), TEXT_PAD)), 0);
  // The validator reports a label that covers the element itself, not one that touches the outline drawn around it.
  const ownElement = overlap(box, elementRect(m, stop, 0));
  const otherRing = model.stops.filter((o) => o.id !== stop.id && o.ring && overlap(box, elementRect(m, o, 0)) > 0).map((o) => o.id);
  return {text, ownElement, otherRing};
}

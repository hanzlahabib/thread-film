import type {Pt, Rect} from './geometry';
import {hookFormedAt, hookLayout} from './HookCard';
import {ROAD} from './layout';
import {buildModel, makeFrame, type Frame, type Model} from './model';
import {labelCoverage} from './placement';
import type {Theme} from './theme';
import {buildTrail} from './trail';
import {byMode, screenWidth, type Hook, type Journey} from './types';

export type Issue = {level: 'error' | 'warning'; where: string; message: string};

/** The ring is drawn this much larger than its rectangle (see Thread), so an anchor must clear that too. */
const RING_PAD = 6;
/** A stub should end on the element's edge; further than this from the ring and it is probably mis-measured. */
const STUB_TOLERANCE = 24;

const inside = (p: Pt, w: number, h: number) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
const rectInside = (r: Rect, w: number, h: number) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;
const insideRect = (p: Pt, r: Rect, pad: number) => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;
const distanceToRect = (p: Pt, r: Rect) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));
const fmt = (p: Pt) => `(${Math.round(p.x)}, ${Math.round(p.y)})`;

/** Checks everything about a journey that can be checked without the capture files. */
export function validateJourney(journey: Journey): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({level: 'error', where, message});
  const warn = (where: string, message: string) => issues.push({level: 'warning', where, message});

  const screenIds = new Set<string>();
  for (const screen of journey.screens) {
    if (screenIds.has(screen.id)) err(`screen "${screen.id}"`, 'the id is used twice.');
    screenIds.add(screen.id);
    if (screen.route.length < 2) err(`screen "${screen.id}"`, 'the route needs at least two points (where the line enters and where it leaves).');
    if (!(screen.height > 0)) err(`screen "${screen.id}"`, 'height must be the capture height in pixels.');
  }
  if (journey.screens.length === 0) err('journey', 'there are no screens.');
  if (journey.stops.length === 0) err('journey', 'there are no stops.');
  if (issues.some((i) => i.level === 'error')) return issues;

  let trail;
  try {
    trail = buildTrail(journey);
  } catch (e) {
    err('route', e instanceof Error ? e.message : String(e));
    return issues;
  }

  const stopIds = new Set<string>();
  let previousScreenIndex = -1;
  let previousMark = -1;
  journey.stops.forEach((stop, i) => {
    const where = `stop "${stop.id}"`;
    if (stopIds.has(stop.id)) err(where, 'the id is used twice.');
    stopIds.add(stop.id);
    const screenIndex = journey.screens.findIndex((s) => s.id === stop.screen);
    const screen = journey.screens[screenIndex];
    if (!screen) {
      err(where, `it names the screen "${stop.screen}", which is not in the journey. Screens: ${[...screenIds].join(', ')}.`);
      return;
    }
    if (screenIndex < previousScreenIndex) err(where, `it is on screen "${screen.id}" but follows a stop on a later screen. List stops in the order the line reaches them.`);
    previousScreenIndex = Math.max(previousScreenIndex, screenIndex);
    const mark = trail.marks[stop.id];
    if (mark === undefined) {
      err(where, `no route point has mark: '${stop.id}'. Add it to the route of "${screen.id}" at the point where the line should land.`);
      return;
    }
    if (mark < previousMark) err(where, 'it lies earlier on the line than the stop before it.');
    previousMark = mark;

    const w = screenWidth(screen);
    const h = screen.height;
    const world = trail.at(mark);
    const anchor = {x: world.x - screen.origin.x, y: world.y - screen.origin.y};
    if (!inside(anchor, w, h)) err(where, `the landing point ${fmt(anchor)} is outside the ${w}x${h} capture.`);
    if (stop.ring) {
      if (!rectInside(stop.ring, w, h)) err(where, `its ring ${stop.ring.w}x${stop.ring.h} at ${fmt(stop.ring)} leaves the ${w}x${h} capture.`);
      if (insideRect(anchor, stop.ring, RING_PAD)) err(where, `the landing point ${fmt(anchor)} sits on top of its ring. Move the route point into the gutter beside the element and use \`stub\` to reach its edge.`);
      if (stop.stub && distanceToRect(stop.stub, stop.ring) > STUB_TOLERANCE) warn(where, `its stub ends at ${fmt(stop.stub)}, ${Math.round(distanceToRect(stop.stub, stop.ring))}px from the ring. It should end on the element's edge.`);
    } else {
      warn(where, 'it has no ring, so nothing lights up when the line lands.');
    }
    if (stop.stub && !inside(stop.stub, w, h)) err(where, `its stub end ${fmt(stop.stub)} is outside the capture.`);
    if (stop.look && !inside(stop.look, w, h)) err(where, `look ${fmt(stop.look)} is outside the capture.`);
    if (stop.labelAt && !inside(stop.labelAt, w, h)) err(where, `labelAt ${fmt(stop.labelAt)} is outside the capture, so the label would hang off the screen.`);
    if (!stop.labelAt && !stop.ring) err(where, 'it has neither a ring nor labelAt, so the label has nothing to sit beside.');
    if (stop.portraitLabel && !inside(stop.portraitLabel.at, w, h)) err(where, `portraitLabel.at ${fmt(stop.portraitLabel.at)} is outside the capture.`);
    if (stop.ring && stop.labelAt && insideRect(stop.labelAt, stop.ring, 0) && (stop.labelDir === 'left' || stop.labelDir === 'right')) warn(where, 'its label starts inside the ring and will cover the element it describes.');
    if (typeof stop.zoom === 'number' ? !(stop.zoom > 0) : stop.zoom !== undefined && !['wide', 'medium', 'tight'].includes(stop.zoom)) err(where, `zoom must be a number above 0 or 'wide', 'medium' or 'tight', not ${JSON.stringify(stop.zoom)}.`);
    if (stop.beat !== undefined && !['light', 'normal', 'key'].includes(stop.beat)) err(where, `beat must be 'light', 'normal' or 'key', not ${JSON.stringify(stop.beat)}.`);
    if (!stop.label.trim()) err(where, 'the label is empty.');
    for (const tick of stop.ticks ?? []) {
      if (trail.marks[tick.mark] === undefined) err(where, `tick mark "${tick.mark}" is not on the route.`);
      if (!inside(tick.at, w, h)) err(where, `tick "${tick.mark}" at ${fmt(tick.at)} is outside the capture.`);
    }

    if (stop.carry) {
      const prev = journey.stops[i - 1];
      const firstOnScreen = !prev || prev.screen !== stop.screen;
      if (!prev) err(where, 'it carries a chip but is the first stop of the film: a carried chip needs a source stop to leave from.');
      else if (!firstOnScreen) err(where, `it carries a chip but is not the first stop on "${screen.id}". A chip rides the flight into a screen, from the last stop of the screen before.`);
      else if (!stop.carry.text.trim()) err(where, 'the carried chip has no text.');
    }
  });

  for (const screen of journey.screens) {
    if (!journey.stops.some((s) => s.screen === screen.id)) err(`screen "${screen.id}"`, 'no stop lands on it. A screen without a stop is skipped by the line; remove it or add a stop.');
  }
  // A screen with stops after one without: chips are only carried between consecutive stopped screens.
  for (const reveal of journey.reveals ?? []) {
    for (const key of ['from', 'to'] as const) if (trail.marks[reveal[key]] === undefined) err(`reveal on "${reveal.screen}"`, `${key} mark "${reveal[key]}" is not on the route.`);
    if (!screenIds.has(reveal.screen)) err(`reveal on "${reveal.screen}"`, 'that screen is not in the journey.');
  }

  // Screens overlapping in the world hide each other and make the line cross a capture it does not belong to.
  journey.screens.forEach((a, i) =>
    journey.screens.slice(i + 1).forEach((b) => {
      if (a.origin.x < b.origin.x + screenWidth(b) && b.origin.x < a.origin.x + screenWidth(a) && a.origin.y < b.origin.y + b.height && b.origin.y < a.origin.y + a.height) {
        err(`screens "${a.id}" and "${b.id}"`, 'overlap in the world. Move one origin so the captures do not touch.');
      }
    }),
  );
  return issues;
}

/** Every capture path a journey needs, for the file check. */
export function capturePaths(journey: Journey): {screen: string; path: string}[] {
  return journey.screens.flatMap((screen) => {
    const c = screen.capture;
    const paths = typeof c === 'string' ? [c] : [byMode(c, 'dark'), byMode(c, 'light')];
    return paths.map((path) => ({screen: screen.id, path}));
  });
}

/** Frame sizes every film is checked at: both shapes of the compositions. */
export const CHECK_FRAMES: {name: string; frame: Frame}[] = [
  {name: '9:16', frame: makeFrame(1080, 1920)},
  {name: '16:9', frame: makeFrame(1920, 1080)},
];

/** A route of an 'auto' journey must start and end on the margin lane, where the engine joins its legs. */
export function validateAutoRoutes(journey: Journey): Issue[] {
  if (journey.layout !== 'auto') return [];
  const issues: Issue[] = [];
  for (const screen of journey.screens) {
    const w = screenWidth(screen);
    const ends = [screen.route[0], screen.route[screen.route.length - 1]];
    ends.forEach((p, i) => {
      if ('through' in p) {
        issues.push({level: 'error', where: `screen "${screen.id}"`, message: `with layout 'auto' the ${i === 0 ? 'first' : 'last'} point of the route must be a plain point on the margin lane.`});
        return;
      }
      const edge = Math.min(p.x, w - p.x, p.y, screen.height - p.y);
      if (edge > ROAD * 2.5) issues.push({level: 'warning', where: `screen "${screen.id}"`, message: `the ${i === 0 ? 'first' : 'last'} route point ${fmt(p)} is ${Math.round(edge)}px from the nearest edge. With layout 'auto' it should sit on the margin lane (about ${ROAD}px in), where the legs to the neighbouring screens run.`});
    });
  }
  return issues;
}

/**
 * Checks what only exists once the film is laid out for a frame size: no label over another stop's ring or its
 * own element, and none over text the capture lists. Returns warnings; a label is moved, never cropped, so a
 * crowded screen still renders, but the journey should be fixed (a shorter label, or a ring that leaves room).
 */
export function validateLabels(model: Model, name: string, view: Frame): Issue[] {
  const issues: Issue[] = [];
  for (const stop of model.stops) {
    const where = `stop "${stop.id}" (${name})`;
    const cover = labelCoverage(model, stop, view);
    if (cover.ownElement > 0) issues.push({level: 'warning', where, message: 'its label covers the element it describes. Give the label room beside the element, or shorten it.'});
    if (cover.otherRing.length > 0) issues.push({level: 'warning', where, message: `its label covers the ring of ${cover.otherRing.map((id) => `"${id}"`).join(', ')}.`});
    if (cover.text > 0) issues.push({level: 'warning', where, message: `its label covers text of the capture (${Math.round(cover.text)} px squared). Shorten it or leave a clearer side.`});
  }
  return issues;
}

/** Lays the journey out for each check frame and runs every check that needs the layout. */
export function validateFilm(journey: Journey, theme: Theme): Issue[] {
  const issues = validateAutoRoutes(journey);
  if (issues.some((i) => i.level === 'error')) return issues;
  CHECK_FRAMES.forEach(({name, frame}, i) => {
    const model = buildModel(journey, theme, {}, frame);
    // An 'auto' journey has no origins or joined routes until it is laid out: check the resolved one, once.
    if (journey.layout === 'auto' && i === 0) issues.push(...validateJourney(model.journey));
    issues.push(...validateLabels(model, name, frame));
  });
  return issues;
}

/** Must match HOOK_FRAMES and the crossfade FADE in ThreadFilm.tsx. */
const DEFAULT_HOOK_FRAMES = 90;
const HOOK_CROSSFADE = 12;
/** The headline stays fully formed for at least 0.6 s at 30 fps before the card fades out. */
const MIN_FORMED_FRAMES = 18;

/** The hook must have time to form and to be read: formed within 8 frames of each line, then held for 0.6 s. */
export function validateHook(hook: Hook | undefined): Issue[] {
  if (!hook) return [];
  const frames = hook.frames ?? DEFAULT_HOOK_FRAMES;
  const issues: Issue[] = [];
  for (const {name, frame} of CHECK_FRAMES) {
    const {lines} = hookLayout(hook.headline, frame);
    const held = frames - HOOK_CROSSFADE - hookFormedAt(lines.length);
    if (held < MIN_FORMED_FRAMES) issues.push({level: 'warning', where: `hook (${name})`, message: `its ${lines.length}-line headline is fully formed for only ${Math.max(0, held)} frames before the card fades. Give the hook at least ${frames + MIN_FORMED_FRAMES - held} frames.`});
  }
  return issues;
}

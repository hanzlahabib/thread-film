import type {Pt, Rect} from './geometry';
import {buildTrail} from './trail';
import {CAPTURE_W, byMode, type Journey} from './types';

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

    const w = CAPTURE_W;
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
    if (!inside(stop.look, w, h)) err(where, `look ${fmt(stop.look)} is outside the capture.`);
    if (!inside(stop.labelAt, w, h)) err(where, `labelAt ${fmt(stop.labelAt)} is outside the capture, so the label would hang off the screen.`);
    if (stop.portraitLabel && !inside(stop.portraitLabel.at, w, h)) err(where, `portraitLabel.at ${fmt(stop.portraitLabel.at)} is outside the capture.`);
    if (stop.ring && insideRect(stop.labelAt, stop.ring, 0) && (stop.labelDir === 'left' || stop.labelDir === 'right')) warn(where, 'its label starts inside the ring and will cover the element it describes.');
    if (!(stop.zoom > 0)) err(where, 'zoom must be greater than 0.');
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
      if (a.origin.x < b.origin.x + CAPTURE_W && b.origin.x < a.origin.x + CAPTURE_W && a.origin.y < b.origin.y + b.height && b.origin.y < a.origin.y + a.height) {
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

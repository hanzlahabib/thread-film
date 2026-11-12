import {chromeInsets} from './chrome';
import type {Pt, Vertex} from './geometry';
import {overviewScale, type OverviewFrame} from './overview';
import type {Theme} from './theme';
import {screenWidth, type Journey, type RoutePoint, type Screen} from './types';

export type Arrangement = 'row' | 'column' | 'grid' | 'serpentine';

/**
 * Margin lane: the line of a screen's route runs this far inside the capture's edge, where a phone's content
 * has its padding. Routes of an auto layout start and end on this lane, and the legs that leave and enter the
 * screen follow it, so a leg never crosses text.
 */
export const ROAD = 10;
/** How far outside the capture a leg starts or ends, in capture pixels. It is past the bezel. */
const PORT_PAD = 60;
/** Gap between neighbouring screens as a fraction of their mean width, and its floor, in world pixels. The flights curve through it. */
const GAP_FRACTION = 0.38;
const GAP_MIN = 140;
/** A row-major grid sends the line diagonally from the end of one row to the start of the next; the serpentine does not. Ties go to the serpentine. */
const GRID_PENALTY = 0.97;

type Size = {w: number; h: number};
export type Arranged = {kind: Arrangement; cols: number; /** Top-left of each screen's outer box, in world pixels. */ outer: Pt[]; size: Size; /** Distance between neighbouring cells. */ pitch: Size};

/** Every way to lay out `sizes` in reading order: one row, one column, and grids of 2..n-1 columns, plain and serpentine. */
export function arrangements(sizes: readonly Size[]): Arranged[] {
  const n = sizes.length;
  const cellW = Math.max(...sizes.map((s) => s.w));
  const cellH = Math.max(...sizes.map((s) => s.h));
  const gap = Math.max(GAP_MIN, (GAP_FRACTION * sizes.reduce((sum, s) => sum + s.w, 0)) / n);
  const out: Arranged[] = [];
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const kinds: Arrangement[] = cols === 1 ? ['column'] : cols === n ? ['row'] : ['serpentine', 'grid'];
    for (const kind of kinds) {
      const outer = sizes.map((s, i) => {
        const row = Math.floor(i / cols);
        const c = kind === 'serpentine' && row % 2 === 1 ? cols - 1 - (i % cols) : i % cols;
        return {x: c * (cellW + gap) + (cellW - s.w) / 2, y: row * (cellH + gap) + (cellH - s.h) / 2};
      });
      out.push({kind, cols, outer, size: {w: cols * cellW + (cols - 1) * gap, h: rows * cellH + (rows - 1) * gap}, pitch: {w: cellW + gap, h: cellH + gap}});
    }
  }
  return out;
}

/** The arrangement that shows the screens largest in the overview of this composition. */
export function bestArrangement(sizes: readonly Size[], frame: OverviewFrame, outro: Journey['outro']): Arranged {
  let best: {arranged: Arranged; score: number} | null = null;
  for (const arranged of arrangements(sizes)) {
    const score = overviewScale(frame, outro, arranged.size) * (arranged.kind === 'grid' ? GRID_PENALTY : 1);
    if (!best || score > best.score + 1e-9) best = {arranged, score};
  }
  if (!best) throw new Error('The journey has no screens to arrange.');
  return best.arranged;
}

type Side = 'top' | 'right' | 'bottom' | 'left';

const vertexOf = (p: RoutePoint, screen: Screen, which: 'first' | 'last'): Vertex => {
  if ('through' in p) throw new Error(`Screen "${screen.id}": with layout 'auto' the ${which} point of a route must be a plain point, not a smooth run.`);
  return p;
};

/** Distance of a point from the nearest edge of the capture, and which edge. */
function nearestSide(p: Pt, w: number, h: number): Side {
  const d: [Side, number][] = [['left', p.x], ['right', w - p.x], ['top', p.y], ['bottom', h - p.y]];
  return d.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
}

/**
 * The legs from a point on the margin lane out through `side`, as points starting at `p`: straight out when p
 * is already on that side's lane, otherwise round the lane (the shorter way) to the first corner of that side
 * and straight on. Everything runs on the lane, so no leg crosses the capture.
 */
export function portPath(p: Pt, side: Side, w: number, h: number): Pt[] {
  const R = ROAD;
  const tl = {x: R, y: R};
  const tr = {x: w - R, y: R};
  const br = {x: w - R, y: h - R};
  const bl = {x: R, y: h - R};
  const corners = [tl, tr, br, bl]; // clockwise
  const sideCorners: Record<Side, Pt[]> = {top: [tl, tr], right: [tr, br], bottom: [br, bl], left: [bl, tl]};
  const outward = (q: Pt): Pt => (side === 'top' ? {x: q.x, y: -PORT_PAD} : side === 'bottom' ? {x: q.x, y: h + PORT_PAD} : side === 'left' ? {x: -PORT_PAD, y: q.y} : {x: w + PORT_PAD, y: q.y});
  // Snap onto the lane rectangle: the lane (side) it is nearest to.
  const lane = nearestSide({x: p.x - R, y: p.y - R}, w - 2 * R, h - 2 * R);
  const snap: Pt = lane === 'left' ? {x: R, y: clamp(p.y, R, h - R)} : lane === 'right' ? {x: w - R, y: clamp(p.y, R, h - R)} : lane === 'top' ? {x: clamp(p.x, R, w - R), y: R} : {x: clamp(p.x, R, w - R), y: h - R};
  if (lane === side) return [p, outward(p)];
  // Walk clockwise and anticlockwise to the first corner that belongs to `side`.
  const nextCw: Record<Side, number> = {top: 1, right: 2, bottom: 3, left: 0};
  const nextCcw: Record<Side, number> = {top: 0, right: 1, bottom: 2, left: 3};
  const walk = (start: number, step: 1 | -1): Pt[] => {
    const pts: Pt[] = [];
    let i = start;
    for (let guard = 0; guard < 4; guard++) {
      pts.push(corners[i]);
      if (sideCorners[side].includes(corners[i])) break;
      i = (i + step + 4) % 4;
    }
    return pts;
  };
  const length = (pts: Pt[]) => pts.reduce((sum, q, i) => sum + Math.hypot(q.x - (i === 0 ? snap.x : pts[i - 1].x), q.y - (i === 0 ? snap.y : pts[i - 1].y)), 0);
  const cw = walk(nextCw[lane], 1);
  const ccw = walk(nextCcw[lane], -1);
  const around = length(cw) <= length(ccw) ? cw : ccw;
  // Drop repeats (p already on the lane, a corner it stands on): a zero-length leg cannot be rounded.
  return [p, snap, ...around, outward(around[around.length - 1])].filter((q, i, all) => i === 0 || Math.hypot(q.x - all[i - 1].x, q.y - all[i - 1].y) > 0.01);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The route of one screen with the legs that enter it by `entry` and leave it by `exit` added around it. */
function routeWithPorts(screen: Screen, entry: Side | null, exit: Side | null): RoutePoint[] {
  const w = screenWidth(screen);
  const h = screen.height;
  const route = screen.route;
  const first = vertexOf(route[0], screen, 'first');
  const last = vertexOf(route[route.length - 1], screen, 'last');
  const lead = portPath(first, entry ?? nearestSide(first, w, h), w, h).slice(1).reverse();
  const tail = exit ? portPath(last, exit, w, h).slice(1) : [];
  return [...lead, ...route, ...tail];
}

/** Side of a screen at `from` that faces the screen at `to`, comparing the offsets in units of the cell pitch. */
function facing(from: Pt, to: Pt, pitch: Size): Side {
  const dx = (to.x - from.x) / pitch.w;
  const dy = (to.y - from.y) / pitch.h;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top';
}

/**
 * Gives an 'auto' journey its origins and its connected routes for one composition shape. A 'manual' journey
 * is returned as it is. The screens go in the arrangement that shows them largest in the closing overview;
 * each route then gets the legs that leave by the side facing the next screen and enter by the side facing the
 * previous one.
 */
export function resolveLayout(journey: Journey, theme: Theme, frame: OverviewFrame): Journey {
  if (journey.layout !== 'auto') return journey;
  const insets = journey.screens.map((s) => chromeInsets(s, theme));
  const sizes = journey.screens.map((s, i) => ({w: screenWidth(s) + insets[i].side * 2, h: s.height + insets[i].top + insets[i].bottom}));
  const arranged = bestArrangement(sizes, frame, journey.outro);
  const centres = arranged.outer.map((o, i) => ({x: o.x + sizes[i].w / 2, y: o.y + sizes[i].h / 2}));
  return {
    ...journey,
    screens: journey.screens.map((screen, i) => ({
      ...screen,
      origin: {x: arranged.outer[i].x + insets[i].side, y: arranged.outer[i].y + insets[i].top},
      route: routeWithPorts(screen, i > 0 ? facing(centres[i], centres[i - 1], arranged.pitch) : null, i < journey.screens.length - 1 ? facing(centres[i], centres[i + 1], arranged.pitch) : null),
    })),
  };
}

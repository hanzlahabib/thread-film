import {Trail, add, type Pt, type Vertex} from './geometry';
import type {Journey, RoutePoint, Through} from './types';

// Flights between screens: the handles of the bezier are this fraction of the gap, within sensible limits,
// so short hops stay tight and long ones still arc.
const HANDLE_FRACTION = 0.5;
const HANDLE_MIN = 260;
const HANDLE_MAX = 900;
/** Corner radius used when a route vertex does not set one and is not a landing point. */
const DEFAULT_RADIUS = 16;

const isThrough = (p: RoutePoint): p is Through => 'through' in p;

function firstPoint(p: RoutePoint): Pt {
  return isThrough(p) ? p.through[0] : p;
}

function unit(a: Pt, b: Pt): Pt {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {x: (b.x - a.x) / d, y: (b.y - a.y) / d};
}

/**
 * Builds the whole line from the journey: each screen's route in order, joined by generated flights. A flight
 * leaves in the direction the previous route ended and arrives in the direction the next route starts.
 */
export function buildTrail(journey: Journey): Trail {
  const trail = new Trail();
  journey.screens.forEach((screen, index) => {
    const route = screen.route;
    if (route.length < 2) throw new Error(`Screen "${screen.id}" needs a route of at least two points.`);
    const entry = add(screen.origin, firstPoint(route[0]));
    let rest = route;
    if (index === 0) {
      trail.route(screen.origin, [{...firstPoint(route[0]), mark: 'start'}]);
      rest = route.slice(1);
    } else {
      const next = add(screen.origin, firstPoint(isThrough(route[0]) ? {...route[0].through[1]} : route[1]));
      const out = trail.heading;
      const into = unit(entry, next);
      const from = trail.end;
      const gap = Math.hypot(entry.x - from.x, entry.y - from.y);
      const h = Math.min(HANDLE_MAX, Math.max(HANDLE_MIN, gap * HANDLE_FRACTION));
      trail.cubic({x: from.x + out.x * h, y: from.y + out.y * h}, {x: entry.x - into.x * h, y: entry.y - into.y * h}, entry);
      rest = route.slice(1);
    }
    let run: Vertex[] = [];
    const flush = () => {
      if (run.length > 0) trail.route(screen.origin, run);
      run = [];
    };
    rest.forEach((point, i) => {
      if (isThrough(point)) {
        // Lead into the first point of the smooth run as an ordinary vertex, then curve through the rest.
        run.push({...point.through[0], r: 0, mark: point.startMark});
        flush();
        for (let k = 1; k < point.through.length; k++) {
          const a = add(screen.origin, point.through[k - 1]);
          const b = add(screen.origin, point.through[k]);
          const mx = (a.x + b.x) / 2;
          // Horizontal handles: the same eased shape charting libraries draw between data points.
          trail.cubic({x: mx, y: a.y}, {x: mx, y: b.y}, b);
        }
        if (point.mark) trail.mark(point.mark);
        return;
      }
      const last = i === rest.length - 1;
      // Landing points (marks) and the exit point keep a sharp corner so their distance is exact.
      run.push({...point, r: point.r ?? (point.mark || last ? 0 : DEFAULT_RADIUS)});
    });
    flush();
  });
  return trail;
}

export type Pt = {x: number; y: number};
export type Rect = {x: number; y: number; w: number; h: number};

/** A corner of an orthogonal route. `r` rounds it; `mark` names the trail length at this corner. */
export type Vertex = Pt & {r?: number; mark?: string};

// Rounded corners and bezier connectors are flattened into short chords so that one polyline is both what is
// drawn and what is measured: the stroke end and the head dot can never disagree.
const CORNER_STEPS = 8;
const CUBIC_STEPS = 72;

/**
 * The thread: one polyline in world pixels, built once. Every named mark is a distance along it, which is the
 * single unit the schedule, the camera and the renderer all work in.
 */
export class Trail {
  readonly points: Pt[] = [];
  /** Cumulative length at each point. */
  readonly cum: number[] = [];
  readonly marks: Record<string, number> = {};

  get length(): number {
    return this.cum.length === 0 ? 0 : this.cum[this.cum.length - 1];
  }

  private get last(): Pt {
    return this.points[this.points.length - 1];
  }

  private push(p: Pt): void {
    if (this.points.length === 0) {
      this.points.push(p);
      this.cum.push(0);
      return;
    }
    const d = Math.hypot(p.x - this.last.x, p.y - this.last.y);
    if (d < 0.01) return;
    this.cum.push(this.length + d);
    this.points.push(p);
  }

  mark(name: string): this {
    this.marks[name] = this.length;
    return this;
  }

  /** Straight runs through `vertices` (offset by `origin`), rounding every corner that has a radius. */
  route(origin: Pt, vertices: readonly Vertex[]): this {
    const abs = vertices.map((v) => ({...v, x: v.x + origin.x, y: v.y + origin.y}));
    abs.forEach((v, i) => {
      const next = abs[i + 1];
      const prev = this.points.length > 0 ? this.last : undefined;
      if (v.r && prev && next) {
        const d1 = Math.hypot(v.x - prev.x, v.y - prev.y);
        const d2 = Math.hypot(next.x - v.x, next.y - v.y);
        const r = Math.min(v.r, d1 / 2, d2 / 2);
        const a = {x: v.x - ((v.x - prev.x) / d1) * r, y: v.y - ((v.y - prev.y) / d1) * r};
        const b = {x: v.x + ((next.x - v.x) / d2) * r, y: v.y + ((next.y - v.y) / d2) * r};
        this.push(a);
        for (let s = 1; s <= CORNER_STEPS; s++) {
          const t = s / CORNER_STEPS;
          const u = 1 - t;
          this.push({x: u * u * a.x + 2 * u * t * v.x + t * t * b.x, y: u * u * a.y + 2 * u * t * v.y + t * t * b.y});
          if (v.mark && s === CORNER_STEPS / 2) this.mark(v.mark);
        }
      } else {
        this.push(v);
        if (v.mark) this.mark(v.mark);
      }
    });
    return this;
  }

  /** Cubic bezier from the current end to `to` (world pixels); used for flights between screens and smooth runs. */
  cubic(c1: Pt, c2: Pt, to: Pt): this {
    const p0 = this.last;
    for (let s = 1; s <= CUBIC_STEPS; s++) {
      const t = s / CUBIC_STEPS;
      const u = 1 - t;
      this.push({
        x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
        y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
      });
    }
    return this;
  }

  /** Point at distance `s` along the trail. */
  at(s: number): Pt {
    const d = Math.min(Math.max(s, 0), this.length);
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = this.cum[hi] - this.cum[lo];
    const t = span === 0 ? 0 : (d - this.cum[lo]) / span;
    const a = this.points[lo];
    const b = this.points[hi];
    return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
  }

  /** Direction of travel at the end of the trail, as a unit vector. */
  get heading(): Pt {
    const n = this.points.length;
    if (n < 2) return {x: 1, y: 0};
    const a = this.points[n - 2];
    const b = this.points[n - 1];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {x: (b.x - a.x) / d, y: (b.y - a.y) / d};
  }

  get end(): Pt {
    return this.last;
  }

  /** SVG path data for the whole trail. */
  toPath(): string {
    return this.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function add(a: Pt, b: Pt): Pt {
  return {x: a.x + b.x, y: a.y + b.y};
}

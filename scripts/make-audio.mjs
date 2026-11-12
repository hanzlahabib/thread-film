// Generates every sound the engine plays: sound effects and music beds, all synthesised here (no samples, no
// downloads, no native dependencies). The output is committed, so you only run this to change the sounds:
//
//   pnpm run audio
//
// Writes public/audio/sfx/*.wav, public/audio/music/*.mp3 (WAV when no ffmpeg is found) and
// src/engine/audio-manifest.json, which the engine reads for file names, lengths and where each effect peaks.
// The generator is deterministic: the same code always writes the same sound.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

const SR = 44100;
const root = process.cwd();
const sfxDir = join(root, 'public/audio/sfx');
const musicDir = join(root, 'public/audio/music');
mkdirSync(sfxDir, {recursive: true});
mkdirSync(musicDir, {recursive: true});

/** Peak of every effect after normalising, and of every bed (a bed is also brought towards BED_LUFS). */
const SFX_PEAK_DB = -3;
const BED_PEAK_DB = -6;
const BED_LUFS = -14;
const MP3_KBPS = 96;

const db = (x) => 10 ** (x / 20);
const TAU = Math.PI * 2;
const hz = (note) => 440 * 2 ** ((note - 69) / 12);
// Notes are MIDI numbers; the whole library lives in D major / B minor so effects never clash with a bed.
const N = {D2: 38, A2: 45, B2: 47, G2: 43, D3: 50, E3: 52, 'F#3': 54, G3: 55, A3: 57, B3: 59, 'C#4': 61, D4: 62, E4: 64, 'F#4': 66, G4: 67, A4: 69, B4: 71, 'C#5': 73, D5: 74, E5: 76, 'F#5': 78, A5: 81, B5: 83, D6: 86, 'F#6': 90, 'F#2': 42, 'C#3': 49, 'E2': 40};

// ---------------------------------------------------------------------------------------------- basics

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stereo = (seconds) => ({l: new Float32Array(Math.round(seconds * SR)), r: new Float32Array(Math.round(seconds * SR))});
const peakOf = (s) => {
  let p = 0;
  for (let i = 0; i < s.l.length; i++) p = Math.max(p, Math.abs(s.l[i]), Math.abs(s.r[i]));
  return p;
};
const scale = (s, g) => {
  for (let i = 0; i < s.l.length; i++) {
    s.l[i] *= g;
    s.r[i] *= g;
  }
};

/** Adds `src` into `dst` from sample `at`, optionally wrapping past the end (for seamless loops). */
function addWrapped(dst, src, at, wrap, gl = 1, gr = gl) {
  const n = dst.l.length;
  for (let i = 0; i < src.l.length; i++) {
    let j = at + i;
    if (j >= n) {
      if (!wrap) break;
      j %= n;
    }
    dst.l[j] += src.l[i] * gl;
    dst.r[j] += src.r[i] * gr;
  }
}

/** Biquad in transposed direct form II. */
class Biquad {
  constructor() {
    this.z1 = 0;
    this.z2 = 0;
    this.set(1, 0, 0, 1, 0, 0);
  }
  set(b0, b1, b2, a0, a1, a2) {
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  bandpass(f, q) {
    const w = (TAU * f) / SR;
    const al = Math.sin(w) / (2 * q);
    this.set(al, 0, -al, 1 + al, -2 * Math.cos(w), 1 - al);
  }
  lowpass(f, q = 0.707) {
    const w = (TAU * f) / SR;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
  }
  highpass(f, q = 0.707) {
    const w = (TAU * f) / SR;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    this.set((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
  }
  process(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

function filterStatic(buf, kind, f, q) {
  const bq = new Biquad();
  bq[kind](f, q);
  for (let i = 0; i < buf.length; i++) buf[i] = bq.process(buf[i]);
}

/**
 * A small stereo room: four damped combs and two all-passes per side (Schroeder), enough to give a tail and
 * some air without a heavy convolution. `decay` is the comb feedback; `damp` darkens the tail.
 */
function reverb(s, {mix = 0.25, decay = 0.8, damp = 0.35, preDelayMs = 12} = {}) {
  const dl = [1687, 1601, 2053, 2251].map((n) => Math.round(n * 1.1));
  const dr = dl.map((n) => n + 23);
  const wet = [new Float32Array(s.l.length), new Float32Array(s.r.length)];
  const pre = Math.round((preDelayMs / 1000) * SR);
  [s.l, s.r].forEach((input, ch) => {
    const combs = (ch === 0 ? dl : dr).map((len) => ({buf: new Float32Array(len), i: 0, lp: 0}));
    const aps = [556, 441].map((len) => ({buf: new Float32Array(len), i: 0}));
    for (let n = 0; n < input.length; n++) {
      const x = (n >= pre ? input[n - pre] : 0) * 0.3;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.lp = y * (1 - damp) + c.lp * damp;
        c.buf[c.i] = x + c.lp * decay;
        c.i = (c.i + 1) % c.buf.length;
        acc += y;
      }
      for (const a of aps) {
        const b = a.buf[a.i];
        const y = -acc + b;
        a.buf[a.i] = acc + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = y;
      }
      wet[ch][n] = acc * 0.25;
    }
  });
  for (let n = 0; n < s.l.length; n++) {
    s.l[n] = s.l[n] * (1 - mix * 0.5) + wet[0][n] * mix;
    s.r[n] = s.r[n] * (1 - mix * 0.5) + wet[1][n] * mix;
  }
}

/** Ping-pong feedback delay: the echoes alternate sides, which widens a plucked line. */
function pingPong(s, {seconds, feedback = 0.4, mix = 0.3, tone = 3500}) {
  const d = Math.round(seconds * SR);
  const bl = new Float32Array(d);
  const br = new Float32Array(d);
  const lpl = new Biquad();
  const lpr = new Biquad();
  lpl.lowpass(tone);
  lpr.lowpass(tone);
  let i = 0;
  for (let n = 0; n < s.l.length; n++) {
    const echoL = bl[i];
    const echoR = br[i];
    bl[i] = lpl.process(s.l[n] * 0.5 + echoR * feedback);
    br[i] = lpr.process(s.r[n] * 0.5 + echoL * feedback);
    s.l[n] += echoL * mix;
    s.r[n] += echoR * mix;
    i = (i + 1) % d;
  }
}

/** Runs an effect over a loop twice and keeps the second pass, so the tail of the end wraps into the start. */
function loopSafe(s, effect) {
  const n = s.l.length;
  const t = {l: new Float32Array(n * 2), r: new Float32Array(n * 2)};
  t.l.set(s.l, 0);
  t.l.set(s.l, n);
  t.r.set(s.r, 0);
  t.r.set(s.r, n);
  effect(t);
  s.l.set(t.l.subarray(n));
  s.r.set(t.r.subarray(n));
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Brings the first and last few milliseconds to zero so a file never clicks at its edges. */
function fadeEdges(s, headMs = 1.5, tailMs = 40) {
  const h = Math.round((headMs / 1000) * SR);
  const t = Math.round((tailMs / 1000) * SR);
  const n = s.l.length;
  for (let i = 0; i < n; i++) {
    const g = Math.min(smooth(i / h), smooth((n - 1 - i) / t));
    s.l[i] *= g;
    s.r[i] *= g;
  }
}

// ---------------------------------------------------------------------------------------------- loudness

/**
 * Look-ahead peak limiter: the gain starts falling ahead of a peak (attack) and recovers slowly (release), so a
 * bed can be raised towards its loudness target without its plucks or kick poking past the peak ceiling.
 */
function limit(s, ceiling, attackMs = 3, releaseMs = 140) {
  const n = s.l.length;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = Math.min(1, ceiling / Math.max(1e-9, Math.abs(s.l[i]), Math.abs(s.r[i])));
  const ka = 1 / ((attackMs / 1000) * SR);
  const kr = 1 / ((releaseMs / 1000) * SR);
  for (let i = n - 2; i >= 0; i--) g[i] = Math.min(g[i], g[i + 1] + (1 - g[i + 1]) * ka);
  for (let i = 1; i < n; i++) g[i] = Math.min(g[i], g[i - 1] + (1 - g[i - 1]) * kr);
  for (let i = 0; i < n; i++) {
    s.l[i] *= g[i];
    s.r[i] *= g[i];
  }
}

/** BS.1770 K-weighted loudness (no gating: beds are steady). Good to about a dB against ffmpeg's ebur128. */
function lufs(s) {
  const A = 10 ** (4 / 40);
  const w = (TAU * 1681.9744509555319) / SR;
  const al = Math.sin(w) / (2 * 0.7071752369554196);
  const c = Math.cos(w);
  const sq = 2 * Math.sqrt(A) * al;
  const mk = () => {
    const f = new Biquad();
    f.set(A * (A + 1 + (A - 1) * c + sq), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - sq), A + 1 - (A - 1) * c + sq, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - sq);
    const h = new Biquad();
    h.highpass(38.13547087613982, 0.5003270373253953);
    return [f, h];
  };
  let sum = 0;
  for (const ch of [s.l, s.r]) {
    const [f, h] = mk();
    let e = 0;
    for (let i = 0; i < ch.length; i++) {
      const y = h.process(f.process(ch[i]));
      e += y * y;
    }
    sum += e / ch.length;
  }
  return -0.691 + 10 * Math.log10(sum);
}

// ---------------------------------------------------------------------------------------------- voices

/** A noise sweep: band-pass noise whose centre moves exponentially from f0 to f1 under a peaked envelope. */
function sweep({dur, peakAt, f0, f1, q, curve = 1, seed, attackPow = 2.2, tailTo = 1 / 400, panFrom = 0.12, panTo = 0.88}) {
  const s = stereo(dur);
  const n = s.l.length;
  const rand = rng(seed);
  const bands = [0, 1].map(() => [new Biquad(), new Biquad()]);
  const k = Math.log(1 / tailTo) / (dur - peakAt);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = (t / dur) ** curve;
    const env = t < peakAt ? (t / peakAt) ** attackPow : Math.exp(-(t - peakAt) * k);
    const theta = ((panFrom + (panTo - panFrom) * (t / dur)) * Math.PI) / 2;
    if (i % 24 === 0) {
      const fc = f0 * (f1 / f0) ** p;
      for (const [main, low] of bands) {
        main.bandpass(fc, q);
        low.bandpass(fc * 0.5, q * 0.8);
      }
    }
    // Independent noise per side keeps the whoosh wide instead of a mono blob in the middle.
    const nl = rand() * 2 - 1;
    const nr = rand() * 2 - 1;
    const [ml, ll] = bands[0];
    const [mr, lr] = bands[1];
    s.l[i] = (ml.process(nl) + 0.55 * ll.process(nl)) * env * Math.cos(theta);
    s.r[i] = (mr.process(nr) + 0.55 * lr.process(nr)) * env * Math.sin(theta);
  }
  return s;
}

/** Sine with an optional pitch glide and a two-part envelope, added into a mono buffer. */
function tone(buf, {at = 0, dur, f, glide = 0, glideTau = 0.02, amp = 1, attack = 0.002, decay, h2 = 0, h3 = 0, tri = 0}) {
  const start = Math.round(at * SR);
  const n = Math.min(Math.round(dur * SR), buf.length - start);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fr = f * (1 + glide * Math.exp(-t / glideTau));
    ph += (TAU * fr) / SR;
    const env = smooth(t / attack) * Math.exp(-t / decay);
    let y = Math.sin(ph) + h2 * Math.sin(2 * ph) + h3 * Math.sin(3 * ph);
    if (tri) y += tri * ((2 / Math.PI) * Math.asin(Math.sin(ph * 2)));
    buf[start + i] += y * env * amp;
  }
}

/** Two-operator FM bell/electric-piano voice: bright for a moment, then it settles to a soft sine. */
function fmNote(s, at, wrap, {freq, dur, amp = 0.3, ratio = 2, index = 1.6, indexTau = 0.14, decay = 0.6, pan = 0.5, attack = 0.004}) {
  const n = Math.round(dur * SR);
  const v = stereo(dur);
  let ph = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * freq) / SR;
    pm += (TAU * freq * ratio) / SR;
    const y = Math.sin(ph + index * Math.exp(-t / indexTau) * Math.sin(pm)) * smooth(t / attack) * Math.exp(-t / decay) * smooth((dur - t) / 0.05);
    v.l[i] = y * amp;
    v.r[i] = y * amp;
  }
  const th = (pan * Math.PI) / 2;
  addWrapped(s, v, Math.round(at * SR), wrap, Math.cos(th) * Math.SQRT2, Math.sin(th) * Math.SQRT2);
}

/** A held pad voice: three slightly detuned saw-ish oscillators, band-limited by summing harmonics. */
function padNote(s, at, {freq, dur, amp = 0.2, attack = 1.2, release = 1.6, bright = 1000, spread = 0.5, drift = 0}) {
  const total = dur + release;
  const n = Math.round(total * SR);
  const v = stereo(total);
  const detunes = [-0.0045, 0, 0.0045];
  const phases = detunes.map(() => 0);
  const harmonics = Math.max(2, Math.min(14, Math.floor(bright / freq)));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = smooth(t / attack) * (t < dur ? 1 : smooth((total - t) / release));
    const lfo = 1 + drift * Math.sin((TAU * t) / 9 + freq);
    let l = 0;
    let r = 0;
    for (let d = 0; d < 3; d++) {
      phases[d] += (TAU * freq * (1 + detunes[d])) / SR;
      let y = 0;
      for (let k = 1; k <= harmonics; k++) y += Math.sin(k * phases[d]) / (k * k ** 0.35);
      // Side voices lean left and right; the middle voice sits in both.
      const g = d === 0 ? [1, 1 - spread] : d === 2 ? [1 - spread, 1] : [0.8, 0.8];
      l += y * g[0];
      r += y * g[1];
    }
    v.l[i] = l * env * amp * lfo;
    v.r[i] = r * env * amp * lfo;
  }
  addWrapped(s, v, Math.round(at * SR), true);
}

/** A soft plucked bass: sine plus a filtered second harmonic. */
function bassNote(s, at, {freq, dur, amp = 0.4, decay = 0.25}) {
  const v = stereo(dur);
  let ph = 0;
  for (let i = 0; i < v.l.length; i++) {
    const t = i / SR;
    ph += (TAU * freq) / SR;
    const y = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) * Math.exp(-t / 0.08) + 0.12 * Math.sin(3 * ph) * Math.exp(-t / 0.05)) * smooth(t / 0.008) * Math.exp(-t / decay) * smooth((dur - t) / 0.03);
    v.l[i] = y * amp;
    v.r[i] = y * amp;
  }
  addWrapped(s, v, Math.round(at * SR), true);
}

function kickAt(s, at, amp = 0.5) {
  const v = stereo(0.3);
  let ph = 0;
  for (let i = 0; i < v.l.length; i++) {
    const t = i / SR;
    ph += (TAU * (46 + 90 * Math.exp(-t / 0.035))) / SR;
    const y = Math.sin(ph) * smooth(t / 0.002) * Math.exp(-t / 0.09);
    v.l[i] = v.r[i] = y * amp;
  }
  addWrapped(s, v, Math.round(at * SR), true);
}

function hatAt(s, at, rand, amp = 0.05, pan = 0.5) {
  const len = Math.round(0.05 * SR);
  const v = stereo(0.05);
  const hp = new Biquad();
  hp.highpass(7000);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const y = hp.process(rand() * 2 - 1) * Math.exp(-t / 0.011) * amp;
    v.l[i] = y;
    v.r[i] = y;
  }
  const th = (pan * Math.PI) / 2;
  addWrapped(s, v, Math.round(at * SR), true, Math.cos(th) * Math.SQRT2, Math.sin(th) * Math.SQRT2);
}

// ---------------------------------------------------------------------------------------------- effects

/**
 * Every sound effect: a builder, whether it is mono (the file is half the size), and `peak`, the second at which
 * the sound reaches its loudest. The engine aligns that moment with the picture.
 */
const SFX = {
  'whoosh-soft': {
    peak: 0.28,
    build: () => {
      const s = sweep({dur: 0.7, peakAt: 0.28, f0: 700, f1: 4200, q: 1.5, seed: 11});
      reverb(s, {mix: 0.14, decay: 0.55, damp: 0.5});
      return s;
    },
  },
  'whoosh-long': {
    peak: 0.64,
    build: () => {
      const s = sweep({dur: 1.6, peakAt: 0.64, f0: 220, f1: 3200, q: 0.95, curve: 0.85, seed: 29, attackPow: 2.6, panFrom: 0.08, panTo: 0.92});
      // A low, slow body under the air so the long flight feels like distance rather than a hiss.
      const body = stereo(1.6);
      for (let i = 0; i < body.l.length; i++) {
        const t = i / SR;
        const env = t < 0.64 ? (t / 0.64) ** 2.4 : Math.exp(-(t - 0.64) * 4.6);
        const f = 70 + 90 * (t / 1.6);
        body.l[i] = body.r[i] = Math.sin(TAU * f * t) * env * 0.1;
      }
      addWrapped(s, body, 0, false);
      reverb(s, {mix: 0.2, decay: 0.62, damp: 0.5});
      return s;
    },
  },
  tick: {
    peak: 0.003,
    mono: true,
    build: () => {
      const m = new Float32Array(Math.round(0.26 * SR));
      tone(m, {dur: 0.26, f: 1250, glide: 0.18, glideTau: 0.006, decay: 0.032, attack: 0.0008, h2: 0.18});
      tone(m, {dur: 0.26, f: 2500, decay: 0.014, attack: 0.0008, amp: 0.22, tri: 0.5});
      const rand = rng(5);
      const click = new Float32Array(m.length);
      for (let i = 0; i < 90; i++) click[i] = (rand() * 2 - 1) * Math.exp(-i / 22);
      filterStatic(click, 'lowpass', 5200, 0.7);
      for (let i = 0; i < m.length; i++) m[i] += click[i] * 0.3;
      const s = {l: m, r: Float32Array.from(m)};
      reverb(s, {mix: 0.1, decay: 0.45, damp: 0.5, preDelayMs: 4});
      return s;
    },
  },
  ring: {
    peak: 0.06,
    build: () => {
      const m = new Float32Array(Math.round(1.0 * SR));
      tone(m, {dur: 1.0, f: hz(N.D5), glide: 0.015, glideTau: 0.12, decay: 0.26, attack: 0.04, amp: 1, h2: 0.12});
      tone(m, {dur: 1.0, f: hz(N.A5), decay: 0.17, attack: 0.05, amp: 0.34});
      tone(m, {dur: 1.0, f: hz(N.D4), decay: 0.3, attack: 0.05, amp: 0.3});
      const s = {l: m, r: Float32Array.from(m)};
      reverb(s, {mix: 0.34, decay: 0.7, damp: 0.4});
      return s;
    },
  },
  pop: {
    peak: 0.004,
    mono: true,
    build: () => {
      const m = new Float32Array(Math.round(0.2 * SR));
      tone(m, {dur: 0.2, f: 520, glide: 1, glideTau: 0.018, decay: 0.05, attack: 0.002, h2: 0.1});
      const s = {l: m, r: Float32Array.from(m)};
      reverb(s, {mix: 0.06, decay: 0.4, damp: 0.5, preDelayMs: 3});
      return s;
    },
  },
  swap: {
    peak: 0.003,
    mono: true,
    build: () => {
      const m = new Float32Array(Math.round(0.3 * SR));
      tone(m, {at: 0, dur: 0.3, f: hz(N.A5), decay: 0.022, attack: 0.001, amp: 0.7, h2: 0.15});
      tone(m, {at: 0.065, dur: 0.235, f: hz(N.D6), decay: 0.03, attack: 0.001, amp: 1, h2: 0.12});
      const s = {l: m, r: Float32Array.from(m)};
      reverb(s, {mix: 0.1, decay: 0.45, damp: 0.5, preDelayMs: 4});
      return s;
    },
  },
  chime: {
    peak: 0.01,
    build: () => {
      const s = stereo(2.2);
      const notes = [N.D5, N['F#5'], N.A5, N.D6];
      notes.forEach((note, i) => {
        const at = i * 0.075;
        const f = hz(note);
        const v = new Float32Array(Math.round((2.2 - at) * SR));
        tone(v, {dur: 2.2 - at, f, decay: 0.8, attack: 0.003, amp: 1, h2: 0.22});
        tone(v, {dur: 2.2 - at, f: f * 2.76, decay: 0.16, attack: 0.002, amp: 0.1});
        const pan = 0.35 + 0.1 * i;
        const th = (pan * Math.PI) / 2;
        for (let j = 0; j < v.length; j++) {
          s.l[Math.round(at * SR) + j] += v[j] * Math.cos(th) * 0.8;
          s.r[Math.round(at * SR) + j] += v[j] * Math.sin(th) * 0.8;
        }
      });
      reverb(s, {mix: 0.4, decay: 0.78, damp: 0.4});
      return s;
    },
  },
  riser: {
    peak: 1.12,
    build: () => {
      const dur = 1.2;
      const s = stereo(dur);
      const rand = rng(41);
      const bp = [new Biquad(), new Biquad()];
      for (let i = 0; i < s.l.length; i++) {
        const t = i / SR;
        const p = t / dur;
        const env = p ** 2.4 * smooth((dur - t) / 0.08);
        if (i % 24 === 0) for (const b of bp) b.bandpass(500 * (7000 / 500) ** p, 1.4);
        const tn = Math.sin(TAU * (190 * t + (460 * t * t) / (2 * dur)));
        s.l[i] = (bp[0].process(rand() * 2 - 1) * 0.9 + tn * 0.22) * env;
        s.r[i] = (bp[1].process(rand() * 2 - 1) * 0.9 + tn * 0.22) * env;
      }
      reverb(s, {mix: 0.16, decay: 0.55, damp: 0.5});
      return s;
    },
  },
};

// ---------------------------------------------------------------------------------------------- beds

const BEDS = {};

/** Calm: warm pad on a slow four-chord loop, a few soft plucks drifting over it. 60 bpm, 8 bars, 32 s. */
BEDS.calm = {
  seconds: 32,
  build: () => {
    const bpm = 60;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const total = bar * 8;
    const s = stereo(total);
    const rand = rng(101);
    const chords = [
      [N.D3, N.A3, N['C#4'], N['F#4']], // Dmaj7
      [N.B2, N['F#3'], N.A3, N.D4], // Bm7
      [N.G3, N.D4, N['F#4'], N.B4], // Gmaj7 (voiced high so the move is smooth)
      [N.A2, N.E3, N.G3, N['C#4']], // A7
    ];
    const roots = [N.D2, N.B2 - 12, N.G2, N.A2 - 12];
    chords.forEach((chord, c) => {
      const at = c * 2 * bar - 0.4;
      chord.forEach((note, v) => padNote(s, at < 0 ? at + total : at, {freq: hz(note), dur: 2 * bar + 0.8, amp: 0.085, attack: 1.4, release: 1.8, bright: 900, spread: 0.6, drift: 0.12 + v * 0.01}));
      padNote(s, at < 0 ? at + total : at, {freq: hz(roots[c] + 12), dur: 2 * bar + 0.8, amp: 0.1, attack: 1.2, release: 1.8, bright: 300});
    });
    // Arpeggio on the upper chord tones, eighth notes with a few rests so it never sounds mechanical.
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    const high = chords.map((ch) => ch.map((n) => n + 12));
    for (let b = 0; b < 8; b++) {
      const chord = high[Math.floor(b / 2)];
      for (let e = 0; e < 8; e++) {
        if (rand() < 0.28) continue;
        const note = chord[pattern[e] % chord.length];
        const accent = e % 4 === 0 ? 1 : 0.65;
        fmNote(s, b * bar + e * beat * 0.5, true, {freq: hz(note), dur: 1.4, amp: 0.1 * accent, index: 1.1, decay: 0.45, pan: 0.25 + 0.5 * rand()});
      }
    }
    // A slow top line: one note every two beats on the first half of each chord.
    const melody = [N['F#5'], N.A5, N.E5, N.D5, N.B4, N['F#5'], N.A5, N.E5];
    melody.forEach((note, i) => fmNote(s, i * bar + (i % 2 ? beat * 1.5 : 0), true, {freq: hz(note), dur: 3, amp: 0.11, ratio: 3, index: 0.9, indexTau: 0.25, decay: 1.1, pan: 0.5}));
    loopSafe(s, (t) => {
      pingPong(t, {seconds: beat * 0.75, feedback: 0.42, mix: 0.32, tone: 3000});
      reverb(t, {mix: 0.38, decay: 0.84, damp: 0.42, preDelayMs: 18});
    });
    return s;
  },
};

/** Driven: steady pulse for product-launch pace. 120 bpm, 16 bars, 32 s. */
BEDS.driven = {
  seconds: 32,
  build: () => {
    const bpm = 120;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const total = bar * 16;
    const s = stereo(total);
    const rand = rng(202);
    const chords = [
      {pad: [N.B3, N.D4, N['F#4']], bass: N.B2 - 12 + 12, arp: [N.B4, N['F#5'], N.D5, N['F#5']]}, // Bm
      {pad: [N.B3, N.D4, N.G4], bass: N.G2, arp: [N.D5, N.B4, N.G4, N.B4]}, // G
      {pad: [N.A3, N.D4, N['F#4']], bass: N.D2 + 12, arp: [N['F#4'], N.A4, N.D5, N.A4]}, // D
      {pad: [N['C#4'], N.E4, N.A4], bass: N.A2, arp: [N['C#5'], N.E5, N.A4, N.E5]}, // A
    ];
    for (let c = 0; c < 8; c++) {
      const ch = chords[c % 4];
      const at = c * 2 * bar;
      ch.pad.forEach((note) => padNote(s, at, {freq: hz(note), dur: 2 * bar - 0.1, amp: 0.05, attack: 0.25, release: 0.5, bright: 1400, spread: 0.55}));
      for (let e = 0; e < 16; e++) {
        // Offbeat eighths, pushed a touch: the bass breathes with the kick instead of sitting on it.
        if (e % 2 === 1) bassNote(s, at + e * beat * 0.5, {freq: hz(ch.bass), dur: beat * 0.45, amp: 0.27, decay: 0.2});
      }
      // Sixteenth arpeggio, quieter on the weak steps.
      for (let st = 0; st < 32; st++) {
        const accent = st % 4 === 0 ? 1 : st % 2 === 0 ? 0.6 : 0.38;
        if (rand() < 0.18 && st % 4 !== 0) continue;
        fmNote(s, at + st * beat * 0.25, true, {freq: hz(ch.arp[st % 4]), dur: 0.5, amp: 0.085 * accent, index: 1.5, indexTau: 0.06, decay: 0.16, pan: st % 2 ? 0.7 : 0.3});
      }
    }
    for (let b = 0; b < 16; b++) {
      for (let q = 0; q < 4; q++) {
        kickAt(s, b * bar + q * beat, q % 2 === 0 ? 0.42 : 0.3);
        hatAt(s, b * bar + q * beat + beat * 0.5, rand, 0.045, 0.62);
      }
    }
    // Second pass: a lead line over the repeat.
    const lead = [N['F#5'], N.D5, N.B4, N['F#5'], N.G4 + 12, N.D5, N.B4, N.G4, N.A5, N['F#5'], N.D5, N.A4, N['C#5'], N.E5, N.A5, N.E5];
    lead.forEach((note, i) => fmNote(s, 8 * bar + i * bar * 0.5 + (i % 4 === 3 ? beat * 0.5 : 0), true, {freq: hz(note), dur: 1.2, amp: 0.1, ratio: 3, index: 0.8, indexTau: 0.2, decay: 0.7, pan: 0.5}));
    loopSafe(s, (t) => {
      pingPong(t, {seconds: beat * 0.75, feedback: 0.34, mix: 0.22, tone: 3500});
      reverb(t, {mix: 0.2, decay: 0.7, damp: 0.5, preDelayMs: 10});
    });
    return s;
  },
};

/** Minimal: a quiet drone and a few bell notes with long gaps. 80 bpm, 12 bars, 36 s. */
BEDS.minimal = {
  seconds: 36,
  build: () => {
    const bpm = 80;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const total = bar * 12;
    const s = stereo(total);
    const rand = rng(303);
    // Two long swells of D and A, each spanning six bars.
    for (let h = 0; h < 2; h++) {
      const at = h * 6 * bar - 0.5;
      const start = at < 0 ? at + total : at;
      [N.D3, N.A3, N.E4].forEach((note, i) => padNote(s, start, {freq: hz(note), dur: 6 * bar + 1, amp: 0.06, attack: 2.6, release: 2.8, bright: 700, spread: 0.5, drift: 0.1 + i * 0.02}));
      padNote(s, start, {freq: hz(N.D2), dur: 6 * bar + 1, amp: 0.12, attack: 2.4, release: 2.8, bright: 200});
    }
    const scale = [N.D5, N.E5, N['F#5'], N.A5, N.B5, N.A4, N['F#5']];
    let last = -1;
    for (let b = 0; b < 12; b++) {
      const count = b % 3 === 2 ? 1 : 2;
      for (let k = 0; k < count; k++) {
        let idx;
        do idx = Math.floor(rand() * scale.length);
        while (idx === last);
        last = idx;
        fmNote(s, b * bar + (k === 0 ? 0 : beat * (2 + Math.floor(rand() * 2))), true, {freq: hz(scale[idx]), dur: 3.5, amp: 0.15, ratio: 3.5, index: 0.7, indexTau: 0.3, decay: 1.4, pan: 0.2 + 0.6 * rand()});
      }
    }
    loopSafe(s, (t) => {
      pingPong(t, {seconds: beat * 1.5, feedback: 0.45, mix: 0.25, tone: 2600});
      reverb(t, {mix: 0.45, decay: 0.86, damp: 0.45, preDelayMs: 22});
    });
    return s;
  },
};

// ---------------------------------------------------------------------------------------------- output

function wavBytes(s, mono) {
  const channels = mono ? 1 : 2;
  const n = s.l.length;
  const data = Buffer.alloc(n * channels * 2);
  const dither = rng(7);
  const q = (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32767 + (dither() - dither()) * 0.5)));
  for (let i = 0; i < n; i++) {
    if (mono) data.writeInt16LE(q(s.l[i]), i * 2);
    else {
      data.writeInt16LE(q(s.l[i]), i * 4);
      data.writeInt16LE(q(s.r[i]), i * 4 + 2);
    }
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(channels, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * channels * 2, 28);
  head.writeUInt16LE(channels * 2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/** Remotion's own ffmpeg when installed, else one on PATH, else null (beds are then written as WAV). */
function findFfmpeg() {
  const candidates = [];
  try {
    const require = createRequire(join(root, 'package.json'));
    const pkg = require.resolve(`@remotion/compositor-${process.platform}-${process.arch}-gnu/package.json`);
    candidates.push(join(dirname(pkg), 'ffmpeg'));
  } catch {
    // Not installed for this platform: fall through to PATH.
  }
  candidates.push('ffmpeg');
  for (const bin of candidates) {
    try {
      const out = execFileSync(bin, ['-hide_banner', '-encoders'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
      if (out.includes('libmp3lame')) return bin;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

const manifest = {note: 'Written by scripts/make-audio.mjs. Do not edit by hand.', sfx: {}, music: {}};
const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

for (const [name, def] of Object.entries(SFX)) {
  const s = def.build();
  fadeEdges(s, 0.4, 40);
  scale(s, db(SFX_PEAK_DB) / peakOf(s));
  const file = join(sfxDir, `${name}.wav`);
  writeFileSync(file, wavBytes(s, Boolean(def.mono)));
  manifest.sfx[name] = {file: `audio/sfx/${name}.wav`, seconds: +(s.l.length / SR).toFixed(4), peak: def.peak};
  console.log(`sfx   ${name.padEnd(12)} ${(s.l.length / SR).toFixed(2)} s  ${kb(file)}`);
}

const ffmpeg = findFfmpeg();
if (!ffmpeg) console.warn('No ffmpeg with MP3 support found: music beds are written as WAV (about 5 MB each).');
for (const [name, def] of Object.entries(BEDS)) {
  const s = def.build();
  const n = s.l.length;
  if (Math.abs(n / SR - def.seconds) > 1e-6) throw new Error(`${name}: expected ${def.seconds} s, built ${n / SR} s`);
  // Bring the bed to the loudness target, then hold its peaks under the ceiling with the limiter.
  scale(s, db(BED_LUFS - lufs(s)));
  loopSafe(s, (t) => limit(t, db(BED_PEAK_DB)));
  scale(s, db(BED_PEAK_DB) / peakOf(s));
  const wav = join(musicDir, `${name}.wav`);
  const mp3 = join(musicDir, `${name}.mp3`);
  writeFileSync(wav, wavBytes(s, false));
  let ext = 'wav';
  if (ffmpeg) {
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', `${MP3_KBPS}k`, '-ar', String(SR), '-map_metadata', '-1', '-id3v2_version', '0', mp3]);
    rmSync(wav);
    ext = 'mp3';
  } else if (existsSync(mp3)) rmSync(mp3);
  const out = join(musicDir, `${name}.${ext}`);
  manifest.music[name] = {file: `audio/music/${name}.${ext}`, seconds: def.seconds};
  console.log(`music ${name.padEnd(12)} ${def.seconds} s  ${kb(out)}  (${lufs(s).toFixed(1)} LUFS, peak ${(20 * Math.log10(peakOf(s))).toFixed(1)} dBFS before encoding)`);
}

writeFileSync(join(root, 'src/engine/audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('wrote src/engine/audio-manifest.json');

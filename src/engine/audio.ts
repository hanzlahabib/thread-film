import {interpolate} from 'remotion';
import manifest from './audio-manifest.json';
import {LABEL_DELAY} from './labels';
import {FPS, type Model} from './model';
import type {AudioMood, CueName, FilmProps} from './types';

/** Level of the music bed while nothing is spoken, and of the sound effects, both as Remotion volume (0..1). */
export const DEFAULT_MUSIC_VOLUME = 0.5;
export const DEFAULT_SFX_VOLUME = 0.9;
export const DEFAULT_MOOD: AudioMood = 'calm';

/** The whoosh of a flight peaks this far through the flight: the line has left fast and is still travelling. */
const WHOOSH_PEAK_AT = 0.4;
/** A hop inside a screen shorter than this (world pixels) only ticks; a whoosh on a nudge would be noise. */
const MIN_WHOOSH_DISTANCE = 220;
/** Frames after the head lands that the chip's swap tick plays: the chip is turning into the element. */
const SWAP_AFTER = 3;
/** The riser peaks this many frames into the closing pull-back, when the camera is moving fastest. */
const RISER_PEAK_AFTER = 14;

/** Music fades in over this many frames and out over the last FADE_OUT frames (the end card). */
const FADE_IN = 20;
const FADE_OUT = 45;

/** While narration plays the bed drops to this share of its level; a few frames of ramp keep it from pumping. */
const NARRATION_DUCK = 0.35;
const NARRATION_PAD = 6;
/** Under a big effect the bed dips less, and for as long as most of the effect lasts. */
const BIG_SFX_DUCK = 0.72;
const BIG_SFX_SHARE = 0.8;
const DUCK_ATTACK = 6;
const DUCK_RELEASE = 14;
/** Effects are also pulled down while a line is spoken, so they never compete with the voice. */
const SFX_UNDER_VOICE = 0.6;

type CueSpec = {
  /** Key in the manifest's `sfx` table. */
  sfx: keyof typeof manifest.sfx;
  /** Level relative to the film's sfx volume. */
  gain: number;
  /** Frames the sound starts before the picture's hit, for sounds with a soft attack. */
  lead: number;
  /** Big effects dip the music while they play. */
  big: boolean;
};

/**
 * The cue table. One row per CueName; the schedule decides when each fires (see buildCues and rules/sound.md).
 * Gains sit below 1 because every file is normalised to -3 dBFS and the film's sfx volume is applied on top.
 */
export const CUES: Record<CueName, CueSpec> = {
  whoosh: {sfx: 'whoosh-soft', gain: 0.8, lead: 0, big: false},
  whooshLong: {sfx: 'whoosh-long', gain: 1, lead: 0, big: true},
  tick: {sfx: 'tick', gain: 0.9, lead: 0, big: false},
  ring: {sfx: 'ring', gain: 0.55, lead: 1, big: false},
  pop: {sfx: 'pop', gain: 0.6, lead: 1, big: false},
  swap: {sfx: 'swap', gain: 0.7, lead: 0, big: false},
  chime: {sfx: 'chime', gain: 0.9, lead: 2, big: true},
  riser: {sfx: 'riser', gain: 0.7, lead: 0, big: true},
};

export type Cue = {name: CueName; /** Film frame the file starts on. */ frame: number; file: string; volume: number; /** Length of the built-in file in frames; 0 for a replacement file. */ frames: number; big: boolean};

export type Music = {file: string; volume: number; /** Length of one pass of the file in seconds, when known; the bed loops on it. */ seconds: number | null};

export type Soundtrack = {cues: Cue[]; music: Music | null; /** Multiplier (0..1) for the music at a film frame. */ duck: (frame: number) => number};

const isMood = (value: string): value is AudioMood => Object.hasOwn(manifest.music, value);

/** Mood for the film: the journey's own `audio.music` when it names one, else the theme's, else calm. */
export function moodOf(props: FilmProps): AudioMood {
  const chosen = props.journey.audio?.music;
  if (typeof chosen === 'string' && isMood(chosen)) return chosen;
  return props.theme.audio?.mood ?? DEFAULT_MOOD;
}

/** A music file that is not one of the built-in beds, which the film has to measure to loop it. */
export function customMusicFile(props: FilmProps): string | null {
  const chosen = props.journey.audio?.music;
  if (typeof chosen === 'string' && !isMood(chosen)) return chosen;
  if (chosen === undefined && props.journey.music) return props.journey.music.file;
  return null;
}

export function resolveMusic(props: FilmProps, measured: Record<string, number>): Music | null {
  const {audio, music: legacy} = props.journey;
  const chosen = audio?.music;
  if (chosen === false) return null;
  const volume = audio?.musicVolume ?? (chosen === undefined && legacy ? legacy.volume : DEFAULT_MUSIC_VOLUME);
  const custom = customMusicFile(props);
  if (custom) return {file: custom, volume, seconds: measured[custom] ?? null};
  const bed = manifest.music[moodOf(props)];
  return {file: bed.file, volume, seconds: bed.seconds};
}

type Range = {from: number; to: number; depth: number};

/** Gain curve for a set of ducked ranges: ramps down before a range, holds, ramps back up after it. */
function duckCurve(ranges: Range[]): (frame: number) => number {
  return (frame) =>
    ranges.reduce((gain, r) => {
      const dip = interpolate(frame, [r.from - DUCK_ATTACK, r.from, r.to, r.to + DUCK_RELEASE], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      return Math.min(gain, 1 - (1 - r.depth) * dip);
    }, 1);
}

/**
 * Every sound of the film, derived from the schedule. Nothing here is per stop: the model already knows when
 * the head leaves and lands and when rings, labels and the end card appear, so the cues follow from it.
 * `journeyStart` and `endStart` are film frames (the hook card shifts the journey; the end card follows it).
 */
export function buildSoundtrack(props: FilmProps, model: Model, journeyStart: number, endStart: number, total: number, measured: Record<string, number>): Soundtrack {
  const options = props.journey.audio;
  const music = resolveMusic(props, measured);
  const sfx = options?.sfx ?? true;
  const sfxOn = sfx !== false;
  const sfxVolume = typeof sfx === 'object' ? sfx.volume ?? DEFAULT_SFX_VOLUME : DEFAULT_SFX_VOLUME;
  const overrides = typeof sfx === 'object' ? sfx.overrides ?? {} : {};

  const voice: Range[] = model.narration.map((n) => ({from: journeyStart + n.frame - NARRATION_PAD, to: journeyStart + n.frame + n.frames + NARRATION_PAD, depth: NARRATION_DUCK}));
  const underVoice = (frame: number) => voice.some((r) => frame >= r.from && frame <= r.to);

  const cues: Cue[] = [];
  const add = (name: CueName, hit: number) => {
    const spec = CUES[name];
    const override = overrides[name];
    if (override === false) return;
    const built = manifest.sfx[spec.sfx];
    const frame = Math.round(hit - spec.lead);
    if (frame < 0 || frame >= total) return;
    const file = override ?? built.file;
    cues.push({name, frame, file, volume: Math.min(1, sfxVolume * spec.gain * (underVoice(frame) ? SFX_UNDER_VOICE : 1)), frames: override ? 0 : Math.ceil(built.seconds * FPS), big: spec.big});
  };
  /** A sound whose loudest moment (`peak` seconds in) lands on film frame `at`. */
  const addPeaking = (name: CueName, at: number) => {
    const peakFrames = Math.round(manifest.sfx[CUES[name].sfx].peak * FPS);
    add(name, at - peakFrames + CUES[name].lead);
  };

  if (sfxOn) {
    model.stops.forEach((stop, i) => {
      const depart = journeyStart + stop.depart;
      const arrive = journeyStart + stop.arrive;
      const distance = stop.s - (i > 0 ? model.stops[i - 1].s : 0);
      if (stop.flight) addPeaking('whooshLong', depart + WHOOSH_PEAK_AT * (arrive - depart));
      else if (distance >= MIN_WHOOSH_DISTANCE) addPeaking('whoosh', depart + WHOOSH_PEAK_AT * (arrive - depart));
      add('tick', arrive);
      if (stop.ring) add('ring', arrive);
      add('pop', arrive + LABEL_DELAY);
      if (stop.carry) add('swap', arrive + SWAP_AFTER);
    });
    addPeaking('riser', journeyStart + model.overviewStart + RISER_PEAK_AFTER);
    add('chime', endStart);
    cues.sort((a, b) => a.frame - b.frame);
  }

  const big: Range[] = cues.filter((c) => c.big).map((c) => ({from: c.frame, to: c.frame + Math.round((c.frames || 60) * BIG_SFX_SHARE), depth: BIG_SFX_DUCK}));
  const duck = options?.duck === false ? () => 1 : duckCurve([...voice, ...big]);
  return {cues, music, duck};
}

/** Volume of the music at a film frame: its level, the ducking, a short fade-in and a fade-out over the end card. */
export function musicGain(sound: Soundtrack, frame: number, total: number): number {
  const fade = interpolate(frame, [0, FADE_IN, total - FADE_OUT, total - 4], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (sound.music?.volume ?? 0) * sound.duck(frame) * fade;
}

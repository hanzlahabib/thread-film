import type {Pt, Rect, Vertex} from './geometry';
import type {FrameKind} from './theme';

/** Default width of a capture in capture pixels. All local coordinates are pixels of a capture this wide, unless the screen sets `width`. */
export const CAPTURE_W = 1920;

/** A capture path under public/, or one per mode when the product has both and the film ships both themes. */
export type ByMode<T> = T | {dark: T; light: T};

/** A smooth run through several points (for example along a chart line). */
export type Through = {through: Pt[]; /** Mark at the first point of the run. */ startMark?: string; /** Mark at its last point. */ mark?: string};

export type RoutePoint = Vertex | Through;

export type Screen = {
  id: string;
  /** Short name shown in the corner while the line is on this screen. */
  kicker: string;
  /** Caption shown on a card while the line flies in. The first screen has none: the hook card and the screen's HUD pill introduce it. */
  title: string[];
  capture: ByMode<string>;
  /** Capture height in capture pixels. */
  height: number;
  /**
   * Capture width in capture pixels. Default 1920 (CAPTURE_W). A phone screen is its CSS size, for example 390
   * for a capture taken at 390x844 and scale 3 (the PNG may be a whole multiple of this).
   */
  width?: number;
  /** Text of the address bar (browser frame only). Use the product's real public URL. */
  url: string;
  /** Overrides the theme's frame for this screen: a phone screen inside a web film, or a whole mobile film. */
  frame?: FrameKind;
  /** Camera cut-out on a phone or tablet bezel: a pill ('island', the phone default), a 'punch' hole (the tablet default) or 'none'. */
  notch?: 'island' | 'punch' | 'none';
  /**
   * Rectangles of the capture's text, in capture pixels (anchors.json lists them when the screen is rendered
   * by scripts/render-screens.mjs). Labels are placed where they cover the least of it.
   */
  text?: Rect[];
  /** Where the capture's top-left corner sits in the world. Ignored when the journey has `layout: 'auto'`. */
  origin: Pt;
  /**
   * The line's route across this screen, in capture pixels. The first point is where it enters (on or outside
   * an edge), the last where it leaves. Flights between screens are generated from the directions of the last
   * segment of one screen and the first segment of the next.
   */
  route: RoutePoint[];
  /** Optional narration clip under public/, played while the line is on this screen. */
  narration?: string;
};

export type ZoomHint = 'wide' | 'medium' | 'tight';

export type LabelDir = 'up' | 'down' | 'left' | 'right';

/** Built-in chip icons, or two letters shown as initials. */
export type ChipIcon = 'plus' | 'box' | 'receipt' | 'card' | 'mail' | 'reply' | 'user' | 'chart' | {initials: string};

export type Chip = {icon: ChipIcon; text: string};

export type Count = {to: number; prefix?: string; suffix?: string; decimals?: number};

export type Tick = {mark: string; /** Capture point that pulses when the head passes. */ at: Pt};

export type Stop = {
  /** Must equal a `mark` on the screen's route: that is where the line lands. */
  id: string;
  screen: string;
  /** Short branch from the landing point to the element's edge, grown on arrival. */
  stub?: Pt;
  /** Outline of the element, pulsed on arrival. */
  ring?: Rect;
  label: string;
  /**
   * Where the label attaches and which way it grows. Optional on phone, tablet and text-annotated screens,
   * where the engine tries this placement first, then the other three sides, and keeps the one that covers
   * the least text. Always used as given on a screen without `text` in a browser frame.
   */
  labelAt?: Pt;
  labelDir?: LabelDir;
  /** Placement for vertical renders, where a side label would be pushed back over its element. */
  portraitLabel?: {at: Pt; dir: LabelDir};
  /** A number that counts up in front of the label. It should repeat a number the capture shows. */
  count?: Count;
  /**
   * Capture point the camera centres on. Default: the middle of the ring. On phone and tablet screens, and
   * wherever `zoom` is a hint, the camera frames the element and its surroundings instead (see ZoomHint).
   */
  look?: Pt;
  /**
   * Either a zoom in frame pixels per capture pixel, or a hint: 'wide' (the whole screen), 'medium' or 'tight'
   * (the element with at least 20% of the screen's width around it, and the top bar or bottom nav when it is
   * near them). A number on a phone or tablet is capped at the tight limit. Left out, the engine chooses from
   * the size of the element and varies the shots so that no three in a row are alike.
   */
  zoom?: number | ZoomHint;
  /** How long the stop lingers: 'key' rests about 1.6 times as long (the moment the film is about), 'light' about 0.75. */
  beat?: 'light' | 'normal' | 'key';
  /** Frames the line takes to get here from the previous stop. Default 20 inside a screen, 38 for a flight. */
  travel?: number;
  /** 'ramp' leaves fast and lands softly (default); 'glide' keeps an even pace past several elements. */
  pace?: 'ramp' | 'glide';
  /** Frames it rests here. Default 44. Stretched automatically when the screen has narration. */
  hold?: number;
  /** Object that rides the head of the line on the way here. Only on the first stop of a screen. */
  carry?: Chip;
  /** Elements passed on the way here. */
  ticks?: Tick[];
};

/** A cover over part of a capture that is pulled back by the head of the line (drawing a chart, for example). */
export type Reveal = {
  screen: string;
  rect: Rect;
  /** The capture's own surface colour under the cover. */
  color: ByMode<string>;
  /** Route marks where the uncovering starts and ends. */
  from: string;
  to: string;
};

export type Journey = {
  /**
   * 'manual' (default): every screen sits at its `origin`. 'auto': the engine arranges the screens for the
   * shape of the composition (row, column, grid or serpentine, whichever shows them largest) and joins the
   * routes: a route then runs from its first point to its last along the screen's margin lane, and the engine
   * adds the legs that leave and enter by the sides facing the neighbours (see rules/mobile.md).
   */
  layout?: 'manual' | 'auto';
  screens: Screen[];
  /** In the order the line reaches them. */
  stops: Stop[];
  reveals?: Reveal[];
  /** Opening wide shot of the first screen. */
  intro: {frames: number; narration?: string};
  /** Closing pull-back that shows the whole line. */
  outro: {
    lines: string[];
    /** Optional re-wrap of the closing words for 9:16, where shorter lines can be set larger. */
    portraitLines?: string[];
    frames: number;
  };
  /** Small standing line in the corner, for example a note that the data is demo data. */
  footnote?: string;
  /** Legacy music bed under public/. Still works; prefer `audio.music`. */
  music?: {file: string; volume: number};
  /** Sound: music bed, sound effects and ducking. Everything is on by default; see skill rules/sound.md. */
  audio?: AudioOptions;
};

/** How a film sounds. The theme's `audio.mood` picks the default bed so the sound follows the look. */
export type AudioMood = 'calm' | 'driven' | 'minimal';

/** Every sound effect the engine can cue from the schedule. */
export type CueName = 'whoosh' | 'whooshLong' | 'tick' | 'ring' | 'pop' | 'swap' | 'chime' | 'riser';

export type AudioOptions = {
  /** A built-in mood, a file under public/, or false for no music. Default: the theme's mood ('calm'). */
  music?: AudioMood | string | false;
  /** 0..1, default 0.5. It is the level while nothing is spoken; the bed ducks under narration. */
  musicVolume?: number;
  /** false turns every effect off. `volume` (0..1, default 0.5) scales them; `overrides` swaps or mutes single cues. */
  sfx?: boolean | {volume?: number; overrides?: Partial<Record<CueName, string | false>>};
  /** Lower the music under narration and under the big effects. Default true. */
  duck?: boolean;
};

/** What the end card says. Offer and call to action are props, never baked into the film. */
export type EndCard = {title: string; kicker?: string; cta: string; url?: string};

/** Opening card: a kinetic headline before the first screen. Optional; leave it out to open on the screen. */
export type Hook = {headline: string; sub?: string; /** Frames on screen. Default 90. */ frames?: number};

/**
 * Optional voiceover, from src/film/vo.json. Drop mp3 files in public/vo and list them: `intro` for the opening
 * wide shot, then one per screen id. `seconds` is optional; a clip without it is measured when the film loads.
 */
export type Vo = {
  intro?: {file: string; seconds?: number};
  screens?: Record<string, {file: string; seconds?: number}>;
};

export type FilmProps = {
  theme: import('./theme').Theme;
  journey: Journey;
  end: EndCard;
  hook?: Hook;
  vo?: Vo;
  /** Seconds per narration file, filled in at render time (see calculateFilmMetadata). */
  narrationSeconds?: Record<string, number>;
};

export function byMode<T>(value: ByMode<T>, mode: 'dark' | 'light'): T {
  return typeof value === 'object' && value !== null && 'dark' in value && 'light' in value ? (value as {dark: T; light: T})[mode] : (value as T);
}

/** Width of a screen's capture in capture pixels. */
export function screenWidth(screen: Screen): number {
  return screen.width ?? CAPTURE_W;
}

import {AbsoluteFill} from 'remotion';
import FadeText, {FADE_FRAMES} from './components/FadeText';
import {DISPLAY_GLYPH_EM, fitLines} from './fit';
import {useFrame} from './frame';
import type {Frame} from './model';
import {useTheme} from './theme';
import type {Hook} from './types';

/** Frames between one line of the headline starting and the next. */
const LINE_STAGGER = 5;
/** The first line starts this many frames in. */
const FIRST_LINE = 4;
/** The sub line starts this many frames after the first. */
const SUB_DELAY = 8;
/** A landscape headline that would need type below this share of the cap is wrapped onto two lines. */
const LANDSCAPE_MIN_SHARE = 0.6;

/** The headline as lines, and the size they are set at, for this frame. Portrait stacks at most two words to a line. */
export function hookLayout(headline: string, view: Frame): {lines: string[]; size: number} {
  const cap = view.portrait ? 150 : 132;
  const maxWidth = view.width - view.safe.side * 2;
  if (view.portrait) {
    const words = headline.split(/\s+/).filter(Boolean);
    const lines = words.reduce<string[]>((acc, w) => (acc.length && acc[acc.length - 1].split(' ').length < 2 ? [...acc.slice(0, -1), `${acc[acc.length - 1]} ${w}`] : [...acc, w]), []);
    return {lines, size: Math.min(cap, maxWidth / (Math.max(...lines.map((l) => l.length)) * DISPLAY_GLYPH_EM))};
  }
  return fitLines(headline, maxWidth, cap, 2, LANDSCAPE_MIN_SHARE);
}

/** Frame at which the last line of the headline is fully formed. */
export function hookFormedAt(lineCount: number): number {
  return FIRST_LINE + (lineCount - 1) * LINE_STAGGER + FADE_FRAMES;
}

// Opening card: one headline, no UI yet. Its words are props. Each line fades in and rises on the solid
// background (no clip mask, so no half-drawn line), and the whole headline is formed in under half a second.
export default function HookCard({headline, sub}: Hook) {
  const view = useFrame();
  const theme = useTheme();
  const {lines, size} = hookLayout(headline, view);
  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', color: theme.text}}>
      {lines.map((line, i) => (
        <FadeText key={line + i} startFrame={FIRST_LINE + i * LINE_STAGGER} style={{fontFamily: theme.fontDisplay, fontSize: size, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.06, whiteSpace: 'nowrap', textAlign: 'center'}}>
          {line}
        </FadeText>
      ))}
      {sub ? (
        <FadeText startFrame={FIRST_LINE + SUB_DELAY} style={{marginTop: 28, maxWidth: view.width - view.safe.side * 2, textAlign: 'center', fontFamily: theme.fontBody, fontSize: view.portrait ? 40 : 34, color: theme.textMuted}}>
          {sub}
        </FadeText>
      ) : null}
    </AbsoluteFill>
  );
}

import {AbsoluteFill} from 'remotion';
import FadeText from './components/FadeText';
import {fitLines} from './fit';
import {useFrame} from './frame';
import {useTheme} from './theme';
import type {EndCard as EndCardProps} from './types';

/** Frames between one element of the card starting and the next. */
const ELEMENT_STAGGER = 4;
/** The title wraps onto up to this many lines in portrait, where a single line would be set small; landscape keeps one line unless it must wrap. */
const PORTRAIT_LINES = 3;
const LANDSCAPE_LINES = 2;
/** Room taken by the card's side padding, in frame pixels. */
const SIDE_PAD = 80;
/** A title that would need type below this share of its cap is wrapped. */
const MIN_SHARE = 0.6;

// Closing card. Its words are props, so an offer or a call to action can change without touching the film.
// Every element fades in and rises on the solid background (no clip mask); the card is formed after about 20 frames.
export default function EndCard({title, kicker, cta, url}: EndCardProps) {
  const view = useFrame();
  const theme = useTheme();
  const {lines, size: titleSize} = fitLines(title, view.width - view.safe.side * 2 - SIDE_PAD, view.portrait ? 120 : 140, view.portrait ? PORTRAIT_LINES : LANDSCAPE_LINES, MIN_SHARE);
  const ctaSize = Math.min(44, (view.width - view.safe.side * 2 - 160) / (cta.length * 0.55));
  const at = (i: number) => 2 + i * ELEMENT_STAGGER;

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', color: theme.text}}>
      <FadeText startFrame={at(0)} style={{fontFamily: theme.fontDisplay, fontSize: titleSize, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, whiteSpace: 'nowrap', textAlign: 'center'}}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </FadeText>
      {kicker ? (
        <FadeText startFrame={at(1)} style={{marginTop: 16, fontFamily: theme.fontBody, fontSize: 26, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.textMuted}}>
          {kicker}
        </FadeText>
      ) : null}
      <FadeText
        startFrame={at(2)}
        style={{
          marginTop: 52,
          padding: `${ctaSize * 0.62}px ${ctaSize * 1.3}px`,
          borderRadius: Math.min(9999, theme.radius * 4),
          background: theme.accent,
          color: theme.accentContrast,
          fontFamily: theme.fontBody,
          fontSize: ctaSize,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {cta}
      </FadeText>
      {url ? (
        <FadeText startFrame={at(3)} style={{marginTop: 30, fontFamily: theme.fontBody, fontSize: 30, color: theme.textMuted}}>
          {url}
        </FadeText>
      ) : null}
    </AbsoluteFill>
  );
}

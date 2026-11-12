import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import MaskText from './components/MaskText';
import {useFrame} from './frame';
import {useTheme} from './theme';
import type {Hook} from './types';

// Share of the type's em a character is assumed to take, to size the headline so it never leaves the frame.
const GLYPH_EM = 0.56;

// Opening card: one kinetic headline, no UI yet. Its words are props.
export default function HookCard({headline, sub}: Hook) {
  const frame = useCurrentFrame();
  const view = useFrame();
  const theme = useTheme();
  const words = headline.split(/\s+/).filter(Boolean);
  // Portrait stacks the words in lines of at most two, so a long headline stays large.
  const lines = view.portrait ? words.reduce<string[]>((acc, w) => (acc.length && acc[acc.length - 1].split(' ').length < 2 ? [...acc.slice(0, -1), `${acc[acc.length - 1]} ${w}`] : [...acc, w]), []) : [headline];
  const widest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(view.portrait ? 150 : 132, (view.width - view.safe.side * 2) / (widest * GLYPH_EM));
  const fade = interpolate(frame, [18, 32], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', color: theme.text}}>
      {lines.map((line, i) => (
        <MaskText key={line + i} text={line} by="word" stagger={3} startFrame={4 + i * 5} style={{fontFamily: theme.fontDisplay, fontSize: size, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.06, whiteSpace: 'nowrap', textAlign: 'center'}} />
      ))}
      {sub ? <div style={{marginTop: 28, maxWidth: view.width - view.safe.side * 2, textAlign: 'center', fontFamily: theme.fontBody, fontSize: view.portrait ? 40 : 34, color: theme.textMuted, opacity: fade}}>{sub}</div> : null}
    </AbsoluteFill>
  );
}

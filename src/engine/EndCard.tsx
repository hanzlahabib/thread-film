import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import MaskText from './components/MaskText';
import {useFrame} from './frame';
import {useTheme} from './theme';
import type {EndCard as EndCardProps} from './types';

// Closing card. Its words are props, so an offer or a call to action can change without touching the film.
export default function EndCard({title, kicker, cta, url}: EndCardProps) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const view = useFrame();
  const theme = useTheme();
  const pill = spring({frame: frame - 18, fps, config: {damping: 13, stiffness: 160, mass: 0.8}});
  const fade = (from: number) => interpolate(frame, [from, from + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleSize = Math.min(view.portrait ? 120 : 140, (view.width - view.safe.side * 2 - 80) / (title.length * 0.56));
  const ctaSize = Math.min(44, (view.width - view.safe.side * 2 - 160) / (cta.length * 0.55));

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', color: theme.text}}>
      <MaskText text={title} by="letter" stagger={1.5} startFrame={2} style={{fontFamily: theme.fontDisplay, fontSize: titleSize, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, whiteSpace: 'nowrap'}} />
      {kicker ? <div style={{marginTop: 16, fontFamily: theme.fontBody, fontSize: 26, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.textMuted, opacity: fade(12)}}>{kicker}</div> : null}
      <div
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
          opacity: Math.min(1, pill * 1.5),
          transform: `scale(${0.7 + 0.3 * pill})`,
        }}
      >
        {cta}
      </div>
      {url ? <div style={{marginTop: 30, fontFamily: theme.fontBody, fontSize: 30, color: theme.textMuted, opacity: fade(30)}}>{url}</div> : null}
    </AbsoluteFill>
  );
}

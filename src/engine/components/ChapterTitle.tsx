import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {useFrame} from '../frame';
import {useTheme} from '../theme';

type Props = {
  lines: readonly string[];
  startFrame: number;
  endFrame: number;
  /** 'corner' is a caption card in a clear band under a flight; 'center' is the closing line under the whole map. */
  placement: 'corner' | 'center';
};

// Average glyph advance of a 700-weight display face with tight tracking, as a fraction of the font size.
const GLYPH_EM = 0.54;
/** Frames for the caption to reveal: the card is complete after this, then holds until the exit. */
const REVEAL = 8;
/** Frames for the caption to leave. */
const EXIT = 6;
/** How far the type rises while it fades in, as a fraction of the font size. */
const RISE = 0.35;
/** Room between a caption card's edge and its type, as a fraction of the font size. */
const PANEL_PAD = 0.42;
/** Clear band around the card, as a fraction of the font size, in landscape (portrait uses its 12% top margin). */
const BAND_PAD = 0.4;

// Headline for a flight between screens. It sits on a solid card inside a band the film keeps free of every
// screen: the top safe margin in portrait, a strip along the bottom edge in landscape. The band is a flat
// strip of the world's background, so the card never lies over UI, whichever neighbour is flying past. The type
// fades and rises on the finished card (no clip mask, so no half-drawn letters). The closing line sits bare on
// the world's flat background under the map.
export default function ChapterTitle({lines: rawLines, startFrame, endFrame, placement}: Props) {
  const frame = useCurrentFrame();
  const view = useFrame();
  const theme = useTheme();
  if (frame < startFrame || frame > endFrame) return null;
  const portrait = view.portrait;
  const center = placement === 'center';
  const enter = interpolate(frame, [startFrame, startFrame + REVEAL], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const exit = center ? 1 : interpolate(frame, [endFrame - EXIT, endFrame], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const visible = Math.min(enter, exit);
  // A caption card is one line, so it stays short.
  const lines = center ? rawLines : [rawLines.join(' ')];
  const wanted = center ? (portrait ? 88 : 100) : portrait ? 60 : 52;
  // Fitted to the frame so a long line shrinks instead of running off the edge.
  const widest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.min(wanted, (view.width - view.safe.side * 2) / (widest * GLYPH_EM + (center ? 0 : PANEL_PAD * 2.8)));
  const rise = (1 - enter) * size * RISE;
  const textStyle = {fontSize: size, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.06, color: theme.text, whiteSpace: 'nowrap', opacity: visible, transform: `translateY(${rise}px)`} as const;

  if (center) {
    // The closing line sits under the map: low in landscape, below the map in portrait.
    const top = portrait ? view.height * 0.46 + 240 : undefined;
    const bottom = portrait ? undefined : 84;
    return (
      <div style={{position: 'absolute', left: 0, right: 0, top, bottom, display: 'flex', justifyContent: 'center', fontFamily: theme.fontDisplay}}>
        <div style={{textAlign: 'center'}}>
          {lines.map((line) => (
            <div key={line} style={textStyle}>{line}</div>
          ))}
        </div>
      </div>
    );
  }

  const card = {padding: `${size * PANEL_PAD}px ${size * PANEL_PAD * 1.4}px`, borderRadius: theme.radius * 1.4, background: theme.surface, border: `1px solid ${theme.border}`};
  const cardHeight = size * 1.06 + size * PANEL_PAD * 2 + 2;
  const bandHeight = portrait ? view.safe.top : Math.round(cardHeight + size * BAND_PAD * 2);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: portrait ? 0 : undefined,
        bottom: portrait ? undefined : 0,
        height: bandHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        borderBottom: portrait ? `1px solid ${theme.border}` : undefined,
        borderTop: portrait ? undefined : `1px solid ${theme.border}`,
        opacity: Math.min(1, visible * 2),
        fontFamily: theme.fontDisplay,
      }}
    >
      <div style={card}>
        {/* The card is solid from the first frame of the band; only the type fades and rises. */}
        <div style={textStyle}>{lines[0]}</div>
      </div>
    </div>
  );
}

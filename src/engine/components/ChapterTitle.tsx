import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {CLOSING_GAP, CLOSING_LINE_HEIGHT, GLYPH_EM, closingLayout} from '../closing';
import {useFrame} from '../frame';
import {useTheme} from '../theme';

type Props = {
  lines: readonly string[];
  startFrame: number;
  endFrame: number;
  /** 'corner' is a caption card in a clear band under a flight; 'center' is the closing line under the whole map. */
  placement: 'corner' | 'center';
};

/** Frames for the caption to reveal: the card is complete after this, then holds until the exit. */
const REVEAL = 8;
/** Frames for the caption to leave. */
const EXIT = 6;
/** How far the type rises while it fades in, as a fraction of the font size. */
const RISE = 0.35;
/** Room between a caption card's edge and its type, as a fraction of the font size. */
const PANEL_PAD = 0.42;
/** Clear band around the card, as a fraction of the font size, in landscape. */
const BAND_PAD = 0.4;
/** Portrait: the card sits at the bottom of the top safe band, this far above the band's lower edge. The HUD pill has the row above. */
const PORTRAIT_CARD_BOTTOM = 20;

// Headline for a flight between screens. It sits on a solid card inside a band the film keeps free of every
// screen: the lower row of the top safe band in portrait (the HUD pill has the row above it), a strip along the
// bottom edge in landscape. The band is a flat strip of the world's background, so the card never lies over UI,
// whichever neighbour is flying past. The type fades and rises on the finished card (no clip mask, so no
// half-drawn letters). The closing line sits on its own solid band under the map; the camera leaves CLOSING_GAP
// of clear background between the lowest screen and the type (see closing.ts).
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
  const closing = closingLayout(view.width, view.height, portrait, view.safe.side, rawLines);
  const wanted = portrait ? 56 : 52;
  // Fitted to the frame so a long line shrinks instead of running off the edge.
  const widest = Math.max(...lines.map((l) => l.length), 1);
  const size = center ? closing.size : Math.min(wanted, (view.width - view.safe.side * 2) / (widest * GLYPH_EM + PANEL_PAD * 2.8));
  const rise = (1 - enter) * size * RISE;
  const textStyle = {fontSize: size, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: CLOSING_LINE_HEIGHT, color: theme.text, whiteSpace: 'nowrap', opacity: visible, transform: `translateY(${rise}px)`} as const;

  if (center) {
    // A solid band from CLOSING_GAP/2 above the type to the frame's edge: whatever the camera is still passing
    // over this part of the frame is hidden before the type is shown, and the map settles clear of it.
    return (
      <div style={{position: 'absolute', left: 0, right: 0, top: closing.bandTop, bottom: 0, background: theme.bg, borderTop: `1px solid ${theme.border}`, opacity: Math.min(1, enter * 2), fontFamily: theme.fontDisplay}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: CLOSING_GAP / 2, textAlign: 'center'}}>
          {lines.map((line) => (
            <div key={line} style={textStyle}>{line}</div>
          ))}
        </div>
      </div>
    );
  }

  const card = {padding: `${size * PANEL_PAD}px ${size * PANEL_PAD * 1.4}px`, borderRadius: theme.radius * 1.4, background: theme.surface, border: `1px solid ${theme.border}`};
  const cardHeight = size * CLOSING_LINE_HEIGHT + size * PANEL_PAD * 2 + 2;
  if (portrait) {
    // The HUD owns the solid band behind this card; the card takes its lower row.
    return (
      <div style={{position: 'absolute', left: 0, right: 0, top: view.safe.top - PORTRAIT_CARD_BOTTOM - cardHeight, display: 'flex', justifyContent: 'center', fontFamily: theme.fontDisplay, opacity: Math.min(1, visible * 2)}}>
        <div style={card}>
          <div style={textStyle}>{lines[0]}</div>
        </div>
      </div>
    );
  }
  const bandHeight = Math.round(cardHeight + size * BAND_PAD * 2);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: bandHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
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

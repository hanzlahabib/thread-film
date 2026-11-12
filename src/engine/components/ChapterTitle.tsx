import {interpolate, useCurrentFrame} from 'remotion';
import {useFrame} from '../frame';
import {useTheme} from '../theme';
import MaskText from './MaskText';

type Props = {
  lines: readonly string[];
  startFrame: number;
  endFrame: number;
  /** 'corner' is a caption card under a flight; 'center' is the closing line under the whole map. */
  placement: 'corner' | 'center';
};

const LINE_GAP = 5;
// Average glyph advance of a 700-weight display face with tight tracking, as a fraction of the font size.
const GLYPH_EM = 0.54;
const EXIT = 8;
/** Room between a caption card's edge and its type, as a fraction of the font size. */
const PANEL_PAD = 0.42;

// Headline for a flight between screens. In a flight it sits on a solid card, so it stays legible over any
// capture and never reads as type laid over UI, and it is gone before the line lands. The closing line sits bare
// on the world's flat background under the map.
export default function ChapterTitle({lines: rawLines, startFrame, endFrame, placement}: Props) {
  const frame = useCurrentFrame();
  const view = useFrame();
  const theme = useTheme();
  if (frame < startFrame || frame > endFrame) return null;
  const portrait = view.portrait;
  const exit = interpolate(frame, [endFrame - EXIT, endFrame], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const center = placement === 'center';
  // A caption card is one line, so it covers as little of the screen behind it as possible.
  const lines = center ? rawLines : [rawLines.join(' ')];
  const wanted = center ? (portrait ? 88 : 100) : portrait ? 60 : 56;
  // Fitted to the frame so a long line shrinks instead of running off the edge.
  const widest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.min(wanted, (view.width - view.safe.side * 2) / (widest * GLYPH_EM + (center ? 0 : PANEL_PAD * 2.8)));
  // The closing line sits under the map; a caption card sits low, centred in portrait and at the left in landscape.
  const top = center && portrait ? view.height * 0.46 + 240 : undefined;
  const bottom = center ? (portrait ? undefined : 84) : view.safe.bottom + 24;

  const type = lines.map((line, i) => (
    <MaskText
      key={line}
      text={line}
      by="word"
      stagger={3}
      startFrame={startFrame + i * LINE_GAP}
      style={{fontSize: size, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.06, color: theme.text, whiteSpace: 'nowrap'}}
    />
  ));

  return (
    <div
      style={{
        position: 'absolute',
        left: center || portrait ? 0 : view.safe.side,
        right: center || portrait ? 0 : undefined,
        top,
        bottom,
        display: 'flex',
        justifyContent: portrait || center ? 'center' : 'flex-start',
        opacity: exit,
        transform: `translateY(${(1 - exit) * 10}px)`,
        fontFamily: theme.fontDisplay,
      }}
    >
      {center ? (
        <div style={{textAlign: 'center'}}>{type}</div>
      ) : (
        <div style={{padding: `${size * PANEL_PAD}px ${size * PANEL_PAD * 1.4}px`, borderRadius: theme.radius * 1.4, background: theme.surface, border: `1px solid ${theme.border}`, textAlign: 'left'}}>{type}</div>
      )}
    </div>
  );
}

import type {CSSProperties, ReactNode} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';

/** Frames from the first visible frame to fully formed. Nothing is clipped on the way: the text only fades and rises. */
export const FADE_FRAMES = 8;
/** How far the text rises while it fades in, as a fraction of its own font size. */
const RISE = 0.3;

type Props = {
  startFrame: number;
  style?: CSSProperties;
  children: ReactNode;
};

// Kinetic type without a mask: the whole block fades in and rises a little on whatever surface is behind it,
// the same move as the chapter captions. A clip mask animates the height of the text, so a half-drawn line looks cut off.
export default function FadeText({startFrame, style, children}: Props) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [startFrame, startFrame + FADE_FRAMES], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <div style={{...style, opacity: p, transform: `translateY(${(1 - p) * RISE}em)`}}>{children}</div>;
}

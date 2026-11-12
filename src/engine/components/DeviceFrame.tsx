import {Img, staticFile} from 'remotion';
import {deviceMetrics, type FrameKind} from '../chrome';
import {useTheme} from '../theme';
import {byMode, screenWidth, type Screen} from '../types';

type Props = {
  screen: Screen;
  kind: Extract<FrameKind, 'phone' | 'tablet'>;
  /** Cover that hides part of the capture until the line has drawn it. */
  mask?: {x: number; y: number; w: number; h: number; color: string} | null;
};

/** The camera cut-out is hardware, so it stays near-black in every theme. */
const NOTCH_COLOR = '#08090a';
/** Island: width, height and distance from the top of the glass, as fractions of the screen width. */
const ISLAND = {w: 0.29, h: 0.088, top: 0.026};
/** Punch hole diameter and distance from the top of the glass, as fractions of the screen width. */
const PUNCH = {d: 0.036, top: 0.03};

// A phone or tablet: a plain rounded body with a rim, the capture as the glass, and an optional camera cut-out.
// It has no brand marks and no buttons. The body takes its colour from the theme's frame colours.
export default function DeviceFrame({screen, kind, mask}: Props) {
  const theme = useTheme();
  const width = screenWidth(screen);
  const {bezel, radius} = deviceMetrics(kind, width);
  const notch = screen.notch ?? (kind === 'phone' ? 'island' : 'punch');
  return (
    <div
      style={{
        position: 'absolute',
        left: screen.origin.x - bezel,
        top: screen.origin.y - bezel,
        width: width + bezel * 2,
        height: screen.height + bezel * 2,
        borderRadius: radius + bezel,
        background: theme.frame.barBg,
        boxShadow: `0 0 0 2px ${theme.border}, ${theme.frame.shadow}`,
      }}
    >
      <div style={{position: 'absolute', left: bezel, top: bezel, width, height: screen.height, borderRadius: radius, overflow: 'hidden'}}>
        <Img src={staticFile(byMode(screen.capture, theme.mode))} style={{width, height: screen.height, display: 'block'}} />
        {mask ? <div style={{position: 'absolute', left: mask.x, top: mask.y, width: mask.w, height: mask.h, background: mask.color}} /> : null}
        {notch === 'island' ? (
          <div style={{position: 'absolute', left: '50%', top: width * ISLAND.top, width: width * ISLAND.w, height: width * ISLAND.h, marginLeft: -width * ISLAND.w * 0.5, borderRadius: 9999, background: NOTCH_COLOR}} />
        ) : null}
        {notch === 'punch' ? (
          <div style={{position: 'absolute', left: '50%', top: width * PUNCH.top, width: width * PUNCH.d, height: width * PUNCH.d, marginLeft: -width * PUNCH.d * 0.5, borderRadius: 9999, background: NOTCH_COLOR}} />
        ) : null}
      </div>
    </div>
  );
}

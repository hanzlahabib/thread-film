import {Img, staticFile} from 'remotion';
import {chromeInsets, frameKind} from '../chrome';
import {useTheme} from '../theme';
import {CAPTURE_W, byMode, type Screen} from '../types';

type Props = {
  screen: Screen;
  /** Cover that hides part of the capture until the line has drawn it. */
  mask?: {x: number; y: number; w: number; h: number; color: string} | null;
};

/** Width of the camera pill on a device bezel, as a fraction of the capture width. */
const NOTCH_W = 0.11;

// One real capture in the chrome the theme (or the screen) asks for, placed at its world position. Sizes are
// world pixels, which are capture pixels.
export default function ScreenFrame({screen, mask}: Props) {
  const theme = useTheme();
  const kind = frameKind(screen, theme);
  const inset = chromeInsets(screen, theme);
  const bar = kind === 'browser' ? theme.frame.bar : 0;
  const bezel = kind === 'device' ? theme.frame.bezel : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: screen.origin.x - inset.side,
        top: screen.origin.y - inset.top,
        width: CAPTURE_W + inset.side * 2,
        height: screen.height + inset.top + inset.bottom,
        borderRadius: kind === 'none' ? 0 : theme.radius + bezel,
        overflow: 'hidden',
        background: kind === 'device' ? theme.frame.barBg : theme.surface,
        boxShadow: kind === 'none' ? 'none' : `0 0 0 2px ${theme.border}, ${theme.frame.shadow}`,
      }}
    >
      {bar > 0 ? (
        <div style={{height: bar, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', background: theme.frame.barBg, borderBottom: `1px solid ${theme.border}`}}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{width: 13, height: 13, borderRadius: 7, background: theme.border}} />
          ))}
          <div
            style={{
              marginLeft: 20,
              width: 560,
              height: Math.max(18, bar - 18),
              borderRadius: 9999,
              background: theme.frame.urlBg,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              fontFamily: theme.fontBody,
              fontSize: 16,
              color: theme.frame.urlText,
            }}
          >
            {screen.url}
          </div>
        </div>
      ) : null}
      <div style={{position: 'relative', margin: `${bezel}px ${bezel}px`, width: CAPTURE_W, height: screen.height, borderRadius: bezel > 0 ? theme.radius : 0, overflow: 'hidden'}}>
        <Img src={staticFile(byMode(screen.capture, theme.mode))} style={{width: CAPTURE_W, height: screen.height, display: 'block'}} />
        {mask ? <div style={{position: 'absolute', left: mask.x, top: mask.y, width: mask.w, height: mask.h, background: mask.color}} /> : null}
      </div>
      {bezel > 0 ? <div style={{position: 'absolute', left: '50%', top: bezel * 0.3, width: CAPTURE_W * NOTCH_W, height: bezel * 0.4, marginLeft: -CAPTURE_W * NOTCH_W * 0.5, borderRadius: 9999, background: theme.border}} /> : null}
    </div>
  );
}

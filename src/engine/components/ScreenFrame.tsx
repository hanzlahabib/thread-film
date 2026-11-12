import {Img, staticFile} from 'remotion';
import {chromeInsets, frameKind, isDevice} from '../chrome';
import {useTheme} from '../theme';
import {byMode, screenWidth, type Screen} from '../types';
import DeviceFrame from './DeviceFrame';

type Props = {
  screen: Screen;
  /** Cover that hides part of the capture until the line has drawn it. */
  mask?: {x: number; y: number; w: number; h: number; color: string} | null;
};

// One real capture in the chrome the theme (or the screen) asks for, placed at its world position. Sizes are
// world pixels, which are capture pixels. A phone or tablet is drawn by DeviceFrame.
export default function ScreenFrame({screen, mask}: Props) {
  const theme = useTheme();
  const kind = frameKind(screen, theme);
  if (isDevice(kind)) return <DeviceFrame screen={screen} kind={kind} mask={mask} />;
  const inset = chromeInsets(screen, theme);
  const width = screenWidth(screen);
  const bar = kind === 'browser' ? theme.frame.bar : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: screen.origin.x - inset.side,
        top: screen.origin.y - inset.top,
        width: width + inset.side * 2,
        height: screen.height + inset.top + inset.bottom,
        borderRadius: kind === 'none' ? 0 : theme.radius,
        overflow: 'hidden',
        background: theme.surface,
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
      <div style={{position: 'relative', width, height: screen.height, overflow: 'hidden'}}>
        <Img src={staticFile(byMode(screen.capture, theme.mode))} style={{width, height: screen.height, display: 'block'}} />
        {mask ? <div style={{position: 'absolute', left: mask.x, top: mask.y, width: mask.w, height: mask.h, background: mask.color}} /> : null}
      </div>
    </div>
  );
}

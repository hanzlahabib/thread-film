import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {useFrame} from '../frame';
import {drawnAt, hopAt, type Model} from '../model';
import {useTheme} from '../theme';

type Props = {model: Model};

/** Portrait: top of the pill row inside the top band. The caption card takes the row below, 16 px or more clear. */
const PORTRAIT_PILL_TOP = 22;
/** The pills are fully gone this many frames before the pull-back camera starts moving, so none is half-faded over the strip. */
const PILL_CLEAR = 2;
/** Frames the pills take to fade out ahead of the pull-back. */
const PILL_FADE = 10;

// Standing furniture of the journey: which screen the line is on, how far along the whole line it is, and an
// optional footnote. The pills sit on a solid strip of the world's background across the top safe margin, so no
// screen pixel is ever under them (the camera also keeps every landing, ring and label below that margin). The
// strip stays opaque; the pills fade out just before the pull-back starts and are gone while the camera is still at rest.
export default function Hud({model}: Props) {
  const frame = useCurrentFrame();
  const view = useFrame();
  const theme = useTheme();
  const {screens, footnote} = model.journey;
  const {to} = hopAt(model, frame);
  const index = Math.max(0, screens.findIndex((s) => s.id === to.screen));
  const progress = drawnAt(model, frame) / model.trail.length;
  const appear = interpolate(frame, [6, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const overview = interpolate(frame, [model.overviewStart - PILL_CLEAR - PILL_FADE, model.overviewStart - PILL_CLEAR], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pad = (n: number) => String(n).padStart(2, '0');

  // Landscape: the pills are centred in the strip. Portrait: they take its upper row.
  const pillRow = view.portrait ? {top: PORTRAIT_PILL_TOP} : {top: view.safe.top / 2, transform: 'translateY(-50%)'};
  return (
    <AbsoluteFill style={{fontFamily: theme.fontBody, color: theme.text}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: view.safe.top, background: theme.bg, borderBottom: `1px solid ${theme.border}`}} />
      <div
        style={{
          position: 'absolute',
          left: view.safe.side,
          ...pillRow,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '9px 22px 9px 16px',
          borderRadius: 9999,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          opacity: appear * (1 - overview),
        }}
      >
        <div style={{fontSize: 22, fontWeight: 600, color: theme.textMuted, fontVariantNumeric: 'tabular-nums'}}>{`${pad(index + 1)} / ${pad(screens.length)}`}</div>
        <div style={{fontSize: 24, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase'}}>{screens[index].kicker}</div>
      </div>
      <div style={{position: 'absolute', right: view.safe.side, ...pillRow, padding: '19px 22px', borderRadius: 9999, background: theme.surface, border: `1px solid ${theme.border}`, opacity: appear * (1 - overview)}}>
        <div style={{width: view.portrait ? 260 : 320, height: 4, borderRadius: 2, background: theme.border}}>
          <div style={{width: `${progress * 100}%`, height: 4, borderRadius: 2, background: theme.thread.color}} />
        </div>
      </div>
      {footnote ? (
        <div
          style={{
            position: 'absolute',
            left: view.safe.side,
            bottom: view.portrait ? view.safe.bottom - 40 : view.safe.bottom,
            padding: '6px 14px',
            borderRadius: 9999,
            background: theme.surface,
            fontSize: view.portrait ? 22 : 18,
            color: theme.textMuted,
            opacity: appear,
          }}
        >
          {footnote}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

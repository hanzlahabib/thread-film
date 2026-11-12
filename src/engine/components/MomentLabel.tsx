import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useFrame} from '../frame';
import {COUNT_SCALE, countText as formatCount, labelPlacement, labelSize} from '../labels';
import {project, type Camera, type TimedStop} from '../model';
import {useTheme} from '../theme';

type Props = {stop: TimedStop; camera: Camera};

const COUNT_FRAMES = 24;
/** The label appears a beat after the ring, so the order reads: line lands, element lights, label explains. */
const DELAY = 5;
/** The label is fully faded by the time the head leaves, so it never trails behind the next stop. */
const EXIT_FRAMES = 8;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

// What the element the line just landed on does for the user. Lives in frame space so it keeps its size.
export default function MomentLabel({stop, camera}: Props) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const view = useFrame();
  const theme = useTheme();
  const start = stop.arrive + DELAY;
  const end = stop.leave;
  if (frame < start || frame > end) return null;
  const local = frame - start;
  const {fontSize, width, height} = labelSize(stop, view.portrait);
  const pop = spring({frame: local, fps, config: {damping: 13, stiffness: 170, mass: 0.7}});
  const exit = interpolate(frame, [end - EXIT_FRAMES, end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const count = stop.count;
  const progress = interpolate(local, [2, 2 + COUNT_FRAMES], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const countText = count ? formatCount(stop, count.to * progress) : '';
  const finalCount = count ? formatCount(stop, count.to) : '';
  const place = labelPlacement(stop, view.portrait);
  const at = project(camera, view, {x: stop.origin.x + place.at.x, y: stop.origin.y + place.at.y});
  const dir = place.dir;
  const rawLeft = dir === 'right' ? at.x : dir === 'left' ? at.x - width : at.x - width / 2;
  const rawTop = dir === 'down' ? at.y : dir === 'up' ? at.y - height : at.y - height / 2;
  // Never pushed past the safe area: a label is moved, not cropped. The camera already framed it to fit.
  const left = clamp(rawLeft, view.safe.side, view.width - view.safe.side - width);
  const top = clamp(rawTop, view.safe.top, view.height - view.safe.bottom - height);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: fontSize * 0.34,
        borderRadius: Math.min(9999, theme.radius * 4),
        background: theme.accent,
        color: theme.accentContrast,
        fontFamily: theme.fontBody,
        fontSize,
        fontWeight: 600,
        letterSpacing: '-0.012em',
        whiteSpace: 'nowrap',
        opacity: Math.min(1, pop * 1.5) * exit,
        transform: `scale(${0.7 + 0.3 * pop})`,
        transformOrigin: `${dir === 'right' ? '0%' : dir === 'left' ? '100%' : '50%'} ${dir === 'down' ? '0%' : dir === 'up' ? '100%' : '50%'}`,
      }}
    >
      {count ? (
        // Tabular numerals and a fixed min width stop the pill from jittering while the digits run.
        <span style={{fontWeight: 700, fontSize: fontSize * COUNT_SCALE, fontVariantNumeric: 'tabular-nums', minWidth: finalCount.length * fontSize * COUNT_SCALE * 0.6, textAlign: 'right'}}>{countText}</span>
      ) : null}
      <span>{stop.label}</span>
    </div>
  );
}

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useFrame} from '../frame';
import {drawnAt, hopAt, project, type Camera, type Model} from '../model';
import {useTheme} from '../theme';
import ChipBadge from './ChipBadge';

type Props = {model: Model; camera: Camera};

/** The chip floats this far above the head of the line, in frame pixels. */
const LIFT = 62;
const LAND_FRAMES = 9;
// Average glyph advance of a 600-weight sans as a fraction of the font size.
const GLYPH_EM = 0.56;

// The object being carried from one screen to the next: it lifts off the element the line just left, rides the
// head of the line through the flight, and drops into the element the line lands on.
export default function CarryChip({model, camera}: Props) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const view = useFrame();
  const theme = useTheme();
  const {to} = hopAt(model, frame);
  if (!to.carry || frame < to.depart || frame > to.arrive + LAND_FRAMES || frame >= model.overviewStart) return null;
  const head = project(camera, view, model.trail.at(drawnAt(model, frame)));
  const lift = spring({frame: frame - to.depart, fps, config: {damping: 12, stiffness: 150, mass: 0.7}});
  // On landing the chip sinks onto the head and shrinks away into the element.
  const land = interpolate(frame, [to.arrive - 2, to.arrive + LAND_FRAMES], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fontSize = view.portrait ? 30 : 28;
  // A little sway against the direction of travel sells the weight of the thing being carried.
  const prev = project(camera, view, model.trail.at(drawnAt(model, frame - 1)));
  const tilt = Math.max(-10, Math.min(10, (prev.x - head.x) * 0.25));

  // The chip's width is estimated so a head near the edge never pushes it out of the safe area.
  const width = (to.carry.text.length + 4) * fontSize * GLYPH_EM + fontSize * 2;
  const left = Math.min(Math.max(head.x, view.safe.side + width / 2), view.width - view.safe.side - width / 2);
  const top = Math.max(head.y - LIFT * lift * (1 - land), view.safe.top + fontSize);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${(0.4 + 0.6 * lift) * (1 - land * 0.7)})`,
        opacity: Math.min(1, lift * 2) * (1 - land),
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 22px 12px 14px',
        borderRadius: 9999,
        background: theme.chip.bg,
        border: `2px solid ${theme.thread.color}`,
        color: theme.chip.text,
        fontFamily: theme.fontBody,
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: `0 0 16px rgba(${theme.thread.glow},.35)`,
      }}
    >
      <ChipBadge icon={to.carry.icon} size={fontSize * 1.45} />
      {to.carry.text}
    </div>
  );
}

import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useFrame} from '../frame';
import {drawnAt, hopAt, project, type Camera, type Model} from '../model';
import {useTheme} from '../theme';

type Props = {model: Model; camera: Camera};

/** World pixels behind the head that stay at full brightness; older line dims. */
const FRESH = 620;
const TICK_FRAMES = 16;
const RING_PAD = 6;

// The drawn line, its head, and everything an arrival sets off on the capture itself. It is an SVG in frame
// space whose group carries the camera transform, so the line is locked to the capture pixel for pixel while
// its stroke keeps one on-screen width.
export default function Thread({model, camera}: Props) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const view = useFrame();
  const theme = useTheme();
  const {color, width, glow} = theme.thread;
  const total = model.trail.length;
  const s = drawnAt(model, frame);
  const head = model.trail.at(s);
  const {resting} = hopAt(model, frame);
  const origin = project(camera, view, {x: 0, y: 0});
  const px = 1 / camera.scale; // one frame pixel in world units
  const overview = frame >= model.overviewStart;
  const moving = !resting && !overview && frame >= model.introEnd;
  const beat = 0.5 + 0.5 * Math.sin(frame / 5);
  const fresh = Math.min(FRESH, s);

  return (
    <svg width={view.width} height={view.height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <g transform={`translate(${origin.x} ${origin.y}) scale(${camera.scale})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* The line already drawn stays, dimmed, so the route behind the head reads as history. */}
        <path d={model.path} stroke={`rgba(${glow},0.12)`} strokeWidth={width * 2.6 * px} strokeDasharray={`${s} ${total}`} />
        <path d={model.path} stroke={color} strokeOpacity={overview ? 0.95 : 0.5} strokeWidth={width * px} strokeDasharray={`${s} ${total}`} />
        {overview ? null : (
          <g>
            {[
              {w: 4.4, o: 0.12},
              {w: 2.4, o: 0.22},
            ].map((g) => (
              <path key={g.w} d={model.path} stroke={`rgba(${glow},${g.o})`} strokeWidth={width * g.w * px} strokeDasharray={`${fresh} ${total}`} strokeDashoffset={-(s - fresh)} />
            ))}
            <path d={model.path} stroke={color} strokeWidth={width * (moving ? 1.5 : 1) * px} strokeDasharray={`${fresh} ${total}`} strokeDashoffset={-(s - fresh)} />
          </g>
        )}

        {model.stops.map((stop) => {
          if (frame < stop.arrive) return null;
          const local = frame - stop.arrive;
          const pop = spring({frame: local, fps, config: {damping: 14, stiffness: 170}});
          const active = frame < stop.leave + 6;
          const fade = overview ? 0 : active ? 1 : 0.3;
          const stubTo = stop.stub ? {x: stop.origin.x + stop.stub.x, y: stop.origin.y + stop.stub.y} : null;
          const grow = Math.min(1, local / 6);
          const ring = stop.ring ? {...stop.ring, x: stop.origin.x + stop.ring.x, y: stop.origin.y + stop.ring.y} : null;
          return (
            <g key={stop.id} opacity={fade}>
              {stubTo ? (
                <line
                  x1={stop.world.x}
                  y1={stop.world.y}
                  x2={stop.world.x + (stubTo.x - stop.world.x) * grow}
                  y2={stop.world.y + (stubTo.y - stop.world.y) * grow}
                  stroke={color}
                  strokeWidth={width * px}
                />
              ) : null}
              {ring ? (
                <g>
                  <rect
                    x={ring.x - RING_PAD}
                    y={ring.y - RING_PAD}
                    width={ring.w + RING_PAD * 2}
                    height={ring.h + RING_PAD * 2}
                    rx={theme.radius * 0.6}
                    stroke={color}
                    strokeWidth={width * 0.6 * px}
                    fill={`rgba(${glow},${active ? 0.06 : 0})`}
                    opacity={Math.min(1, pop * 1.4)}
                  />
                  {local < 22 ? (
                    // Shockwave: the arrival visibly sets the element off.
                    <rect
                      x={ring.x - RING_PAD - local * 1.4 * px}
                      y={ring.y - RING_PAD - local * 1.4 * px}
                      width={ring.w + RING_PAD * 2 + local * 2.8 * px}
                      height={ring.h + RING_PAD * 2 + local * 2.8 * px}
                      rx={theme.radius * 0.6 + local * px}
                      stroke={color}
                      strokeWidth={width * 0.45 * px}
                      opacity={0.7 * (1 - local / 22)}
                    />
                  ) : null}
                </g>
              ) : null}
              <circle cx={stop.world.x} cy={stop.world.y} r={width * 1.45 * px * pop} fill={color} />
            </g>
          );
        })}

        {model.ticks.map((tick, i) => {
          // Pass-by rings are a close-up detail; on the closing map they would be blobs.
          if (frame < tick.frame || overview) return null;
          const p = Math.min(1, (frame - tick.frame) / TICK_FRAMES);
          return (
            <g key={i}>
              <circle cx={tick.world.x} cy={tick.world.y} r={(8 + p * 22) * px} stroke={color} strokeWidth={width * 0.55 * px} opacity={1 - p} />
              <circle cx={tick.world.x} cy={tick.world.y} r={19 * px} stroke={color} strokeWidth={width * 0.45 * px} opacity={0.75} />
            </g>
          );
        })}

        {overview ? null : (
          <g>
            <circle cx={head.x} cy={head.y} r={(width * 5.3 + beat * 8) * px} fill={`rgba(${glow},0.14)`} />
            <circle cx={head.x} cy={head.y} r={width * 2.9 * px} fill={`rgba(${glow},0.35)`} />
            <circle cx={head.x} cy={head.y} r={width * 1.55 * px} fill={color} />
          </g>
        )}
      </g>
    </svg>
  );
}

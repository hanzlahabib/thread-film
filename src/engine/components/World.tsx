import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {useFrame} from '../frame';
import {drawnAt, project, type Camera, type Model} from '../model';
import {useTheme} from '../theme';
import {byMode} from '../types';
import ScreenFrame from './ScreenFrame';

type Props = {model: Model; camera: Camera};

// The grid drifts at a fraction of the camera move, so the windows read as floating in front of it.
const PARALLAX = 0.28;
const GRID = 88;

// The space every screen lives in, seen through the journey camera.
export default function World({model, camera}: Props) {
  const frame = useCurrentFrame();
  const view = useFrame();
  const theme = useTheme();
  const origin = project(camera, view, {x: 0, y: 0});
  const s = drawnAt(model, frame);
  const gx = ((-camera.cx * camera.scale * PARALLAX) % GRID) - GRID;
  const gy = ((-camera.cy * camera.scale * PARALLAX) % GRID) - GRID;

  // A reveal stays covered from the head of the line to its far edge, until the head has run its length.
  const maskFor = (screenId: string) => {
    const reveal = (model.journey.reveals ?? []).find((r) => r.screen === screenId);
    if (!reveal) return null;
    const from = model.trail.marks[reveal.from];
    const to = model.trail.marks[reveal.to];
    if (from === undefined || to === undefined || s >= to) return null;
    const screen = model.journey.screens.find((x) => x.id === screenId);
    if (!screen) return null;
    const headX = s <= from ? reveal.rect.x : model.trail.at(s).x - screen.origin.x;
    return {x: headX, y: reveal.rect.y, w: reveal.rect.x + reveal.rect.w - headX, h: reveal.rect.h, color: byMode(reveal.color, theme.mode)};
  };

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: gx,
          top: gy,
          right: -GRID,
          bottom: -GRID,
          backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)`,
          backgroundSize: `${GRID}px ${GRID}px`,
        }}
      />
      <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${origin.x}px, ${origin.y}px) scale(${camera.scale})`}}>
        {model.journey.screens.map((screen) => (
          <ScreenFrame key={screen.id} screen={screen} mask={maskFor(screen.id)} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

import {AbsoluteFill, useCurrentFrame} from 'remotion';
import CarryChip from './components/CarryChip';
import ChapterTitle from './components/ChapterTitle';
import Hud from './components/Hud';
import MomentLabel from './components/MomentLabel';
import Thread from './components/Thread';
import World from './components/World';
import {useFrame} from './frame';
import {cameraAt, type Model} from './model';

type Props = {model: Model};

/** A flight's caption is gone this many frames before the line lands, so the screen takes over clean. */
const TITLE_CLEAR = 6;

// The whole journey as one shot: every screen in one space, one line drawn through them, and a camera that
// follows the head of the line. Nothing here cuts, which is what keeps the line unbroken.
export default function Journey({model}: Props) {
  const frame = useCurrentFrame();
  const view = useFrame();
  const camera = cameraAt(model, frame, view);
  const {screens, outro} = model.journey;
  const titleOf = (id: string) => screens.find((s) => s.id === id)?.title ?? [];

  return (
    <AbsoluteFill>
      <World model={model} camera={camera} />
      <Thread model={model} camera={camera} />
      <Hud model={model} />
      {model.stops
        .filter((s) => s.flight)
        .map((stop) => (
          <ChapterTitle key={stop.id} lines={titleOf(stop.screen)} startFrame={stop.depart + 2} endFrame={stop.arrive - TITLE_CLEAR} placement="corner" />
        ))}
      <ChapterTitle lines={outro.lines} startFrame={model.overviewStart + 18} endFrame={model.durationInFrames + 30} placement="center" />
      {model.stops.map((stop) => (
        <MomentLabel key={stop.id} stop={stop} camera={camera} />
      ))}
      <CarryChip model={model} camera={camera} />
    </AbsoluteFill>
  );
}

import {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import CarryChip from './components/CarryChip';
import ChapterTitle from './components/ChapterTitle';
import Hud from './components/Hud';
import MomentLabel from './components/MomentLabel';
import Thread from './components/Thread';
import World from './components/World';
import {useFrame} from './frame';
import {buildModel, cameraAt, closingFor, makeFrame, type Model} from './model';

type Props = {model: Model};

/** A flight's caption is gone this many frames before the line lands, so the screen takes over clean. */
const TITLE_CLEAR = 3;
/** The closing line starts this many frames into the pull-back: formed well before the camera lands (46 frames in). */
const CLOSING_DELAY = 10;

// The whole journey as one shot: every screen in one space, one line drawn through them, and a camera that
// follows the head of the line. Nothing here cuts, which is what keeps the line unbroken.
export default function Journey({model: built}: Props) {
  const frame = useCurrentFrame();
  const view = useFrame();
  // A journey with layout 'auto' is arranged for the shape of the composition: build it again for this one.
  // Timing does not depend on the arrangement, so the frames of the film are the same.
  const model = useMemo(() => (built.source.layout === 'auto' ? buildModel(built.source, built.theme, built.narrationSeconds, makeFrame(view.width, view.height)) : built), [built, view.width, view.height]);
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
          <ChapterTitle key={stop.id} lines={titleOf(stop.screen)} startFrame={stop.depart} endFrame={stop.arrive - TITLE_CLEAR} placement="corner" />
        ))}
      <ChapterTitle lines={outro.lines} startFrame={model.overviewStart + CLOSING_DELAY} endFrame={model.durationInFrames + 30} placement="center" closing={closingFor(model, view)} />
      {model.stops.map((stop) => (
        <MomentLabel key={stop.id} model={model} stop={stop} camera={camera} />
      ))}
      <CarryChip model={model} camera={camera} />
    </AbsoluteFill>
  );
}

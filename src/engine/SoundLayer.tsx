import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {musicGain, type Soundtrack} from './audio';

type Props = {sound: Soundtrack};

// Every sound of a film: the effects at their cue frames and the music bed, looped on its own length. Placed
// at the film's root, so frames here are film frames.
export default function SoundLayer({sound}: Props) {
  const {durationInFrames: total, fps} = useVideoConfig();
  const {music, cues} = sound;
  // Loops are laid end to end on whole frames. Built-in beds are an exact number of frames long, so they join
  // without a gap; a custom file only needs to be cut at a bar line to loop cleanly.
  const pass = music?.seconds ? Math.round(music.seconds * fps) : 0;
  const passes = pass > 0 ? Math.ceil(total / pass) : 1;
  return (
    <>
      {music
        ? Array.from({length: passes}, (_, k) => (
            <Sequence key={k} from={k * pass} durationInFrames={pass > 0 ? Math.min(pass, total - k * pass) : total} layout="none">
              <Audio src={staticFile(music.file)} volume={(f) => musicGain(sound, k * pass + f, total)} />
            </Sequence>
          ))
        : null}
      {cues.map((cue) => (
        <Sequence key={`${cue.name}-${cue.frame}`} from={cue.frame} durationInFrames={cue.frames > 0 ? cue.frames + 1 : undefined} layout="none">
          <Audio src={staticFile(cue.file)} volume={cue.volume} />
        </Sequence>
      ))}
    </>
  );
}

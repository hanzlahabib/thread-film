import {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import EndCard from './EndCard';
import HookCard from './HookCard';
import Journey from './Journey';
import {buildModel} from './model';
import {ThemeContext} from './theme';
import type {FilmProps} from './types';
import {applyVo, narrationFiles} from './vo';

/** Frames the end card is on screen, and the crossfade into it and out of the hook. */
export const END_FRAMES = 90;
export const HOOK_FRAMES = 90;
const FADE = 12;

function layout(props: FilmProps) {
  const {journey, seconds} = applyVo(props.journey, props.vo);
  const known = {...seconds, ...props.narrationSeconds};
  const model = buildModel(journey, props.theme, known);
  const hookFrames = props.hook ? props.hook.frames ?? HOOK_FRAMES : 0;
  const journeyStart = props.hook ? hookFrames - FADE : 0;
  const endStart = journeyStart + model.durationInFrames - FADE;
  return {model, hookFrames, journeyStart, endStart, total: endStart + END_FRAMES, journey};
}

/** Total length of a film in frames. */
export function filmDuration(props: FilmProps): number {
  return layout(props).total;
}

/**
 * Measures every voiceover clip that vo.json lists without a `seconds` value, then sets the film's length.
 * With no vo.json nothing is measured and the length comes from the per-stop travel and hold frames alone.
 */
export const calculateFilmMetadata: CalculateMetadataFunction<FilmProps> = async ({props}) => {
  const {journey, seconds} = applyVo(props.journey, props.vo);
  const missing = narrationFiles(journey).filter((f) => seconds[f] === undefined);
  const entries = await Promise.all(
    missing.map(async (file) => {
      try {
        return [file, await getAudioDurationInSeconds(staticFile(file))] as const;
      } catch (error) {
        throw new Error(`Could not read the voiceover "${file}" listed in src/film/vo.json. Is it in public/?`, {cause: error});
      }
    }),
  );
  const next = {...props, narrationSeconds: Object.fromEntries(entries)};
  return {durationInFrames: filmDuration(next), props: next};
};

const fadeIn = (frame: number, from: number) => interpolate(frame, [from, from + FADE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// A whole film: optional hook card, the journey shot, then the end card. Everything it shows comes from props.
export default function ThreadFilm(props: FilmProps) {
  const {theme, end, hook} = props;
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {model, hookFrames, journeyStart, endStart, journey} = useMemo(() => layout(props), [props]);
  const music = journey.music;
  const voiceRanges = model.narration.map((cue) => [journeyStart + cue.frame, journeyStart + cue.frame + cue.frames] as const);
  // Music sits under narration: about a third of its level while a line is spoken.
  const duck = (f: number) => (voiceRanges.some(([a, b]) => f >= a - 6 && f <= b + 6) ? 0.35 : 1);

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{backgroundColor: theme.bg}}>
        <Sequence from={journeyStart} durationInFrames={model.durationInFrames}>
          <AbsoluteFill style={{opacity: hook ? fadeIn(frame, journeyStart) : 1}}>
            <Journey model={model} />
          </AbsoluteFill>
          {model.narration.map((cue) => (
            <Sequence key={cue.file} from={cue.frame} durationInFrames={cue.frames + fps} layout="none">
              <Audio src={staticFile(cue.file)} />
            </Sequence>
          ))}
        </Sequence>
        {hook ? (
          <Sequence from={0} durationInFrames={hookFrames}>
            <AbsoluteFill style={{opacity: 1 - fadeIn(frame, hookFrames - FADE)}}>
              <HookCard {...hook} />
            </AbsoluteFill>
          </Sequence>
        ) : null}
        <Sequence from={endStart} durationInFrames={END_FRAMES}>
          <AbsoluteFill style={{opacity: fadeIn(frame, endStart)}}>
            <EndCard {...end} />
          </AbsoluteFill>
        </Sequence>
        {music ? (
          <Audio
            src={staticFile(music.file)}
            volume={(f) => music.volume * duck(f) * interpolate(f, [0, 20, durationInFrames - 45, durationInFrames - 4], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
          />
        ) : null}
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
}

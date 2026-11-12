import type {Journey, Vo} from './types';

export type VoApplied = {journey: Journey; /** Seconds already known from vo.json, by file. */ seconds: Record<string, number>};

/**
 * Merges the optional vo.json into the journey: the clip for `intro` and for each screen id. Without a vo.json
 * the film runs on its fixed per-stop and per-flight frames and has no audio.
 */
export function applyVo(journey: Journey, vo: Vo | undefined): VoApplied {
  if (!vo) return {journey, seconds: {}};
  const seconds: Record<string, number> = {};
  const note = (clip: {file: string; seconds?: number} | undefined) => {
    if (clip?.seconds) seconds[clip.file] = clip.seconds;
    return clip?.file;
  };
  const introFile = note(vo.intro);
  return {
    journey: {
      ...journey,
      intro: {...journey.intro, narration: introFile ?? journey.intro.narration},
      screens: journey.screens.map((s) => ({...s, narration: note(vo.screens?.[s.id]) ?? s.narration})),
    },
    seconds,
  };
}

export function narrationFiles(journey: Journey): string[] {
  return [journey.intro.narration, ...journey.screens.map((s) => s.narration)].filter((f): f is string => Boolean(f));
}

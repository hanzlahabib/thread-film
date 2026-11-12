// Prints the sound cues the engine derives for the film: `pnpm exec tsx scripts/print-cues.ts`.
import {buildSoundtrack} from '../src/engine/audio';
import {END_FRAMES, HOOK_FRAMES} from '../src/engine/ThreadFilm';
import {buildModel, FPS} from '../src/engine/model';
import {end, hook, journey} from '../src/film/journey';
import {theme} from '../src/film/theme';

const props = {theme, journey, end, hook};
const model = buildModel(journey, theme);
const journeyStart = hook ? (hook.frames ?? HOOK_FRAMES) - 12 : 0;
const endStart = journeyStart + model.durationInFrames - 12;
const total = endStart + END_FRAMES;
const sound = buildSoundtrack(props, model, journeyStart, endStart, total, {});
console.log(`film ${total} frames (${(total / FPS).toFixed(1)} s), journey starts at ${journeyStart}, end card at ${endStart}`);
console.log(`music: ${sound.music ? `${sound.music.file} at ${sound.music.volume}` : 'none'}`);
for (const cue of sound.cues) console.log(`${String(cue.frame).padStart(5)}  ${(cue.frame / FPS).toFixed(2).padStart(6)} s  ${cue.name.padEnd(10)} vol ${cue.volume.toFixed(2)}  ${cue.file}`);

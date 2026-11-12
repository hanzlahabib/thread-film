// Checks src/film/journey.ts before a render: stops inside their captures, anchors off their rings, carried
// chips with a source and a destination, captures present in public/ at the size the journey says.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import manifest from '../src/engine/audio-manifest.json';
import {customMusicFile, moodOf} from '../src/engine/audio';
import {end, journey} from '../src/film/journey';
import {theme} from '../src/film/theme';
import {applyVo, narrationFiles} from '../src/engine/vo';
import {CAPTURE_W} from '../src/engine/types';
import {capturePaths, validateJourney, type Issue} from '../src/engine/validate';
import type {Vo} from '../src/engine/types';

// pnpm runs scripts from the project root.
const root = process.cwd();
const pub = (file: string) => join(root, 'public', file);
const issues: Issue[] = validateJourney(journey);

/** Width and height from a PNG header, or null when the file is not a PNG. */
function pngSize(file: string): {w: number; h: number} | null {
  const b = readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
}

for (const {screen, path} of capturePaths(journey)) {
  const where = `screen "${screen}"`;
  if (!existsSync(pub(path))) {
    issues.push({level: 'error', where, message: `capture "${path}" is not in public/. Put the file at public/${path} or fix the path.`});
    continue;
  }
  const size = pngSize(pub(path));
  const height = journey.screens.find((s) => s.id === screen)?.height;
  if (!size) continue; // not a PNG (jpg or webp): trust the journey
  // A 2x or 3x capture is fine (sharper when the camera zooms in) as long as it is the journey's size times a whole number.
  const scale = size.w / CAPTURE_W;
  if (!Number.isInteger(scale)) issues.push({level: 'error', where, message: `"${path}" is ${size.w}px wide; captures must be ${CAPTURE_W}px wide, or a whole multiple of it (2x, 3x), so the coordinates in journey.ts line up.`});
  else if (height !== undefined && size.h !== height * scale) issues.push({level: 'error', where, message: `"${path}" is ${size.w}x${size.h} but the journey says ${CAPTURE_W}x${height} (at ${scale}x).`});
}

const voPath = join(root, 'src/film/vo.json');
if (existsSync(voPath)) {
  const vo = JSON.parse(readFileSync(voPath, 'utf8')) as Vo;
  for (const id of Object.keys(vo.screens ?? {})) {
    if (!journey.screens.some((s) => s.id === id)) issues.push({level: 'error', where: 'vo.json', message: `lists a clip for screen "${id}", which is not in the journey.`});
  }
  for (const file of narrationFiles(applyVo(journey, vo).journey)) {
    if (!existsSync(pub(file))) issues.push({level: 'error', where: 'vo.json', message: `"${file}" is not in public/.`});
  }
}

// Sound: every file the film will play must exist, and the levels must be sane.
const audio = journey.audio;
const sound = {theme, journey} as Parameters<typeof customMusicFile>[0];
const music = customMusicFile(sound);
if (music && !existsSync(pub(music))) issues.push({level: 'error', where: 'audio.music', message: `"${music}" is not in public/. Use 'calm', 'driven', 'minimal', false, or a file under public/.`});
if (!(moodOf(sound) in manifest.music)) issues.push({level: 'error', where: 'theme.audio.mood', message: `"${moodOf(sound)}" is not a mood. Use ${Object.keys(manifest.music).map((m) => `'${m}'`).join(', ')}.`});
const builtIn = [...Object.values(manifest.music), ...Object.values(manifest.sfx)];
for (const {file} of builtIn) {
  if (!existsSync(pub(file))) issues.push({level: 'error', where: 'audio', message: `built-in sound "${file}" is missing from public/. Run \`pnpm run audio\` to regenerate it.`});
}
const sfx = audio?.sfx;
for (const [cue, file] of Object.entries(typeof sfx === 'object' ? sfx.overrides ?? {} : {})) {
  if (file && !existsSync(pub(file))) issues.push({level: 'error', where: `audio.sfx.overrides.${cue}`, message: `"${file}" is not in public/.`});
}
for (const [where, value, max] of [['audio.musicVolume', audio?.musicVolume, 0.4], ['audio.sfx.volume', typeof sfx === 'object' ? sfx.volume : undefined, 0.9]] as const) {
  if (value !== undefined && !(value >= 0 && value <= 1)) issues.push({level: 'error', where, message: `${value} is outside 0..1.`});
  else if (value !== undefined && value > max) issues.push({level: 'warning', where, message: `${value} is loud; narration and a quiet film both get harsh above about ${max}.`});
}
if (!end.cta.trim()) issues.push({level: 'error', where: 'end card', message: 'cta is empty.'});

const errors = issues.filter((i) => i.level === 'error');
for (const i of issues) console.log(`${i.level === 'error' ? 'ERROR  ' : 'warning'} ${i.where}: ${i.message}`);
console.log(errors.length === 0 ? `\njourney OK (${journey.screens.length} screens, ${journey.stops.length} stops, ${issues.length} warnings)` : `\n${errors.length} error(s). Fix them before rendering.`);
process.exit(errors.length === 0 ? 0 : 1);

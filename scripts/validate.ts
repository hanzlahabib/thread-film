// Checks every film in src/film before a render: stops inside their captures, anchors off their rings, carried
// chips with a source and a destination, captures present in public/ at the size the journey says, and, once the
// film is laid out for 9:16 and 16:9, labels clear of text and rings and a hook that has time to be read.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import manifest from '../src/engine/audio-manifest.json';
import {customMusicFile, moodOf} from '../src/engine/audio';
import {end, hook, journey} from '../src/film/journey';
import {theme} from '../src/film/theme';
import {end as mobileEnd, hook as mobileHook, journey as mobileJourney} from '../src/film/mobile/journey';
import {mobileDark} from '../src/film/mobile/themes';
import {applyVo, narrationFiles} from '../src/engine/vo';
import {screenWidth, type EndCard, type Hook, type Journey, type Vo} from '../src/engine/types';
import type {Theme} from '../src/engine/theme';
import {capturePaths, validateFilm, validateHook, validateJourney, type Issue} from '../src/engine/validate';

// pnpm runs scripts from the project root.
const root = process.cwd();
const pub = (file: string) => join(root, 'public', file);

type Film = {name: string; journey: Journey; theme: Theme; end: EndCard; hook?: Hook; /** The film's voiceover list, when it has one. */ vo?: string};
const films: Film[] = [
  {name: 'demo', journey, theme, end, hook, vo: 'src/film/vo.json'},
  {name: 'mobile', journey: mobileJourney, theme: mobileDark, end: mobileEnd, hook: mobileHook},
];

/** Width and height from a PNG header, or null when the file is not a PNG. */
function pngSize(file: string): {w: number; h: number} | null {
  const b = readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
}

function check(film: Film): Issue[] {
  const j = film.journey;
  const issues: Issue[] = [...(j.layout === 'auto' ? [] : validateJourney(j)), ...validateFilm(j, film.theme), ...validateHook(film.hook)];

  for (const {screen, path} of capturePaths(j)) {
    const where = `screen "${screen}"`;
    if (!existsSync(pub(path))) {
      issues.push({level: 'error', where, message: `capture "${path}" is not in public/. Put the file at public/${path} or fix the path.`});
      continue;
    }
    const size = pngSize(pub(path));
    const shot = j.screens.find((s) => s.id === screen);
    if (!size || !shot) continue; // not a PNG (jpg or webp): trust the journey
    // A 2x or 3x capture is fine (sharper when the camera zooms in) as long as it is the journey's size times a whole number.
    const width = screenWidth(shot);
    const scale = size.w / width;
    if (!Number.isInteger(scale)) issues.push({level: 'error', where, message: `"${path}" is ${size.w}px wide; captures must be ${width}px wide, or a whole multiple of it (2x, 3x), so the coordinates in the journey line up.`});
    else if (size.h !== shot.height * scale) issues.push({level: 'error', where, message: `"${path}" is ${size.w}x${size.h} but the journey says ${width}x${shot.height} (at ${scale}x).`});
  }

  if (film.vo && existsSync(join(root, film.vo))) {
    const vo = JSON.parse(readFileSync(join(root, film.vo), 'utf8')) as Vo;
    for (const id of Object.keys(vo.screens ?? {})) {
      if (!j.screens.some((s) => s.id === id)) issues.push({level: 'error', where: 'vo.json', message: `lists a clip for screen "${id}", which is not in the journey.`});
    }
    for (const file of narrationFiles(applyVo(j, vo).journey)) {
      if (!existsSync(pub(file))) issues.push({level: 'error', where: 'vo.json', message: `"${file}" is not in public/.`});
    }
  }
  // Sound: every file the film will play must exist, and the levels must be sane.
  const audio = j.audio;
  const sound = {theme: film.theme, journey: j} as Parameters<typeof customMusicFile>[0];
  const music = customMusicFile(sound);
  if (music && !existsSync(pub(music))) issues.push({level: 'error', where: 'audio.music', message: `"${music}" is not in public/. Use 'calm', 'driven', 'minimal', false, or a file under public/.`});
  if (!(moodOf(sound) in manifest.music)) issues.push({level: 'error', where: 'theme.audio.mood', message: `"${moodOf(sound)}" is not a mood. Use ${Object.keys(manifest.music).map((m) => `'${m}'`).join(', ')}.`});
  for (const {file} of [...Object.values(manifest.music), ...Object.values(manifest.sfx)]) {
    if (!existsSync(pub(file))) issues.push({level: 'error', where: 'audio', message: `built-in sound "${file}" is missing from public/. Run \`pnpm run audio\` to regenerate it.`});
  }
  const sfx = audio?.sfx;
  for (const [cue, file] of Object.entries(typeof sfx === 'object' ? sfx.overrides ?? {} : {})) {
    if (file && !existsSync(pub(file))) issues.push({level: 'error', where: `audio.sfx.overrides.${cue}`, message: `"${file}" is not in public/.`});
  }
  for (const [where, value, max] of [['audio.musicVolume', audio?.musicVolume, 0.7], ['audio.sfx.volume', typeof sfx === 'object' ? sfx.volume : undefined, 1]] as const) {
    if (value !== undefined && !(value >= 0 && value <= 1)) issues.push({level: 'error', where, message: `${value} is outside 0..1.`});
    else if (value !== undefined && value > max) issues.push({level: 'warning', where, message: `${value} is loud; narration and a quiet film both get harsh above about ${max}.`});
  }
  if (j.music && !existsSync(pub(j.music.file))) issues.push({level: 'error', where: 'music', message: `"${j.music.file}" is not in public/.`});
  if (!film.end.cta.trim()) issues.push({level: 'error', where: 'end card', message: 'cta is empty.'});
  return issues;
}

let failed = 0;
for (const film of films) {
  const issues = check(film);
  const errors = issues.filter((i) => i.level === 'error');
  console.log(`\n== ${film.name} ==`);
  for (const i of issues) console.log(`${i.level === 'error' ? 'ERROR  ' : 'warning'} ${i.where}: ${i.message}`);
  console.log(errors.length === 0 ? `${film.name} OK (${film.journey.screens.length} screens, ${film.journey.stops.length} stops, ${issues.length} warnings)` : `${errors.length} error(s) in ${film.name}. Fix them before rendering.`);
  failed += errors.length;
}
process.exit(failed === 0 ? 0 : 1);

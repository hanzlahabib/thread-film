// Checks src/film/journey.ts before a render: stops inside their captures, anchors off their rings, carried
// chips with a source and a destination, captures present in public/ at the size the journey says.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {end, journey} from '../src/film/journey';
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
if (journey.music && !existsSync(pub(journey.music.file))) issues.push({level: 'error', where: 'music', message: `"${journey.music.file}" is not in public/.`});
if (!end.cta.trim()) issues.push({level: 'error', where: 'end card', message: 'cta is empty.'});

const errors = issues.filter((i) => i.level === 'error');
for (const i of issues) console.log(`${i.level === 'error' ? 'ERROR  ' : 'warning'} ${i.where}: ${i.message}`);
console.log(errors.length === 0 ? `\njourney OK (${journey.screens.length} screens, ${journey.stops.length} stops, ${issues.length} warnings)` : `\n${errors.length} error(s). Fix them before rendering.`);
process.exit(errors.length === 0 ? 0 : 1);

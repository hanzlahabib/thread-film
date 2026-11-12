# Building a film

A film is two files and some captures. The engine in `src/engine/` does the rest. Read the types in `src/engine/types.ts` and `src/engine/theme.ts`; this page says what each part is for.

## Layout
| Path | Role |
|------|------|
| `src/engine/` | The engine: do not edit to make a film |
| `src/film/theme.ts` | Exports the active theme. One line: `export const theme = dark;` |
| `src/film/themes/` | The Theme objects (colours, fonts, radius, line, frame): `dark.ts`, `light.ts`; copy one for your own |
| `src/film/journey.ts` | The Journey (screens, stops, reveals, intro, outro) and the end card |
| `public/captures/` | Screenshots, referenced by path from `journey.ts` |
| `src/film/vo.json` | Optional narration: lists the clips under `public/vo/` (empty `{}` means no audio) |
| `public/vo/` | Optional narration clips |
| `public/audio/` | Generated sound effects and music beds (`pnpm run audio` rewrites them); your own music can go here too |
| compositions `film-16x9`, `film-9x16` | The two outputs, same journey, active theme |
| compositions `film-16x9-light`, `film-9x16-light` | The same two outputs in the light theme |
| `pnpm validate` | Checks the journey and both themes' captures before rendering |
| `pnpm render:demo`, `render:16x9`, `render:9x16` | Render the demo pair, or the active-theme 16:9 or 9:16 film, into `out/` |
| `pnpm render:mobile` | Render the phone demo, `mobile-9x16` (also `mobile-9x16-light`, `mobile-16x9`) |
| `pnpm render:screens`, `pnpm gif` | Regenerate the demo captures and anchors; cut the README GIFs from the rendered films |

## How the pieces fit
- **`journey.ts` is the film.** `screens` hold id, kicker, title lines, capture path, capture height, address-bar URL, `origin` in world pixels, `route` and optional `narration`. `stops` hold the element the line lands beside: `id` (equal to a `mark` on the route), `stub`, `ring`, `label` with `labelAt` and `labelDir` (optional on phone screens, where the engine searches for a clear placement), optional `count`, `look` and `zoom` (a number or `'wide' | 'medium' | 'tight'`) for the camera, `beat` for how long it rests, optional `carry` chip and `ticks`. `Screen.width` (default 1920), `Screen.frame` (`'browser' | 'phone' | 'tablet' | 'none'`) and `Journey.layout: 'auto'` are for phone and tablet films: see `mobile.md`.
- Local coordinates are pixels of the capture, 1920 wide unless the screen sets `width`. World coordinates are those plus the screen's `origin`.
- **`Trail`** (`src/engine/geometry.ts`) builds the line once as a single polyline. Rounded corners and curves are flattened into short chords, and every named mark is a distance along it. The schedule, the camera and the renderer all work in that one unit. Never draw the line with one path and position the head with another.
- The schedule turns stops and measured narration lengths into frames. The film's length comes out of the content; it is not typed in.
- **Theme:** components read only from the theme. There is no colour, font or radius elsewhere.

## Making a film
1. Write `theme.ts` (`theming.md`).
2. Put captures in `public/captures/` (`captures.md`). Record each capture's pixel height.
3. In `journey.ts`, list screens in story order and place origins so each flight is a clean curve in one direction. The whole line must fit the pull-back and not cross itself.
4. Measure anchors from the capture itself: open the image, take gridded crops, read pixel coordinates of the element's edges. Anchors go in the gutter beside the element, never on its text.
5. Give the first stop of every later screen a `carry` chip.
6. Run `pnpm validate`.
7. Open `pnpm studio`, check composition `film-16x9`.

A 16:9 composition is 1920x1080 and keeps 4% of the width free at the sides, 7% at the top and 5% at the bottom. A 9:16 composition is 1080x1920 and keeps 8% (86 px) at the sides, 12% (230 px) at the top and 18% (346 px) at the bottom, where platform UI sits. The engine fits each stop's ring and label inside those margins by reducing the zoom, so a label that is too wide for the frame forces a very small zoom: keep labels under about 40 characters and give wide ones a centred `portraitLabel`.

## Sound design
The engine cues sound from the schedule: do not add it stop by stop. Read `rules/sound.md` for the cue table.
- Every flight whooshes and every landing ticks; that is automatic. Do not remove cues to make a film "cleaner"; lower `audio.sfx.volume` or mute one cue with `overrides`.
- The music ducks under narration and is never louder than it. Keep `audio.musicVolume` at the default (0.5); with narration the bed already ducks to about a third under the voice, so the mix stays intelligible.
- The mood follows the brand: set `audio: {mood: 'calm' | 'driven' | 'minimal'}` on the theme (default `calm`), not a per-film track. Bring your own music with `audio.music: 'audio/file.mp3'`, or silence with `false`.
- The built-in files live in `public/audio/` and are regenerated by `pnpm run audio`. `pnpm validate` checks every referenced sound file exists.

## Narration (optional)
- Put one clip per screen in `public/vo/` and list it in `src/film/vo.json` (`{"intro": {"file": "vo/intro.mp3"}, "screens": {"<screen id>": {"file": "vo/<screen id>.mp3"}}}`; add `seconds` to skip measuring). Clip lengths are measured at render time and stretch the stops' hold, so the film length follows the audio.
- Narration never states the offer or the call to action.
- If you generate audio with a text-to-speech service, cache lines, regenerate only lines whose text changed, and read API keys from your own environment; never print or commit them.

## Proving it before rendering everything
- Build the line on ONE screen change first. Render only a frame range or a still: does the line start on the right element, does the chip ride the head, does it land on the right element?
- Then stills at every stop, mid-flight and on the pull-back, in both aspect ratios.
- Renders are CPU and memory heavy. Use low concurrency (the scripts use 2), one render at a time, and nothing heavy alongside on a small machine.

## Final checks
- One frame per second across the 16:9 (every three seconds is acceptable for 9:16): no black frames, text legible, nothing overflowing.
- Every screen change: line continuous, endpoints on the intended elements, labels not covering the element they describe.
- Hook, caption and end text: fully formed (no half-revealed line) and held at least 0.6 s; `pnpm validate` checks the hook.
- Vertical render: labels that sit beside an element in 16:9 may need `portraitLabel`.
- Sound: render the audio alone, measure it (peak below -1 dBFS, no digital silence, loudness timeline around a flight, a landing and the end card), and say plainly that nobody listened unless someone did. See `rules/sound.md`.
- Commit on a branch; do not push unless asked.

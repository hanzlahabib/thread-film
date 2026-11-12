# Changelog

## 0.3.0 - mobile and text fixes

- Phone and tablet frames (`Screen.frame: 'phone' | 'tablet'`, replaces `'device'`; `theme.frame.bezel` is gone, the bezel scales with the screen's width), camera cut-out option, `Screen.width` for captures that are not 1920 wide.
- Zoom policy: `Stop.zoom` accepts `'wide' | 'medium' | 'tight'`; the camera keeps the element with 20% of the screen's width of context (and the top bar or bottom nav near it) and never crops a device at its sides. Automatic zoom varies shots and avoids three alike in a row. `Stop.beat` sets how long a stop rests; `Stop.look` is optional.
- Label placement search on phone, tablet and text-annotated screens (`Screen.text`); `labelAt` and `labelDir` are optional. The validator warns when a label covers text, the element it describes or another stop's ring (9:16 and 16:9), and checks the hook's timing.
- `Journey.layout: 'auto'`: the engine picks row, column, grid or serpentine for the largest closing overview in each composition and joins the routes.
- Fix: hook card and end card no longer reveal text through a clip mask (half-drawn, cut-off lines); text fades and rises on the card, is formed within 8 frames, and long end titles wrap onto two or three lines.
- Mobile demo (Dayfold, four phone screens): `src/film/mobile/`, compositions `mobile-9x16`, `mobile-9x16-light`, `mobile-16x9`, `pnpm run render:mobile`, `render-screens.mjs --set mobile`, `docs/mobile.gif`.
- `pnpm validate` checks every film in the repo.

## 0.2.0 - sound

- Sound is a first-class, zero-config feature. The schedule now cues sound effects with no per-stop work: a whoosh on every flight (a longer one when the line crosses screens, peaking 40% of the way through the flight), a tick on every landing, a pulse when a ring appears, a pop when a label opens, a swap tick when a carried chip lands, a riser into the closing pull-back and a chime on the end card.
- Three generated music beds (`calm`, `driven`, `minimal`), seamless loops in D major, chosen by the new optional `theme.audio.mood` (default `calm`). The bed fades in, loops when the film is longer than it, ducks under narration and under the big effects, and fades out over the end card.
- New optional `audio` block on the journey: `music` (mood, a file under `public/`, or `false`), `musicVolume` (default 0.5), `sfx` (`false`, or `{volume, overrides}`, default volume 0.9) and `duck`. The legacy `music: {file, volume}` still works.
- `scripts/make-audio.mjs` (`pnpm run audio`) synthesises every file with Node only (no samples, no native dependencies) into `public/audio/` (about 2.4 MB, committed) and writes `src/engine/audio-manifest.json`.
- `pnpm run validate` now checks that every referenced sound file exists and that volumes are in range. `scripts/print-cues.ts` prints the cue schedule of the film.
- New skill rules file `skill/thread-film/rules/sound.md` (cue table, timing and mix rules); README has a Sound section.
- Verified by measurement only (peak, loudness, silence, a loudness timeline around three cues, a waveform and spectrogram); nobody has listened to the result.

## 0.1.0

- First release: Remotion engine for connected-thread product films (one measured line, camera following its head, ring and label on arrival, objects carried across screens).
- Two files to edit: `src/film/theme.ts` and `src/film/journey.ts`.
- Compositions `film-16x9` and `film-9x16`; dark and light themes.
- Demo film (Fernwick, Order #1042, four screens, about 29 s) in a dark and a light theme, with captures and measured anchors.
- Flat world background, caption cards for flight titles, labels that fade out before the line leaves; the demo's four screens sit in a 2x2 block so the closing pull-back shows the whole line large.
- Scripts `render:demo`, `render:screens`, `gif`, `validate`; README sample GIFs.
- Claude Code skill in `skill/thread-film/`.
- MIT licence.

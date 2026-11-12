# Changelog

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

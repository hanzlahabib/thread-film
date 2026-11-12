# The demo film

This repository ships a complete example: Order #1042 ($212.54, Mara Okafor) travelling through four screens of a fictional shop-ops product, Fernwick: catalogue, order, payment, analytics. About 29 seconds, no narration, in two themes over the same journey. Read it before writing your own.

| File | What to look at |
|------|-----------------|
| `src/film/journey.ts` | The whole film as data: four screens placed side by side, the line's route with named marks, nine stops (ring, label, count, carried chip), intro, outro, hook and end card |
| `src/film/themes/dark.ts`, `themes/light.ts` | Two complete themes over the same journey: different thread colour and type pairing. `src/film/theme.ts` picks the active one |
| `src/film/fonts.ts` | Loads the fonts bundled in `public/fonts/` (Inter and Instrument Serif, both SIL OFL, licences alongside) |
| `public/captures/` | `<screen>-dark.png` and `<screen>-light.png` for each screen, 3840x2160 (a 2x render of a 1920x1080 page) |
| `demo-screens/` | The fictional product's HTML screens, plus `anchors.json` and `anchors.md`: every element's measured rectangle, edge and gutter point |

Compositions: `film-16x9` and `film-9x16` use the active theme in `src/film/theme.ts` (dark by default); `film-16x9-light` and `film-9x16-light` always use the light theme. Render both 16:9 films with `pnpm render:demo` (`out/demo-dark.mp4`, `out/demo-light.mp4`).

How to read it:
1. In `journey.ts`, find a screen and its `route`. Each `mark` is a place the line lands; each stop's `id` equals a mark.
2. Find the first stop of any screen after the first: it has a `carry` chip, the object riding the line across (`Order #1042`, then `$212.54`, then `Order #1042 paid`).
3. Find the stops with `count`: the number counts up in front of the label and repeats a number the capture shows.
4. Find `portraitLabel`: placements for the 9:16 render, where a side label would not fit.
5. The `shot()` helper at the top maps one capture name to its dark and light files; the engine picks one from `theme.mode`.
6. Open `src/film/themes/dark.ts` and change `thread.color`; render a still. That is the whole theming loop.

Landing points come from the gutter points in `demo-screens/anchors.md`, never from text. Do not copy the demo's colours, fonts or copy onto your product. Copy the structure.

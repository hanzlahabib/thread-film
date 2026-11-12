---
name: thread-film
description: Build a product or marketing video in the "connected thread" style - one continuous line drawn through real product screens, camera following it, objects carried from screen to screen. Works for any product; theme, colours and type come from the user's project or prompt. Use for promo, launch, feature or explainer videos, or when asked for a "thread film" or to "connect the screens with a line".
---

# thread-film

One unbroken line travels through real product screens and carries the story from object to object, styled to whatever product the film is for.

## What it is
All screens sit in one 2D world, a single line is drawn through them, the camera follows the head of the line, and each arrival triggers what happens next. It replaces the common style of separate callouts and zooms on separate screens, which reads as decoration. See `rules/why-this-works.md`.

The engine lives in this repository (Remotion). A film is made by editing two files; the engine is not touched.

## Install this skill
Copy or symlink the folder into a skills directory Claude Code reads:

```bash
# for all your projects
ln -s "$(pwd)/skill/thread-film" ~/.claude/skills/thread-film
# or for one project
mkdir -p .claude/skills && cp -r skill/thread-film .claude/skills/thread-film
```

Example prompt: `Use the thread-film skill to make a 60-second launch film for my app from the screenshots in ./shots, using my app's colours.`

## When to use
- A promo, launch, feature or explainer video for an app, site or product
- "Use the thread style", "connect the screens with a line"
- Reworking a video made of isolated callouts per screen

## Core concepts
- **One world, one line, no cuts.** The middle of the film is one continuous shot.
- **Arrival causes the next thing.** The line lands beside a real element; then a ring, then a short label. Nothing appears before the line arrives.
- **Objects are carried across screens.** At each screen change a chip rides the head of the line and becomes the next thing.
- **The project supplies the look.** Never reuse another product's colours. See `rules/theming.md`.
- **Real screens only.** Every screen is a real capture with demo data. No mock UI, no invented numbers or offers.

## Files you edit
| File | Purpose |
|------|---------|
| `src/film/theme.ts` + `src/film/themes/` | The look: colours, fonts, radius, line style, window frame. `theme.ts` exports the active theme, one line to switch |
| `src/film/journey.ts` | The film: screens, world positions, the line's route, every stop, labels, carried chips, end card text |
| `public/captures/` | Your screenshots (1920 px wide, or 2x) |
| `src/film/vo.json` and `public/vo/` | Optional narration: clips in `public/vo/` listed in `vo.json` |
| `public/audio/` | Built-in sound effects and music beds, generated; sound needs no setup |

Everything in `src/engine/` is the engine; leave it alone unless fixing a bug. Compositions are `film-16x9` and `film-9x16` (active theme) and `film-16x9-light` and `film-9x16-light`. `pnpm validate` checks the journey (also the mobile demo; marks exist, captures exist for both modes, no stop without a route point) before any render. Scripts: `render:mobile`, `render:demo`, `render:16x9`, `render:9x16`, `render:screens`, `gif`, `audio` (regenerates the sound effects and music beds), `studio`, `typecheck`.

## Workflow
1. Read `rules/pattern.md` and `rules/why-this-works.md`.
2. Derive the theme from the project or prompt (`rules/theming.md`) and write it first: a theme file in `src/film/themes/`, made active in `src/film/theme.ts`.
3. Write the journey as a table: screens in story order, 3 to 4 stops per screen on real elements, and what is carried across each change.
4. Get captures (`rules/captures.md`) and measure every anchor from the capture pixels.
5. Fill `src/film/journey.ts` (`rules/building.md`).
6. Run `pnpm validate`, then prove one screen change on stills before building the rest.
7. Sound is automatic (effects cued from the schedule, a bed that follows `theme.audio.mood`, see `rules/sound.md`). Add narration if wanted; the schedule follows its measured length and the music ducks under it.
8. Render 16:9 once, check a frame per second and every screen change, then render 9:16.
9. Report honestly what was checked and what was not (audio is measured with ffmpeg, never judged from frames; say if nobody listened).

## File references
- `rules/pattern.md`: the pattern and its rules
- `rules/why-this-works.md`: the reasoning, so you can defend choices
- `rules/theming.md`: theme from the project or prompt
- `rules/building.md`: engine layout and how to make a film
- `rules/captures.md`: getting real captures safely
- `rules/sound.md`: the sound cue table, timing and mix rules, mood and options
- `rules/mobile.md`: films for phone and tablet apps (device frame, zoom policy, label placement, automatic layout)
- `rules/example.md`: the demo film in this repo (Fernwick, Order #1042, two themes)
- `rules/story.md`: write the story before any code (hook, structure, voiceover, CTA); fill `templates/story-brief.md`; check with `pnpm run story-check`

## Validation checklist
- [ ] Theme comes from this project or prompt, not from the demo film
- [ ] The middle of the film is one continuous shot
- [ ] Every stop sits on a real element and its label says what the element does
- [ ] Every screen change carries an object (or the reason it cannot is stated)
- [ ] All screens are real captures; numbers on one screen are not contradicted by another
- [ ] Offer, price, CTA and URL are props or end-card text with neutral defaults; nothing invented
- [ ] One screen change was proven on frames before the full build
- [ ] A frame per second checked, every screen change checked, and audio listened to (or the report says nobody did)

![thread-film demo: one line travelling through real product screens](docs/demo.gif)

# thread-film

Product films where one drawn line travels through your real screens, the camera follows it, and objects are carried from screen to screen. Built on [Remotion](https://www.remotion.dev).

[![MIT licence](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE) [![Built with Remotion](https://img.shields.io/badge/built%20with-Remotion-0b84f3.svg)](https://www.remotion.dev)

## Samples

![The same flight in the dark and the light theme, side by side](docs/themes.gif)

*One journey, two themes: the same moment in dark (left) and light (right).*

| | |
|---|---|
| ![A 9:16 render: the line carrying Order #1042 through the screens](docs/vertical.gif) | ![The closing pull-back showing the whole line through four screens](docs/pullback.gif) |
| The same film in 9:16, with the label placements switched for the narrow frame. | The closing pull-back: the whole line, four screens, one order. |

The demo is a 29-second film of one order (Order #1042, $212.54) travelling through four screens of a fictional shop-ops product, Fernwick. Everything in it is data in `src/film/journey.ts` and a theme in `src/film/themes/`.

## Quickstart

```bash
git clone <this-repo-url> thread-film
cd thread-film && pnpm install
pnpm run validate       # checks the journey and both themes' captures
pnpm run render:demo    # out/demo-dark.mp4 and out/demo-light.mp4 (1920x1080, about a minute each)
```

Remotion downloads a headless Chrome the first time it renders. To fetch it ahead of time, or if the download was blocked, run `pnpm exec remotion browser ensure`. To preview and scrub instead of rendering, run `pnpm studio`.

| Script | What it does |
|---|---|
| `pnpm studio` | Remotion Studio with all compositions |
| `pnpm validate` | Checks `src/film/journey.ts` and the captures for both themes before any render |
| `pnpm render:demo` | Renders `film-16x9` (active theme, dark by default) and `film-16x9-light` to `out/demo-dark.mp4` and `out/demo-light.mp4` |
| `pnpm render:16x9`, `pnpm render:9x16` | Render one composition (active theme) to `out/film-16x9.mp4` or `out/film-9x16.mp4` |
| `pnpm render:screens` | Re-render the demo screens in `demo-screens/` to `public/captures/` and re-measure `demo-screens/anchors.json` |
| `pnpm gif` | Cut `docs/*.gif` from the rendered films with ffmpeg (render `render:demo` and `render:9x16` first) |
| `pnpm typecheck` | TypeScript check |

Compositions: `film-16x9`, `film-9x16` (the active theme) and `film-16x9-light`, `film-9x16-light` (always the light theme).

## Make your own film in two files

1. `src/film/theme.ts`: the look. It exports the active theme, one line (`export const theme = dark;`). The themes themselves are in `src/film/themes/` (`dark.ts`, `light.ts`): colours, fonts, corner radius, line colour, window frame. Copy one and match your product.
2. `src/film/journey.ts`: the film. Your screens in story order, where the line travels across each one, the elements it lands on, the label for each, and the object carried to the next screen.

Put your screenshots (1920 px wide, or a whole multiple such as 2x) in `public/captures/`, then:

```bash
pnpm validate        # checks marks, captures and stops before any render
pnpm studio          # preview film-16x9 and film-9x16
```

The engine in `src/engine/` is not something you edit to make a film. Optional narration clips go in `public/vo/` and are listed in `src/film/vo.json` (empty by default, so the film has no audio); music is set in `journey.ts`.

## How the pattern works

```
 screen A            screen B             screen C
+---------+         +---------+          +---------+
| name  o-+--.      |         |          |         |
| badge   |   '-----+-> row o-+----.     |         |
+---------+         +---------+    '-----+-> total |
   ring+label          carried chip         arrival causes
   on arrival          rides the head       the next thing
```

- **One world.** All screens sit in one large 2D space. There are no cuts in the middle of the film.
- **One line.** A single stroke, one colour, drawn through the screens. The camera follows its head.
- **Arrival causes the next thing.** The line lands beside a real element; only then do a ring and a short label appear. Counters count up when the line reaches them.
- **Carried objects.** At each screen change a chip rides the head of the line and becomes the next thing: a lead becomes a row, a message becomes a conversation, a deal value becomes a number in a report.

Why this beats separate callouts per screen: [skill/thread-film/rules/why-this-works.md](skill/thread-film/rules/why-this-works.md).

## Use it with Claude Code

The repo ships a skill that knows the pattern, the two files and the workflow. Install it by symlinking or copying:

```bash
ln -s "$(pwd)/skill/thread-film" ~/.claude/skills/thread-film      # all projects
# or: mkdir -p .claude/skills && cp -r skill/thread-film .claude/skills/   # one project
```

Then ask, for example:

> Use the thread-film skill to make a 60-second launch film for my app from the screenshots in ./shots, using my app's colours.

The skill's theming rules take colours and fonts from your project or your prompt, and its capture rules keep screenshots read-only and free of personal data.

## FAQ

**Which aspect ratios?** Compositions share one journey: `film-16x9` and `film-9x16`, plus `-light` variants of each. In vertical, a label that sits beside an element in landscape can be given its own placement (`portraitLabel`).

**Narration?** Optional. Add one clip per screen to `public/vo/` and list it in `src/film/vo.json`. The film's length follows the clip lengths. Narration should not state offers or calls to action, so those stay editable.

**Themes?** Dark and light are both supported and the demo ships both over one journey: a screen lists a capture per mode (`capture: {dark, light}`) and the film picks one from `theme.mode`. The line has one colour for the whole film.

**Do I need real captures?** Yes, that is the point: real screens with demo data, not mockups. Nothing in the engine invents UI. See `skill/thread-film/rules/captures.md`.

**Will it run on a small machine?** Rendering is heavy. The scripts use `--concurrency=2`; keep it low, render one film at a time, and close other heavy programs. Previewing in `pnpm studio` is light by comparison.

## Made with thread-film

- **[LeadLyze](https://leadlyze.com)** - AI lead generation and outreach CRM. The first film in this style was LeadLyze's launch film.

Made a film? Open a pull request adding it here.

## Remotion licence

thread-film is MIT licensed (see [LICENSE](LICENSE)). It depends on Remotion, which is not MIT licensed: companies above Remotion's size threshold need a Remotion company licence. Read the current terms at https://www.remotion.dev/docs/license before using this commercially.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

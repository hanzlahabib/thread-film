# Theme, colours and type

The pattern is fixed; the look is not. Each film takes its look from the project it is for, or from the prompt. You write it as a file in `src/film/themes/` (copy `dark.ts` or `light.ts`), typed by `src/engine/theme.ts`, and make it the active theme in `src/film/theme.ts`.

## Where the theme comes from, in order
1. **The prompt.** Named colours, a mood, a brand, a reference ("dark and premium", "use our orange") win.
2. **The project's own design system.** Look before asking:
   - CSS variables and tokens: `index.css`, `globals.css`, `tailwind.config.*`, token JSON
   - Brand files: logo SVGs, favicon, a `brand/` folder, a marketing site
   - The captures themselves: sample the app's background, surface, border, accent and text colours
3. **Derived from the captures alone** when there is no token file: the film background is a shade of the app's own background, the accent is its primary action colour.
4. **Ask** only when none of the above exists. One question, two or three concrete options.

## What the Theme holds
`mode` (follows the captures), `bg`, `grid`, `surface`, `border`, `text`, `textMuted`, `accent`, `accentContrast`, `thread` (`color`, `width`, `glow`), `radius`, `fontDisplay`, `fontBody`, `chip`, `frame` (title bar, address bar, shadow), and an optional `audio: {mood}` (`calm` by default). Components read only from it.

## Rules
- **One colour for the thread.** The line, its head glow and the arrival rings share it for the whole film. Pick the colour that reads best against the captures: on a dark UI a light or saturated line, on a light UI a dark or saturated one. Check it against the busiest capture, not the emptiest.
- **Contrast first.** If the brand accent fails against the UI, keep it for labels and the end-card button and use a neutral (white or near-black) for the line itself.
- **Match the app's mode.** Dark captures get a dark world, light captures a light one, unless the prompt asks otherwise.
- **Frame chrome follows the product.** The window frame shows the product's real public URL; set `frame.bar` to 0 for full-bleed sites.
- **Type.** Use the product's fonts when available to the renderer, otherwise the closest free pairing. The demo themes use Inter and Instrument Serif, bundled in `public/fonts/` and loaded by `src/film/fonts.ts` (copy a licence file next to any font you add). One display face for headlines, one for labels.
- **Music and voice are part of the look.** A calm product gets a calm bed: set `audio: {mood: 'calm' | 'driven' | 'minimal'}` on the theme (default `calm`; see `rules/sound.md`). Optional like the rest of the theme.
- **Never copy the demo film's palette** onto another product.

## Report the theme
In the final report list where each token came from (prompt, token file, sampled from a capture) and any place the brand colour was overridden for contrast.

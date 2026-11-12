# A film for a phone or tablet app

Portrait phone screenshots and a 9:16 output need different rules from a desktop product. The demo is `src/film/mobile/` (Dayfold, a fictional day planner): compositions `mobile-9x16`, `mobile-9x16-light` and `mobile-16x9`, `pnpm run render:mobile`.

## Capture at device resolution
- Capture the screen at its CSS size (390x844 for a current phone) with a device scale factor of 3. Put the CSS size in the journey (`width: 390`, `height: 844`) and every coordinate in CSS pixels; the PNG is 1170x2532 and `pnpm validate` accepts any whole multiple.
- Take the status bar with the screenshot but leave the centre of it empty: the frame draws the camera island or punch hole over that spot (`notch: 'island' | 'punch' | 'none'`).
- Keep the app's own padding (16 to 20 px) at the sides. The strip 0 to 18 px at each edge is where the line runs (see "Layout" below), so it must hold no text.
- Include the keyboard when a stop needs it; it is a real part of the screen.
- For screens made by `scripts/render-screens.mjs --set <name>`, every line of text is measured into `anchors.json` as `text` rectangles; pass them as `Screen.text` so labels avoid them. A screen with no text list gets its whole area treated as content, so labels go to the gutter beside the device.

## Frame
- `frame: 'phone'` (or `'tablet'`) on each screen, or `kind: 'phone'` in the theme's `frame` for the whole film. It draws a plain rounded body, a rim, the capture as the glass and an optional camera cut-out; the body colour is `theme.frame.barBg`, the rim `theme.border`. No brand marks, no buttons.
- Screens in a web film can mix: a phone screen next to browser screens.

## Zoom policy
The camera never zooms past the point where the stop's element and its context fit the safe area. Context is at least 20% of the screen's width on every side, plus the top bar when the element is within 22% of the top, or the bottom nav when within 22% of the bottom. On a phone or tablet the device is also never cropped at its sides (12% of the frame's width stays free on each side) and the frame always shows at least 40% of the screen's height.

`Stop.zoom` is `'wide'` (the whole device with its bezel in the safe area), `'medium'` (halfway, geometrically) or `'tight'` (the limit above). A number is still allowed and is capped at the tight limit. Leave `zoom` out and the engine chooses: the first stop on a screen is wide (the establishing shot), a small element is tight, a larger one medium, and in 9:16 on a phone a larger element is wide (the whole device height). No three stops in a row share a level. `look` is optional: it defaults to the middle of the ring. `beat: 'key'` makes a stop rest about 1.6 times as long (the moment the film is about); `'light'` about 0.75.

## Labels
Leave `labelAt` and `labelDir` out on phone screens. The engine tries the declared placement, then the other three sides of the element at a few offsets along its edge, then the gutter on either side of the device, and keeps the one that covers the least text and no ring. `pnpm validate` warns, for 9:16 and 16:9, when a label still covers another stop's ring, the element it describes or text of the capture. Keep labels short: a 9:16 label is about 33 px type on a frame 1080 wide.

## Layout
Set `layout: 'auto'` on the journey. The engine arranges the screens for the shape of each composition (row, column, grid or serpentine, whichever shows them largest in the closing overview; for four phones in 9:16 that is a 2x2) and joins the routes. A route runs from its first point to its last along the margin lane: the left lane at x = 10 or the right lane at x = 380 for a 390-wide phone, landing beside elements with a stub of 10 px to their edge, and crossing the screen only through empty strips between blocks. The first and last route points must be on the lane; the engine adds the legs that leave and enter by the sides facing the neighbours. `origin` is ignored.

Closing line: in 9:16 the type block takes height from the map. Two short lines (no `portraitLines`) leave the phones more room than three large ones.

## What to avoid
- A browser frame around a phone capture, or a 1920-wide canvas with a phone pasted in it.
- Tight zoom on every stop. Let the hints and the default alternate.
- Labels longer than about 28 characters, and routes that cross text in the middle of a screen.
- Fitting four phones in one row in 9:16: they come out about 200 px wide. Let the layout choose.

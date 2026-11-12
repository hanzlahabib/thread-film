# Anchors

Candidate pointing targets for each demo screen, in 390x844 coordinates
(top-left origin). Measured from the rendered page by
`scripts/render-screens.mjs` (`getBoundingClientRect`), so re-run it after
editing a screen. Generated file: edit the `data-anchor` attributes in the
HTML instead of this table.

- **Rect**: `x, y, w, h` of the element.
- **Edge**: the midpoint of the chosen side, where a line touches the element.
- **Gutter**: a point 18px outside that edge in empty space. No text
  node lies on the segment from gutter to edge, so a line can land there
  without crossing text.
- **Free run**: how many px beyond the gutter, in the same direction, are still
  free of text (capped at 240). Use it to decide how long an approach
  segment can be.

The same names recur on every screen for the thread's carried values:
`object` (Order #1042), `amount` ($212.54), `customer` (Mara Okafor),
`status`, `primary-action`, `timeline`.

## new-task

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `title` | Call mum | 20, 126, 350, 76 | top | (195, 126) | (195, 108) | 12 |
| `when` | 6:30 pm | 101, 222, 86, 36 | right | (188, 240) | (206, 240) | 4 |

## plan

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `block` | Call mum / 6:30 pm, 20 min | 76, 487, 294, 60 | top | (223, 487) | (223, 469) | 240 |
| `remind` | Remind me 10 min before | 20, 676, 350, 60 | top | (195, 676) | (195, 658) | 236 |

## streaks

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `streak` | 12 / day streak, your best yet | 20, 122, 350, 150 | top | (195, 122) | (195, 104) | 240 |
| `habit` | Call mum / 3 / 4 | 20, 420, 350, 64 | top | (195, 420) | (195, 402) | 12 |

## today

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `progress` | 3 of 7 done / Four left before dinner | 20, 136, 350, 92 | top | (195, 136) | (195, 118) | 240 |
| `add` |  | 314, 676, 56, 56 | left | (314, 704) | (296, 704) | 240 |

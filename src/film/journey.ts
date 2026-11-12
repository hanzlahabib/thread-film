import type {EndCard, Hook, Journey} from '../engine';

/**
 * THE STORY OF THE FILM. Edit this file (and theme.ts) and nothing else.
 *
 * A journey is a list of screens (real captures in public/captures) and a list of stops (the elements the line
 * lands beside). The engine draws one line through all of it, flies the camera after the head, and times
 * everything. `pnpm run validate` checks this file before you render.
 *
 * COORDINATES. Everything is in capture pixels: the capture is 1920 wide, (0,0) is its top-left corner and
 * `Screen.height` is its height. A screen's `origin` is where that corner sits in the shared world; place the
 * screens so each flight from one to the next is a clean curve in one direction and the whole line never
 * crosses itself.
 *
 * THE FULL TYPES (defined in src/engine/types.ts):
 *
 * Screen {
 *   id        unique name; stops and vo.json refer to it
 *   kicker    short name in the corner pill while the line is on this screen
 *   title     caption lines shown on a card while the line flies in (not on the first screen)
 *   capture   path under public/, or {dark, light} when the product has both
 *   height    capture height in pixels (width is always 1920)
 *   url       address-bar text (browser frame): the product's real public URL
 *   frame?    'browser' | 'device' | 'none': overrides theme.frame.kind for this screen
 *   origin    {x, y} of the capture's top-left corner in the world
 *   route     the line across this screen: points, first = where it enters, last = where it leaves.
 *             A point is {x, y, r?, mark?}: `r` rounds the corner, `mark` names a landing point a stop can
 *             use. Or {through: [pts], startMark?, mark?} for a smooth run (along a chart line).
 *             Run the line in the gutters between blocks, never over text.
 *   narration? set from vo.json instead (see below)
 * }
 *
 * Stop {
 *   id        equals a `mark` on its screen's route: the line lands exactly there
 *   screen    the screen id
 *   stub?     a short branch from the landing point to the element's edge, grown on arrival
 *   ring?     {x, y, w, h}: outline of the element, pulsed on arrival
 *   label     what the element does for the user ("Reply lands on the lead's record", not "Inbox")
 *   labelAt   {x, y}: where the label pill attaches
 *   labelDir  'up' | 'down' | 'left' | 'right': which side of labelAt the pill grows to
 *   portraitLabel? {at, dir}: placement for 9:16 when the side label would cover the element
 *   count?    {to, prefix?, suffix?, decimals?}: a number that counts up in front of the label
 *   look      {x, y}: capture point the camera centres on
 *   zoom      frame pixels per capture pixel at this stop (0.9 to 1.4 is typical)
 *   travel?   frames to get here from the previous stop. Default 20 inside a screen, 38 for a flight.
 *   pace?     'ramp' (default: leave fast, land softly) | 'glide' (even pace past several elements)
 *   hold?     frames to rest here. Default 44. Stretched to fit voiceover when there is one.
 *   carry?    {icon, text}: the object riding the head to this stop. Only on the FIRST stop of a screen,
 *             and never on the very first stop of the film: it needs a stop to leave from.
 *             icon: 'plus' | 'box' | 'receipt' | 'card' | 'mail' | 'reply' | 'user' | 'chart' | {initials}
 *   ticks?    [{mark, at}]: elements passed on the way here; they pulse when the head passes
 * }
 *
 * Journey { screens, stops (in the order the line reaches them), reveals?, intro, outro, footnote?, music? }
 *   reveals  covers over part of a capture that the head of the line pulls back (drawing a chart)
 *   intro    {frames}: the opening wide shot of the first screen
 *   outro    {lines, frames}: the closing pull-back that shows the whole line, with the closing words
 *   music    {file, volume}: optional bed under public/
 *
 * TIMING needs no voiceover: the per-stop `travel` and `hold` frames above are the whole schedule.
 * To follow a voiceover instead, drop mp3 files in public/vo and list them in src/film/vo.json (see the
 * `Vo` type: `intro` and one entry per screen id); the film then lasts as long as the clips need.
 */

// THE DEMO: Order #1042 ($212.54, Mara Okafor) travels through four Fernwick screens. All coordinates were
// measured from the screens by `pnpm run render:screens` (demo-screens/anchors.md). The line runs in the gutters
// beside elements and in the empty strips above and below the pages, never over text.

/** One capture per theme: the film picks `-dark` or `-light` from theme.mode (see ByMode in the engine). */
const shot = (name: string) => ({dark: `captures/${name}-dark.png`, light: `captures/${name}-light.png`});

// The captures are 3840x2160 (a 2x render of a 1920x1080 page); coordinates stay in 1920x1080 page pixels.
const H = 1080;
// The four screens sit in a 2x2 block: catalogue and order on top, payment and analytics below, so the closing
// pull-back can show the whole line large. PITCH_X leaves a gap the flights curve through; PITCH_Y the band the
// line crosses between the rows.
const PITCH_X = 2300;
const PITCH_Y = 1450;
/** Empty strip between the top bar and the page content: the line runs along it between landing points. */
const STRIP = 80;

export const journey: Journey = {
  screens: [
    {
      id: 'catalogue',
      kicker: 'Catalogue',
      title: ['Add a product,', 'a draft opens'],
      capture: shot('catalogue'),
      height: H,
      url: 'app.fernwick.example/catalogue',
      origin: {x: 0, y: 0},
      route: [
        {x: -40, y: 700}, // enters through the empty part of the sidebar
        {x: 278, y: 700},
        {x: 278, y: 438, mark: 'product'}, // gutter left of the Linen Throw card
        {x: 278, y: STRIP},
        {x: 1868, y: STRIP},
        {x: 1868, y: 961, mark: 'create'}, // gutter right of Create order
        {x: 1960, y: 961}, // leaves through the right edge
      ],
    },
    {
      id: 'order',
      kicker: 'Order',
      title: ['One order,', 'everything on it'],
      capture: shot('order'),
      height: H,
      url: 'app.fernwick.example/orders/1042',
      origin: {x: PITCH_X, y: 0},
      route: [
        {x: -40, y: 700},
        {x: 278, y: 700},
        {x: 278, y: 115, mark: 'order'}, // gutter left of the order number
        {x: 278, y: STRIP},
        {x: 1898, y: STRIP},
        {x: 1898, y: 139, mark: 'pay'}, // margin right of Take payment
        // Down the empty right margin, then left along the band between the two rows to above the payment
        // screen's entry. The route may run outside its own capture: it is world geometry.
        {x: 1898, y: 1130},
        {x: 278 - PITCH_X, y: 1130},
        {x: 278 - PITCH_X, y: 1190},
      ],
    },
    {
      id: 'payment',
      kicker: 'Payment',
      title: ['Paid in', 'two seconds'],
      capture: shot('payment'),
      height: H,
      url: 'app.fernwick.example/payments/pay_3k9x2',
      origin: {x: 0, y: PITCH_Y},
      route: [
        {x: 278, y: -40}, // enters from above the sidebar gutter
        {x: 278, y: STRIP},
        {x: 1366, y: STRIP}, // along the empty strip, then down the gap between the table and the detail panel
        {x: 1366, y: 316, mark: 'amount'},
        {x: 1366, y: 965, mark: 'receipt'},
        {x: 1366, y: 1052},
        {x: 1960, y: 1052},
      ],
    },
    {
      id: 'analytics',
      kicker: 'Analytics',
      title: ['And into', 'the numbers'],
      capture: shot('analytics'),
      height: H,
      url: 'app.fernwick.example/analytics',
      origin: {x: PITCH_X, y: PITCH_Y},
      route: [
        {x: -40, y: STRIP},
        {x: 1087, y: STRIP}, // gap between two KPI cards
        {x: 1087, y: 372},
        {x: 1033, y: 372},
        {x: 1033, y: 439, mark: 'point'}, // gutter left of the #1042 marker
        {x: 278, y: 439}, // across the empty top of the plot
        {x: 278, y: 810, mark: 'top'}, // gutter left of the first product row
        {x: 278, y: 1052},
        {x: 1401, y: 1052},
        {x: 1401, y: 803, mark: 'recent'}, // the 40px between #1042 and the customer name
      ],
    },
  ],
  stops: [
    {
      id: 'product',
      screen: 'catalogue',
      stub: {x: 296, y: 438},
      ring: {x: 296, y: 238, w: 355, h: 400},
      label: 'Add a product and a draft order opens',
      labelAt: {x: 660, y: 408},
      labelDir: 'right',
      portraitLabel: {at: {x: 640, y: 650}, dir: 'down'},
      look: {x: 640, y: 420},
      zoom: 1.5,
      hold: 32,
    },
    {
      id: 'create',
      screen: 'catalogue',
      stub: {x: 1857, y: 961},
      ring: {x: 1451, y: 937, w: 406, h: 48},
      label: 'Create order makes it #1042',
      labelAt: {x: 1654, y: 668},
      labelDir: 'down',
      look: {x: 1654, y: 815},
      zoom: 1.6,
      hold: 32,
      travel: 32,
    },
    {
      id: 'order',
      screen: 'order',
      stub: {x: 296, y: 115},
      ring: {x: 296, y: 98, w: 180, h: 35},
      label: 'Draft becomes an order when you add it',
      labelAt: {x: 650, y: 115},
      labelDir: 'right',
      portraitLabel: {at: {x: 640, y: 92}, dir: 'up'},
      carry: {icon: 'receipt', text: 'Order #1042'},
      look: {x: 640, y: 170},
      zoom: 1.4,
      hold: 32,
    },
    {
      id: 'pay',
      screen: 'order',
      stub: {x: 1880, y: 139},
      ring: {x: 1716, y: 118, w: 164, h: 42},
      label: 'Take payment starts the charge',
      labelAt: {x: 1740, y: 164},
      labelDir: 'down',
      look: {x: 1700, y: 200},
      zoom: 1.9,
      hold: 32,
      travel: 32,
    },
    {
      id: 'amount',
      screen: 'payment',
      stub: {x: 1399, y: 316},
      ring: {x: 1399, y: 291, w: 174, h: 51},
      label: 'captured in 2 seconds',
      count: {to: 212.54, prefix: '$', decimals: 2},
      labelAt: {x: 1352, y: 316},
      labelDir: 'left',
      portraitLabel: {at: {x: 1100, y: 290}, dir: 'down'},
      carry: {icon: 'card', text: '$212.54'},
      look: {x: 1150, y: 380},
      zoom: 1.5,
      hold: 32,
      travel: 70,
    },
    {
      id: 'receipt',
      screen: 'payment',
      stub: {x: 1399, y: 965},
      ring: {x: 1399, y: 941, w: 458, h: 48},
      label: 'One click emails Mara her receipt',
      labelAt: {x: 1628, y: 930},
      labelDir: 'up',
      look: {x: 1500, y: 900},
      zoom: 1.4,
      hold: 32,
      travel: 30,
    },
    {
      id: 'point',
      screen: 'analytics',
      stub: {x: 1051, y: 439},
      ring: {x: 1051, y: 397, w: 200, h: 83},
      label: 'joins the revenue curve',
      count: {to: 212.54, prefix: '$', decimals: 2},
      labelAt: {x: 1022, y: 415},
      labelDir: 'left',
      portraitLabel: {at: {x: 800, y: 406}, dir: 'down'},
      carry: {icon: 'receipt', text: 'Order #1042 paid'},
      look: {x: 800, y: 470},
      zoom: 1.4,
      hold: 32,
    },
    {
      id: 'top',
      screen: 'analytics',
      stub: {x: 297, y: 810},
      ring: {x: 297, y: 781, w: 230, h: 58},
      label: 'Your throw tops the sales',
      labelAt: {x: 560, y: 810},
      labelDir: 'right',
      look: {x: 700, y: 800},
      zoom: 1.5,
      hold: 32,
      travel: 28,
    },
    {
      id: 'recent',
      screen: 'analytics',
      stub: {x: 1383, y: 803},
      ring: {x: 1334, y: 793, w: 49, h: 19},
      label: 'Paid, and first in recent orders',
      labelAt: {x: 1650, y: 1030},
      labelDir: 'down',
      look: {x: 1500, y: 900},
      zoom: 1.5,
      hold: 32,
      travel: 36,
    },
  ],
  intro: {frames: 40},
  outro: {lines: ['One order,', 'four screens, one line'], frames: 72},
};

// Opening card.
export const hook: Hook | undefined = {headline: 'Follow one order through Fernwick', sub: 'Order #1042 · $212.54', frames: 54};

// Closing card: the repo name is the call to action. No offer, no price.
export const end: EndCard = {title: 'Make your own film in two files.', kicker: 'Open source', cta: 'thread-film'};

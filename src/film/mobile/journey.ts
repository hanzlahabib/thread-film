import type {EndCard, Hook, Journey, Rect, Screen} from '../../engine';
import anchors from './anchors.json';

/**
 * THE MOBILE DEMO: a task, "Call mum", travels through four screens of Dayfold, a fictional day planner. The
 * screens are hand-written HTML in demo-screens/mobile, captured at 390x844 and scale 3 by
 * `pnpm run render:screens -- --set mobile`, which also measures every anchor and every line of text into
 * ./anchors.json. Coordinates here are CSS pixels of that 390x844 page.
 *
 * LAYOUT 'auto': the engine arranges the four phones for the shape of each composition (a 2x2 serpentine in
 * 9:16, a row in 16:9) and adds the legs that leave and enter each phone. So a route here only has to run on
 * the margin lane (about 10 px inside the edge, where the app keeps clear of its content) from its first
 * point to its last, landing beside each element on the way: the left lane at x = 10, the right lane at x = 380.
 */

type Measured = {anchors: Record<string, {rect: Rect}>; text: Rect[]};
const measured = anchors.screens as unknown as Record<string, Measured>;

/** The rectangle of a named anchor, from the measurement. */
const rect = (screen: string, anchor: string): Rect => {
  const hit = measured[screen]?.anchors[anchor];
  if (!hit) throw new Error(`No anchor "${anchor}" on the mobile screen "${screen}". Run: pnpm run render:screens -- --set mobile`);
  return hit.rect;
};

const W = 390;
const H = 844;
const LEFT = 10;
const RIGHT = W - 10;
/** The arrangement sets the origins; this is a placeholder the engine replaces. */
const ORIGIN = {x: 0, y: 0};

const screen = (id: string, kicker: string, title: string[], route: Screen['route']): Screen => ({
  id,
  kicker,
  title,
  capture: {dark: `captures/mobile/${id}-dark.png`, light: `captures/mobile/${id}-light.png`},
  width: W,
  height: H,
  frame: 'phone',
  url: 'dayfold.example',
  text: measured[id]?.text,
  origin: ORIGIN,
  route,
});

/** The ring of an anchor, and the landing's stub to the near edge of it from the lane. */
const ringOf = (id: string, anchor: string) => rect(id, anchor);
const centreY = (r: Rect) => Math.round(r.y + r.h / 2);

const today = {progress: ringOf('today', 'progress'), add: ringOf('today', 'add')};
const task = {title: ringOf('new-task', 'title'), when: ringOf('new-task', 'when')};
const plan = {block: ringOf('plan', 'block'), remind: ringOf('plan', 'remind')};
const streaks = {streak: ringOf('streaks', 'streak'), habit: ringOf('streaks', 'habit')};

/** The empty strip between a card and the heading under it, where a route can cross the screen. */
const CORRIDOR_TODAY = 240;
/** The empty strip under the chips, above the note field. */
const CORRIDOR_TASK = 270;

export const journey: Journey = {
  layout: 'auto',
  screens: [
    screen('today', 'Today', ['Start the day'], [
      {x: LEFT, y: centreY(today.progress), mark: 'progress'}, // left lane, beside the progress card
      {x: LEFT, y: CORRIDOR_TODAY},
      {x: RIGHT, y: CORRIDOR_TODAY}, // across the empty strip under the card
      {x: RIGHT, y: centreY(today.add), mark: 'add'}, // right lane, beside the add button
    ]),
    screen('new-task', 'New task', ['Add it in', 'a few taps'], [
      {x: LEFT, y: centreY(task.title), mark: 'title'},
      {x: LEFT, y: CORRIDOR_TASK},
      {x: task.when.x + task.when.w / 2, y: CORRIDOR_TASK, mark: 'when'}, // under the 6:30 pm chip
      {x: RIGHT, y: CORRIDOR_TASK},
    ]),
    screen('plan', 'Plan', ['It lands on', 'the day plan'], [
      {x: RIGHT, y: 130},
      {x: RIGHT, y: centreY(plan.block), mark: 'block'},
      {x: RIGHT, y: centreY(plan.remind), mark: 'remind'},
    ]),
    screen('streaks', 'Streaks', ['And counts toward', 'the streak'], [
      {x: RIGHT, y: centreY(streaks.streak), mark: 'streak'},
      {x: RIGHT, y: centreY(streaks.habit), mark: 'habit'},
    ]),
  ],
  stops: [
    {id: 'progress', screen: 'today', stub: {x: today.progress.x, y: centreY(today.progress)}, ring: today.progress, label: 'Your day at a glance'},
    {id: 'add', screen: 'today', stub: {x: today.add.x + today.add.w, y: centreY(today.add)}, ring: today.add, label: 'One tap starts a task', travel: 34},
    {id: 'title', screen: 'new-task', stub: {x: task.title.x, y: centreY(task.title)}, ring: task.title, label: 'Type it once', carry: {icon: 'plus', text: 'Call mum'}, beat: 'key'},
    {id: 'when', screen: 'new-task', stub: {x: task.when.x + task.when.w / 2, y: task.when.y + task.when.h}, ring: task.when, label: 'Pick the time: 6:30 pm'},
    {id: 'block', screen: 'plan', stub: {x: plan.block.x + plan.block.w, y: centreY(plan.block)}, ring: plan.block, label: 'On your plan', carry: {icon: 'box', text: 'Call mum, 6:30 pm'}, beat: 'key'},
    {id: 'remind', screen: 'plan', stub: {x: plan.remind.x + plan.remind.w, y: centreY(plan.remind)}, ring: plan.remind, label: 'A nudge before it', zoom: 'medium'},
    {id: 'streak', screen: 'streaks', stub: {x: streaks.streak.x + streaks.streak.w, y: centreY(streaks.streak)}, ring: streaks.streak, label: 'day streak, and counting', count: {to: 12}, carry: {icon: 'chart', text: 'Call mum, done'}},
    {id: 'habit', screen: 'streaks', stub: {x: streaks.habit.x + streaks.habit.w, y: centreY(streaks.habit)}, ring: streaks.habit, label: 'Ticked off, 3 of 4', beat: 'key'},
  ],
  intro: {frames: 40},
  outro: {lines: ['One task,', 'four screens, one line'], frames: 72},
};

export const hook: Hook | undefined = {headline: 'Follow one task through your day', sub: 'Call mum · 6:30 pm', frames: 66};

// Closing card: the repo name is the call to action. No offer, no price.
export const end: EndCard = {title: 'Films for phone apps, too.', kicker: 'Open source', cta: 'thread-film'};

# Writing the story first

Write the story before any capture, theme or code. A thread film can have a perfect line and still be a bad film if the story is a screen tour. The usual failure looks like this: a washed title card, then each screen visited in menu order, four 5-second voiceover lines naming features, and an end card. It has no hook, no problem and no payoff. Viewers cannot say what changed for anyone.

Fill in `templates/story-brief.md` first. Then run `pnpm run story-check` once the journey has a `story` block (see the end of this page).

## 1. The promise, the protagonist, the before and after
- **One promise, one sentence.** "Know which invoice to chase today." If it needs "and", you have two films.
- **One protagonist.** Either a person (Dana, who runs a bakery and is late with a quote) or an object followed through the product (the quote itself). The thread already wants an object: pick the person whose problem it solves and the object that carries it.
- **One before and one after.** Before: the situation in the viewer's own words, felt ("I answer the same three questions every morning"). After: the same situation, changed, and visible on a real screen. If you cannot point at the screen that shows the "after", the film has no payoff.

## 2. The first 2 seconds
The opening is about the viewer's problem, never the product name and never a washed title. Spoken or on screen, it must be specific and concrete enough that the right viewer thinks "that is me" before second 2. The product name belongs to the end.

Six hook patterns (all examples fictional):

| Pattern | What it does | Example |
|---|---|---|
| Moment of friction | Drops the viewer into the annoying second | "Forty-one unread replies. Which one is the buyer?" |
| Surprising number | A real, checkable number that reframes the problem | "Dana types the same quote twice a day." (only if the number is true) |
| Question | The question the viewer already asks | "Why does Friday's invoice run still take four clicks?" |
| Before / After | Two states, one cut or one line between them | "Monday: nine tabs. Friday: one list." |
| Watch this | A demo promise, then deliver it at once | "Watch a quote go out in ten seconds." |
| Confession | A human admission, first or second person | "I used to forget the restock until the shelf was empty." |

Rules: 12 words or fewer; one concrete noun the viewer owns (an inbox, a shelf, a quote); no adjectives that sell. Write three, pick one, and keep the other two in the brief.

## 3. Structure and durations
Every film has the same seven beats. Only their lengths change.

| Beat | 15 s | 30 s | 60 s |
|---|---|---|---|
| Hook (the viewer's problem) | 0 to 2 | 0 to 2 | 0 to 3 |
| The problem made felt | 2 to 4 | 2 to 6 | 3 to 10 |
| The turn (the first move that changes it) | 4 to 6 | 6 to 9 | 10 to 15 |
| The journey: 3 to 4 screens, each answering "and then what?" | 6 to 11 | 9 to 22 | 15 to 45 |
| The payoff moment (one hold) | 11 to 13 | 22 to 25 | 45 to 51 |
| Proof (real screen, honest caption) | inside payoff | 25 to 27 | 51 to 54 |
| One CTA | 13 to 15 | 27 to 30 | 54 to 60 |

Rules that make the journey a story:
- **Every screen changes the protagonist's situation.** After each screen, ask "and then what?". If the answer is "nothing, it is just another feature", cut the screen. Cause and effect is the thread: the chip that leaves one screen arrives somewhere and something is now different.
- **Cuts and flights follow narration beats.** The line leaves for the next screen when the voiceover line about the current one ends, and lands as the next line begins. Never let the picture move on a timer the words do not know about. With the engine, give each screen a clip and let its measured length set the hold.
- **Do not open on a home or settings screen** unless the story starts there. Start on the screen where the problem is felt.

## 4. Voiceover rules
- Spoken sentences of **6 to 12 words**, one idea each.
- **Second person** ("you drop it in"), present tense.
- Concrete nouns and numbers from the real screen ("Tuesday", "three invoices", "12 days"), not categories ("your workflow").
- No feature lists: not "invoices, reminders and more". A line that needs two "and"s is two lines.
- Ban: seamless, powerful, effortless, robust, all-in-one, next-generation, revolutionary.
- Timing: about **2.5 words per second** read aloud. A 9-word line takes 3.5 s. One line per beat, with a short breath (0.3 to 0.5 s) between lines.
- Never state the offer or the CTA in narration, so they stay editable (see `building.md`).
- Read every line aloud before you generate audio. If you stumble, the voice will too.

## 5. The pacing curve
- **Slow start**: about 1 s of calm on the first frame so the hook can be read or heard.
- **Accelerating flights**: the first flight is gentle, later ones faster, as the story picks up. Use the stops' `travel` and `pace` for this.
- **Vary the zoom.** A wide shot to set the scene, a close one on the detail that matters, a wide one for the pull-back. Every stop at the same zoom reads as a slideshow.
- **One hold on the payoff**: the longest rest in the film, 2 to 3 s, on the screen that shows the "after".
- **A quiet end**: no new movement in the last 2 s except the end card settling.

## 6. The call to action
- One action, in one place ("Get it on Google Play", "Try it at example.com").
- On screen long enough to read twice: at least 2.5 s for a short CTA, plus 0.5 s per extra 4 words.
- Props, not invented offers: the offer, price and URL come from the end card data and stay editable. If you do not know the real offer, state only the action.
- Do not put the CTA in the narration.

## 7. Checklist
- [ ] One-sentence promise, one protagonist, one before and one after
- [ ] Hook is about the viewer's problem, 12 words or fewer, no product name, lands by second 2
- [ ] The problem is shown or said in the viewer's words before any product screen
- [ ] Each screen answers "and then what?" and changes the protagonist's situation
- [ ] Cuts, flights and holds follow the narration beats
- [ ] Voiceover lines are 6 to 12 words, second person, concrete, no lists, no filler adjectives
- [ ] One payoff hold, on a real screen that shows the "after"
- [ ] Proof is only what the real screens show; no invented counts, ratings or quotes
- [ ] One CTA, one place, on screen at least 2.5 s
- [ ] Zoom varies across stops; flights accelerate; the end is quiet
- [ ] `pnpm run story-check` has no warnings

## 8. Five anti-patterns
1. **Feature tour.** Screens visited in menu order, each introduced by its feature name. Fix: follow one object whose situation changes.
2. **Title cards over UI.** Big words on a washed overlay at the start (or between screens) while the product sits blurred behind. Fix: open on the problem, on a real screen, with the hook as a short label or a spoken line.
3. **Every stop the same zoom.** The camera never makes a decision. Fix: a wide set-up, a close detail, a wide payoff.
4. **Nothing at stake.** No problem is ever shown, so the payoff has nothing to resolve. Fix: spend 2 to 6 s making the friction felt before the first flight.
5. **The CTA doing the payoff's job.** The film ends on "Download now" without ever showing the better day. Fix: hold on the "after" screen first, then one CTA.

## The `story` block
Put an optional `story` in the journey file, typed with `StoryJourney` from `src/engine/story.ts`:

```ts
import type {StoryJourney} from '../engine';
export const journey: StoryJourney = {/* screens, stops... */ story: {promise, hook, problem, payoff, cta, voiceover: [...]}};
```

`pnpm run story-check` reads it and warns; the engine ignores it. You can also pass files: `pnpm run story-check scripts/story-samples/weak.json`. A clean check does not make a story good; it only catches the common failures above.

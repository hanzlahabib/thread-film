# The connected-thread pattern

What a film in this style must do, for any product. Colours, type and frame style come from `theming.md`, not from this page.

## Structure
1. **Opening wide shot**: the first screen, headline over it. Short.
2. **The journey**: one continuous shot through all screens. This is most of the film.
3. **Pull-back**: the camera rises to show the whole line across every screen at once. This is the payoff shot; keep it.
4. **End card**: title, call to action, URL. Driven by data, never baked in.

Tell one story the whole way: one object followed from where it enters the product to the outcome it produces (a CRM: a lead found, recorded, sequenced, replied, deal, report; a store: a product listed, ordered, paid, shipped, reviewed). A list of features is not a story.

## The thread
- One line for the whole film: one colour, one stroke width, one head glow, one easing. Two lines or two styles read as decoration again.
- The line draws itself; a glowing head leads the stroke. What is drawn and where the head is come from the same measured path (`Trail` in `src/engine/geometry.ts`), or the head drifts off the stroke.
- Speed: leave fast, land softly. Long flights are quick; runs past several elements inside a screen keep an even pace so each one registers.
- Route in the gutters between UI blocks with rounded corners. The line lands beside an element, never on top of its text. A short stub then grows from the landing point to the element's edge.
- The camera follows the head, slightly ahead of it on long flights.

## Stops
- 3 to 4 stops per screen, in the order a user would act (on a record page: the name, its status badges, its history, the primary action).
- On arrival, in this order: ring pulse on the element, then the label. Counters count up only when the line reaches them. A chart is uncovered at the head of the line as it runs along the curve.
- Labels are short and specific: what the element does for the user. "Reply lands on the lead's record" is a label; "Unified inbox" is not.
- Skip a screen that is an empty state or a warning. A stop needs real content to land on.

## Screen changes
- The line exits an element, flies to the next screen and lands on the related element there.
- Something rides the head across: a chip with an icon and a few words naming the object (a person's name, "Step 1 email", "$28,500 deal"). On landing it settles into the element it becomes.
- Lay screens out in the world so each flight is a clean curve in one direction; avoid flights that cross an earlier part of the line.

## Sound
Sound is on by default and needs no per-stop work (cue table and timing in `rules/sound.md`).
- Every flight whooshes (a long whoosh when it crosses screens), every landing ticks, a ring pulse and a label opening each get their own small sound, a carried chip swaps, a riser leads into the closing pull-back and a chime marks the end card.
- A quiet music bed runs under the whole film, fades in and out, and ducks under narration and under the big effects. It is never louder than narration.
- The mood of the bed follows the brand (`theme.audio.mood`: calm, driven or minimal).
- Narration (optional) follows the journey, one clip per screen, and never states the offer or the call to action, so those can change without new audio. Sync landings to narration beats.

## Content rules
- Real captures with demo data; show the product's real public URL in the frame's address bar.
- Do not invent the offer, discount, dates, customer counts, testimonials or integrations.
- Describe features as they really work. If something is manual or assisted, do not present it as automatic.
- Follow the project's own brand and language rules when it has them; they win over this page.
- A footnote says the UI is real and the data is demo data.

import type {Journey} from './types';

/**
 * Optional story layer. The engine never reads it; `pnpm run story-check` does. Write it before the journey
 * (see skill/thread-film/rules/story.md).
 */
export type Story = {
  /** One sentence: what the viewer gets. */
  promise: string;
  /** The first 2 seconds, spoken or on screen. About the viewer's problem, not the product name. */
  hook: string;
  /** The problem in the viewer's words. */
  problem: string;
  /** The moment the "after" is shown. Should appear in at least one stop label. */
  payoff: string;
  /** The one call to action. Not narrated. */
  cta: string;
  /** Narration lines in order, one per beat. Optional; the check reads them when present. */
  voiceover?: string[];
  /** The product's name, so the check can tell when the hook is just the name. Optional. */
  product?: string;
};

/** A Journey with an optional story block. Type your journey with this to keep `story` checked by TypeScript. */
export type StoryJourney = Journey & {story?: Story};

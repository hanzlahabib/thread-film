// Warns about common story failures in the optional `story` block of a journey (see skill/thread-film/rules/story.md).
// Usage: pnpm run story-check                      checks the `journey` exported by src/film/journey.ts
//        pnpm run story-check a.json b.json        checks sample files shaped {story, stops: [{label}]}
//        add --strict to exit 1 on any warning
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {Story} from '../src/engine/story';

/** A hook longer than this cannot land in the first 2 seconds (about 2.5 words per second, plus a breath). */
export const MAX_HOOK_WORDS = 12;
/** Average voiceover line length above which lines stop being single spoken ideas. */
export const MAX_AVG_VO_WORDS = 14;
/** A line with this many "and"s is a feature list. */
export const MAX_AND_PER_LINE = 2;

export type StoryInput = {story?: Story; stops: {label: string}[]};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const significant = (s: string) => norm(s).split(' ').filter((w) => w.length >= 4);

/** Returns one message per problem found. An empty list means no warnings. */
export function checkStory({story, stops}: StoryInput): string[] {
  if (!story) return ['no `story` block: write the story first (skill/thread-film/rules/story.md).'];
  const out: string[] = [];

  const hook = norm(story.hook);
  const product = story.product ? norm(story.product) : '';
  if (!hook) out.push('hook is empty.');
  else {
    if (product && (hook === product || (words(hook).length <= 4 && hook.includes(product)))) out.push(`hook is the product name ("${story.hook}"): open on the viewer's problem instead.`);
    if (words(story.hook).length > MAX_HOOK_WORDS) out.push(`hook is ${words(story.hook).length} words; keep it to ${MAX_HOOK_WORDS} or fewer so it lands in 2 seconds.`);
  }

  if (!story.problem?.trim()) out.push('no problem line: say what is wrong in the viewer\'s own words.');

  const lines = (story.voiceover ?? []).filter((l) => l.trim());
  if (lines.length > 0) {
    const avg = lines.reduce((n, l) => n + words(l).length, 0) / lines.length;
    if (avg > MAX_AVG_VO_WORDS) out.push(`voiceover lines average ${avg.toFixed(1)} words; keep lines to 6 to 12 words, one idea each.`);
    lines.forEach((l, i) => {
      const ands = (norm(l).match(/\band\b/g) ?? []).length;
      if (ands > MAX_AND_PER_LINE) out.push(`voiceover line ${i + 1} reads like a feature list ("and" ${ands} times): split it into separate beats.`);
      if (/\band more\b/i.test(l)) out.push(`voiceover line ${i + 1} says "and more": name the one thing that matters.`);
    });
  }

  if (!story.cta?.trim()) out.push('CTA is missing: one action, one place.');

  const payoff = significant(story.payoff ?? '');
  if (payoff.length === 0) out.push('no payoff: name the moment that shows the "after".');
  else {
    const need = Math.ceil(payoff.length / 2);
    const shown = stops.some((s) => {
      const label = new Set(significant(s.label));
      return payoff.filter((w) => label.has(w)).length >= need;
    });
    if (!shown) out.push(`payoff ("${story.payoff}") is not mentioned in any stop label: no screen lands on it.`);
  }
  return out;
}

async function load(file: string): Promise<StoryInput> {
  const path = resolve(process.cwd(), file);
  if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8')) as StoryInput;
  return ((await import(pathToFileURL(path).href)) as {journey: StoryInput}).journey;
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const files = args.filter((a) => a !== '--strict');
  let warnings = 0;
  for (const file of files.length ? files : ['src/film/journey.ts']) {
    const found = checkStory(await load(file));
    warnings += found.length;
    console.log(`${file}: ${found.length === 0 ? 'story OK' : `${found.length} warning(s)`}`);
    for (const w of found) console.log(`  warning ${w}`);
  }
  process.exit(strict && warnings > 0 ? 1 : 0);
}

// Run only when executed directly, so the test can import checkStory.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) void main();

// Runs checkStory on the two sample inputs: the good one must be clean, the weak one must trip every rule.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkStory, type StoryInput} from './story-check';

const sample = (name: string) => JSON.parse(readFileSync(new URL(`./story-samples/${name}.json`, import.meta.url), 'utf8')) as StoryInput;

assert.deepEqual(checkStory(sample('good')), [], 'good sample should have no warnings');

const weak = checkStory(sample('weak')).join('\n');
for (const expected of ['hook is the product name', 'no problem line', 'average', 'feature list', 'and more', 'CTA is missing', 'not mentioned in any stop label']) {
  assert.ok(weak.includes(expected), `weak sample should warn: ${expected}\n${weak}`);
}

const longHook = checkStory({...sample('good'), story: {...sample('good').story!, hook: 'one two three four five six seven eight nine ten eleven twelve thirteen'}});
assert.ok(longHook.some((w) => w.includes('13 words')), 'hook over 12 words should warn');
assert.equal(checkStory({stops: []}).length, 1, 'a missing story block is reported');
console.log('story-check tests passed');

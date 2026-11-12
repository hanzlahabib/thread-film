/** Fitting type into a width: how to wrap a line and how large it can then be set. */

/** Share of the type's em a character is assumed to take, for a bold display face with tight tracking. */
export const DISPLAY_GLYPH_EM = 0.56;

/** Greedy wrap of `words` into lines of at most `limit` characters. */
function wrapAt(words: readonly string[], limit: number): string[] {
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= limit) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** The shortest line limit that wraps `words` into `count` lines or fewer: the most even wrap. */
function balanced(words: readonly string[], count: number): string[] {
  const total = words.join(' ').length;
  for (let limit = Math.max(...words.map((w) => w.length)); limit <= total; limit++) {
    const lines = wrapAt(words, limit);
    if (lines.length <= count) return lines;
  }
  return [words.join(' ')];
}

/**
 * Wraps `text` into as few lines as stay readable and returns the font size that fits them in `maxWidth`. It
 * takes the fewest lines (up to `maxLines`) whose size reaches `minShare` of `cap`; if none does, the line count
 * that gives the largest size.
 */
export function fitLines(text: string, maxWidth: number, cap: number, maxLines: number, minShare = 0.6): {lines: string[]; size: number} {
  const words = text.split(/\s+/).filter(Boolean);
  let best = {lines: [words.join(' ')], size: 0};
  for (let n = 1; n <= Math.min(maxLines, words.length); n++) {
    const lines = balanced(words, n);
    const size = Math.min(cap, maxWidth / (Math.max(...lines.map((l) => l.length)) * DISPLAY_GLYPH_EM));
    if (size >= cap * minShare) return {lines, size};
    if (size > best.size) best = {lines, size};
  }
  return best;
}

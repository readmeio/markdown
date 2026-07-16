import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';
import { FOREIGN_CONTENT_TAGS } from '../../../utils/common-html-words';

// `svg|math`, from the canonical list so this stays in sync with the component transform.
const ROOT_ALT = FOREIGN_CONTENT_TAGS.join('|');

// A foreign-content opener. `\b` avoids lookalikes like `<svgfoo>`.
const ANY_ROOT_RE = new RegExp(`<(?:${ROOT_ALT})\\b`, 'i');

// One whole svg/math tag (opener, self-closer, or closer), matched whole so attributes
// and `>` may span lines. Group 1 is `/` only for a self-closer. A `>` inside an
// attribute value ends the match early — a known limitation shared by these preprocessors.
const FOREIGN_TAG_RE = new RegExp(`<(?:${ROOT_ALT})\\b[^>]*?(/)?>|</(?:${ROOT_ALT})\\b[^>]*?>`, 'gi');

/**
 * `[start, end)` spans of every top-level SVG/MathML island. Matching whole tags
 * (not per-line open/close counts) keeps multi-line openers and self-closers
 * balanced, so a wrapped `<svg … />` can't latch and swallow the doc (#1545).
 */
function findForeignContentSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  let depth = 0;
  let start = -1;

  [...text.matchAll(FOREIGN_TAG_RE)].forEach(match => {
    const offset = match.index ?? 0;
    if (match[1] === '/') return; // self-closing tag opens no island
    if (match[0].startsWith('</')) {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && start !== -1) {
        spans.push([start, offset + match[0].length]);
        start = -1;
      }
    } else {
      if (depth === 0) start = offset;
      depth += 1;
    }
  });
  if (start !== -1) spans.push([start, text.length]);

  return spans;
}

/**
 * Drop blank lines inside `<svg>`/`<math>` islands: their whitespace is
 * insignificant XML, but a blank line ends the CommonMark HTML block and spills the
 * children out as a code block (#1545). Collapsing keeps the island one block.
 */
export function collapseForeignContentBlankLines(content: string): string {
  // Fast path: nothing to do when the doc has no foreign-content island.
  if (!ANY_ROOT_RE.test(content)) return content;

  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const islands = findForeignContentSpans(protectedContent);
  const insideIsland = (offset: number) => islands.some(([start, end]) => offset >= start && offset < end);

  // Drop blank lines inside an island; keep everything else verbatim.
  const lines: string[] = [];
  let lineStart = 0;
  protectedContent.split('\n').forEach(line => {
    if (line.trim().length > 0 || !insideIsland(lineStart)) lines.push(line);
    lineStart += line.length + 1; // +1 for the '\n' that split() removed
  });

  return restoreCodeBlocks(lines.join('\n'), protectedCode);
}

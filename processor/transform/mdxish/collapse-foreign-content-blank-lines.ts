import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';
import { FOREIGN_CONTENT_TAGS } from '../../../utils/common-html-words';

// `svg|math`, from the canonical list so this stays in sync with the component transform.
const ROOT_ALT = FOREIGN_CONTENT_TAGS.join('|');

// A foreign-content opener. The `[\s/>]` boundary requires a real tag delimiter after the
// root name, so lookalikes like `<svgfoo>` and custom elements like `<svg-icon>` are ignored.
const ANY_ROOT_RE = new RegExp(`<(?:${ROOT_ALT})(?=[\\s/>])`, 'i');

// Tag body: swallows whole quoted attribute values so a `>` inside a quote (e.g.
// `<svg data-x="a > b" />`) can't be mistaken for the tag terminator; other non-`>`
// chars (including newlines) are consumed one at a time.
const TAG_BODY = '(?:"[^"]*"|\'[^\']*\'|[^>\'"])*?';

// One whole svg/math tag (opener, self-closer, or closer), matched whole so attributes
// and `>` may span lines. The `[\s/>]` boundary after the root name keeps `<svgfoo>`/
// `<svg-icon>` out. Group 1 is `/` only for a self-closer.
const FOREIGN_TAG_RE = new RegExp(
  `<(?:${ROOT_ALT})(?=[\\s/>])${TAG_BODY}(/)?>|</(?:${ROOT_ALT})(?=[\\s/>])${TAG_BODY}>`,
  'gi',
);

// An HTML comment. Foreign markup inside one is inert and must not open an island.
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

const withinAny = (spans: [number, number][], offset: number) =>
  spans.some(([start, end]) => offset >= start && offset < end);

/**
 * `[start, end)` spans of every *matched* SVG/MathML pair — the regions whose blank
 * lines are known-insignificant XML. Matching whole tags (not per-line open/close
 * counts) keeps multi-line openers and self-closers balanced, so a wrapped
 * `<svg … />` can't latch and swallow the doc (#1545).
 *
 * Tags are paired innermost-first, as a parser would; an opener still unpaired at EOF
 * closed nothing and so covers nothing. That keeps a stray `<svg>` in prose from
 * swallowing every blank line after it, without hiding the real islands that follow.
 */
function findForeignContentSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];

  // Foreign tags inside an HTML comment are inert; a stray `<svg>`/`<math>` in a comment
  // must not open an island and latch onto the rest of the doc.
  const comments = [...text.matchAll(HTML_COMMENT_RE)].map(
    (m): [number, number] => [m.index ?? 0, (m.index ?? 0) + m[0].length],
  );

  // Offsets of openers still waiting for their closer, innermost last.
  const openOffsets: number[] = [];

  [...text.matchAll(FOREIGN_TAG_RE)].forEach(match => {
    const offset = match.index ?? 0;
    if (withinAny(comments, offset)) return; // markup inside an HTML comment is inert
    if (match[1] === '/') return; // self-closing tag opens no island

    if (match[0].startsWith('</')) {
      const start = openOffsets.pop();
      if (start !== undefined) spans.push([start, offset + match[0].length]); // a closer with no opener closes nothing
    } else {
      openOffsets.push(offset);
    }
  });

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

  // Drop blank lines inside an island; keep everything else verbatim.
  const lines: string[] = [];
  let lineStart = 0;
  protectedContent.split('\n').forEach(line => {
    if (line.trim().length > 0 || !withinAny(islands, lineStart)) lines.push(line);
    lineStart += line.length + 1; // +1 for the '\n' that split() removed
  });

  return restoreCodeBlocks(lines.join('\n'), protectedCode);
}

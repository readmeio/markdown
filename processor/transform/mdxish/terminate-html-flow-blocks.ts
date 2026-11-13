import { htmlRawNames } from 'micromark-util-html-tag-name';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';
import { HTML_BLOCK_TAG_NAMES, HTML_TABLE_STRUCTURE_TAGS } from '../../../utils/common-html-words';

import { findBalancedOpenerOffsets, isMarkdownPromotableHtmlTag } from './components/utils';
import { indentWidth } from './indentation';

const STANDALONE_HTML_LINE_REGEX = /^(<[a-z][^<>]*>|<\/[a-z][^<>]*>)+\s*$/;

const HTML_LINE_WITH_CONTENT_REGEX = /^<[a-z][^<>]*>.*<\/[a-z][^<>]*>(?:[^<]*)$/;

// A leading open/close tag followed by text (`<li> test`); captures the closer slash and tag name.
const TAG_WITH_TRAILING_TEXT_REGEX = /^<(\/?)([a-z][a-z0-9-]*)(?=[\s/>])[^<>]*>\s*\S/;

// Markdown blocks an HTML flow block would swallow as raw text: magic block, heading
// (compact `#Heading` too), list item, blockquote, fenced code (placeholder), thematic break.
const SWALLOWED_BLOCK_START_REGEX =
  /^(?:\[block:|#{1,6}(?!#)|[-*+][ \t]|\d{1,9}[.)][ \t]|>|___CODE_BLOCK_\d+___|(?:[-*_][ \t]*){3,}$)/;

// A line that is exactly one lowercase opening (or self-closing) tag — the shape
// that opens a CommonMark type-6/7 HTML block and swallows the lines below it.
const SINGLE_OPENING_TAG_REGEX = /^<[a-z][^<>]*>$/;

// Tags whose contents must be preserved as is, inserting a blank line after the
// opener corrupts the payload.
// htmlRawNames here refer to <pre>, <textarea>, <script>, <style>
const RAW_CONTENT_TAGS = [...htmlRawNames, ...HTML_TABLE_STRUCTURE_TAGS];

// The `(?=[\s/>])` lookahead avoids false matches on lookalike names like `<script-foo>`.
const RAW_CONTENT_TAG_MATCHERS = RAW_CONTENT_TAGS.map(tag => ({
  open: new RegExp(`<${tag}(?=[\\s/>])[^>]*?(?<!/)>`, 'gi'),
  close: new RegExp(`</${tag}(?=[\\s>])[^>]*>`, 'gi'),
}));

function isLineHtml(line: string) {
  return STANDALONE_HTML_LINE_REGEX.test(line) || HTML_LINE_WITH_CONTENT_REGEX.test(line);
}

const leadingWhitespace = (line: string) => line.length - line.trimStart().length;

/**
 * Line indexes in `lines[start..)` whose leading opener is balanced before the run's
 * blank line (where the HTML flow block ends). Openers before `start` can't steal
 * a closer from a later one, so starting mid-run is safe.
 */
function findBalancedOpenerLines(lines: string[], start: number) {
  const lineOffsets: number[] = [];
  let text = '';
  let end = start;
  for (; end < lines.length && lines[end].trim().length > 0; end += 1) {
    lineOffsets.push(text.length + leadingWhitespace(lines[end]));
    text += `${lines[end]}\n`;
  }
  const balanced = findBalancedOpenerOffsets(text);
  const lineIndexes = lineOffsets.flatMap((offset, k) => (balanced.has(offset) ? [start + k] : []));
  return { end, lines: new Set(lineIndexes) };
}

/** Memoizes `findBalancedOpenerLines` per run so the loop walks each run at most once. */
function createBalancedOpenerLookup(lines: string[]) {
  let run: ReturnType<typeof findBalancedOpenerLines> | undefined;
  return (index: number) => {
    if (!run || index >= run.end) run = findBalancedOpenerLines(lines, index);
    return run.lines.has(index);
  };
}

/**
 * A type-6 tag with trailing text (`<li> test`) left open for the rest of its run.
 * Balanced, promotable ones already render, as mdxish re-parses the whole HTML block.
 */
function leavesBlockTagOpen(line: string, isBalanced: () => boolean) {
  const [, closerSlash, tagName] = TAG_WITH_TRAILING_TEXT_REGEX.exec(line.trim()) ?? [];
  if (tagName === undefined || !HTML_BLOCK_TAG_NAMES.has(tagName)) return false;
  return Boolean(closerSlash) || !isMarkdownPromotableHtmlTag(tagName) || !isBalanced();
}

// Per-tag {opens, closes} counts of RAW_CONTENT_TAGS on one line — feeds both the
// per-line net-open check and the cumulative still-open depth tracking.
function countRawContentTags(line: string): { closes: number; opens: number }[] {
  return RAW_CONTENT_TAG_MATCHERS.map(({ open, close }) => ({
    opens: (line.match(open) ?? []).length,
    closes: (line.match(close) ?? []).length,
  }));
}

interface BoundaryFacts {
  /** Any raw-content element is still open at the boundary after `line`. */
  insideRawContent: boolean;
  /** `line` opens a type-6 HTML block via a tag with trailing text, left unclosed. Lazy: walks the run. */
  leavesBlockOpen: () => boolean;
  /** A raw-content opener on `line` itself is left unclosed by that line. */
  lineLeavesRawOpen: boolean;
}

/**
 * Decides whether a blank line belongs between `line` and `next` so the HTML
 * flow block opened on `line` terminates and `next` parses as markdown.
 */
function shouldTerminateBetween(
  line: string,
  next: string,
  { insideRawContent, leavesBlockOpen, lineLeavesRawOpen }: BoundaryFacts,
): boolean {
  if (next.trim().length === 0) return false;

  const currentIndent = indentWidth(line);
  const nextIndent = indentWidth(next);
  const currentTrimmed = line.trim();
  const nextTrimmed = next.trim();
  if (isLineHtml(nextTrimmed) || lineLeavesRawOpen) return false;

  // RM-16379: a type-6 opener with trailing text only splits before a markdown block, so
  // legacy continuation lines (`<li>Step\nmore`) stay glued; the walk runs last.
  if (!isLineHtml(currentTrimmed)) {
    return (
      currentIndent === 0 &&
      nextIndent === 0 &&
      !insideRawContent &&
      SWALLOWED_BLOCK_START_REGEX.test(nextTrimmed) &&
      leavesBlockOpen()
    );
  }

  // Column-0 pairs keep the original (pre-relaxation) rule, deliberately ignoring
  // `insideRawContent`: one unclosed <pre>/<table> typo would otherwise suppress
  // termination for the whole rest of the document.
  if (currentIndent === 0 && nextIndent === 0) return true;

  // Indented shapes (either line, any depth) are stricter: only a lone opening tag
  // followed by markdown. A next line opening a tag or expression must stay glued for
  // the mdxComponent tokenizer; raw-content payloads stay byte-exact.
  return (
    !insideRawContent &&
    SINGLE_OPENING_TAG_REGEX.test(currentTrimmed) &&
    !nextTrimmed.startsWith('<') &&
    !nextTrimmed.startsWith('{')
  );
}

/**
 * CommonMark HTML blocks (types 6/7) end only at a blank line, so markdown on the
 * next line is swallowed as HTML (`## heading` after `<div>` renders as literal text).
 * Inserts the missing blank line; the gating rules live in `shouldTerminateBetween`.
 *
 * @link https://spec.commonmark.org/0.29/#html-blocks
 */
export function terminateHtmlFlowBlocks(content: string) {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const lines = protectedContent.split('\n');
  const isOpenerBalanced = createBalancedOpenerLookup(lines);
  const result: string[] = [];
  // Per-tag count of still-open raw-content elements at the current boundary.
  const rawContentDepths = RAW_CONTENT_TAG_MATCHERS.map(() => 0);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    result.push(line);

    const tagCounts = countRawContentTags(line);
    tagCounts.forEach(({ opens, closes }, tagIndex) => {
      rawContentDepths[tagIndex] = Math.max(0, rawContentDepths[tagIndex] + opens - closes);
    });

    const next = lines[i + 1];
    const boundaryFacts = {
      insideRawContent: rawContentDepths.some(depth => depth > 0),
      leavesBlockOpen: () => leavesBlockTagOpen(line, () => isOpenerBalanced(i)),
      lineLeavesRawOpen: tagCounts.some(({ opens, closes }) => opens > closes),
    };
    if (next !== undefined && shouldTerminateBetween(line, next, boundaryFacts)) {
      result.push('');
    }
  }

  return restoreCodeBlocks(result.join('\n'), protectedCode);
}

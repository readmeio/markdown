import { htmlBlockNames, htmlRawNames } from 'micromark-util-html-tag-name';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';
import { HTML_TABLE_STRUCTURE_TAGS } from '../../../utils/common-html-words';

import { indentWidth } from './indentation';

const STANDALONE_HTML_LINE_REGEX = /^(<[a-z][^<>]*>|<\/[a-z][^<>]*>)+\s*$/;

const HTML_LINE_WITH_CONTENT_REGEX = /^<[a-z][^<>]*>.*<\/[a-z][^<>]*>(?:[^<]*)$/;

// A leading open/close tag followed by text (`<li> test`); captures the tag name.
const TAG_WITH_TRAILING_TEXT_REGEX = /^<\/?([a-z][a-z0-9-]*)(?=[\s/>])[^<>]*>\s*\S/;

const CLOSING_TAG_NAME_REGEX = /<\/([a-z][a-z0-9-]*)\s*>/g;

// CommonMark type-6 names open an HTML block regardless of trailing text; other tags don't.
const HTML_BLOCK_NAMES: ReadonlySet<string> = new Set(htmlBlockNames);

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

/**
 * Per line, the last line index of each closing tag name within that line's
 * blank-line-delimited run (one shared map per run).
 */
function mapClosingTagsByRun(lines: string[]): Map<string, number>[] {
  let run = new Map<string, number>();
  return lines.map((line, index) => {
    if (line.trim().length === 0) run = new Map();
    for (const [, tagName] of line.matchAll(CLOSING_TAG_NAME_REGEX)) run.set(tagName, index);
    return run;
  });
}

/**
 * A type-6 tag with trailing text (`<li> test`) that isn't closed later in its run.
 * Closed ones already render, as mdxish re-parses the whole HTML block.
 */
function leavesBlockTagOpen(line: string, index: number, runClosers: Map<string, number>) {
  const tagName = TAG_WITH_TRAILING_TEXT_REGEX.exec(line.trim())?.[1];
  if (tagName === undefined || !HTML_BLOCK_NAMES.has(tagName)) return false;
  return (runClosers.get(tagName) ?? -1) <= index;
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
  /** `line` opens a type-6 HTML block via a tag with trailing text, left unclosed. */
  leavesBlockOpen: boolean;
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
  const currentIsHtml = isLineHtml(currentTrimmed) || leavesBlockOpen;
  if (!currentIsHtml || isLineHtml(nextTrimmed) || lineLeavesRawOpen) {
    return false;
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
  const closersByRun = mapClosingTagsByRun(lines);
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
      leavesBlockOpen: leavesBlockTagOpen(line, i, closersByRun[i]),
      lineLeavesRawOpen: tagCounts.some(({ opens, closes }) => opens > closes),
    };
    if (next !== undefined && shouldTerminateBetween(line, next, boundaryFacts)) {
      result.push('');
    }
  }

  return restoreCodeBlocks(result.join('\n'), protectedCode);
}

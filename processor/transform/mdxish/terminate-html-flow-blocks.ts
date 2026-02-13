import { voidHtmlTags } from 'html-tags';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

const STANDALONE_HTML_LINE_REGEX = /^(<[a-z][^<>]*>|<\/[a-z][^<>]*>)+\s*$/;

const HTML_LINE_WITH_CONTENT_REGEX = /^<[a-z][^<>]*>.*<\/[a-z][^<>]*>(?:[^<]*)$/;

const HTML_TAG_EXTRACT_REGEX = /<(\/?)([a-z][a-z0-9]*)[^<>]*>/g;

const VOID_ELEMENTS = new Set<string>(voidHtmlTags);

function getUnclosedTagNames(line: string): Set<string> {
  const counts = new Map<string, number>();
  let match: RegExpExecArray | null;

  HTML_TAG_EXTRACT_REGEX.lastIndex = 0;
  while ((match = HTML_TAG_EXTRACT_REGEX.exec(line)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    if (!VOID_ELEMENTS.has(tagName)) {
      const current = counts.get(tagName) ?? 0;
      counts.set(tagName, current + (isClosing ? -1 : 1));
    }
  }

  const unclosed = new Set<string>();
  counts.forEach((count, tag) => {
    if (count > 0) unclosed.add(tag);
  });
  return unclosed;
}

function hasMatchingCloseAhead(lines: string[], startIndex: number, unclosedTags: Set<string>): boolean {
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (lines[i].trim().length === 0) return false;

    HTML_TAG_EXTRACT_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = HTML_TAG_EXTRACT_REGEX.exec(lines[i])) !== null) {
      if (match[1] === '/' && unclosedTags.has(match[2])) return true;
    }
  }
  return false;
}

function getNetDepth(line: string): number {
  let depth = 0;
  let match: RegExpExecArray | null;

  HTML_TAG_EXTRACT_REGEX.lastIndex = 0;
  while ((match = HTML_TAG_EXTRACT_REGEX.exec(line)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    if (!VOID_ELEMENTS.has(tagName)) {
      depth += isClosing ? -1 : 1;
    }
  }

  return depth;
}

/**
 * Preprocessor to terminate HTML flow blocks.
 *
 * In CommonMark, HTML blocks (types 6 and 7) only terminate on a blank line.
 * Without one, any content on the next line is consumed as part of the HTML block
 * and never parsed as its own construct. For example, a `[block:callout]` immediately
 * following `<div><p></p></div>` gets swallowed into the HTML flow token.
 *
 * @link https://spec.commonmark.org/0.29/#html-blocks
 *
 * This preprocessor inserts a blank line after standalone HTML lines when the
 * next line is non-blank, ensuring micromark's HTML flow tokenizer terminates
 * and subsequent content is parsed independently.
 *
 * Only targets non-indented lines with lowercase tag names. Uppercase tags
 * (e.g., `<Table>`, `<MyComponent>`) are JSX custom components and don't
 * trigger CommonMark HTML blocks, so they are left untouched.
 *
 * Lines inside fenced code blocks are skipped entirely.
 */
export function terminateHtmlFlowBlocks(content: string): string {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const lines = protectedContent.split('\n');
  const result: string[] = [];
  let depth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    result.push(lines[i]);

    if (lines[i].trim().length === 0) {
      depth = 0;
    } else {
      depth = Math.max(0, depth + getNetDepth(lines[i]));
    }

    if (
      i < lines.length - 1 &&
      (STANDALONE_HTML_LINE_REGEX.test(lines[i]) || HTML_LINE_WITH_CONTENT_REGEX.test(lines[i])) &&
      lines[i + 1].trim().length > 0
    ) {
      if (depth === 0) {
        result.push('');
      } else {
        const unclosed = getUnclosedTagNames(lines[i]);
        if (unclosed.size > 0 && !hasMatchingCloseAhead(lines, i, unclosed)) {
          result.push('');
        }
      }
    }
  }

  return restoreCodeBlocks(result.join('\n'), protectedCode);
}

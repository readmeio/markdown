import { htmlRawNames } from 'micromark-util-html-tag-name';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

const STANDALONE_HTML_LINE_REGEX = /^(<[a-z][^<>]*>|<\/[a-z][^<>]*>)+\s*$/;

const HTML_LINE_WITH_CONTENT_REGEX = /^<[a-z][^<>]*>.*<\/[a-z][^<>]*>(?:[^<]*)$/;

const TABLE_STRUCTURE_TAGS = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup'];

// Tags whose contents must be preserved as is, inserting a blank line after the
// opener corrupts the payload.
// htmlRawNames here refer to <pre>, <textarea>, <script>, <style>
const RAW_CONTENT_TAGS = [...htmlRawNames, ...TABLE_STRUCTURE_TAGS];

function isLineHtml(line: string) {
  return STANDALONE_HTML_LINE_REGEX.test(line) || HTML_LINE_WITH_CONTENT_REGEX.test(line);
}

// True if any RAW_CONTENT_TAGS opener on this line is not closed on the same line.
// The `(?=[\s/>])` lookahead avoids false matches on lookalike names like `<script-foo>`.
function hasUnclosedRawContentOpener(line: string): boolean {
  return RAW_CONTENT_TAGS.some(tag => {
    const openRegex = new RegExp(`<${tag}(?=[\\s/>])[^>]*?(?<!/)>`, 'gi');
    const closeRegex = new RegExp(`</${tag}(?=[\\s>])[^>]*>`, 'gi');
    const opens = (line.match(openRegex) ?? []).length;
    const closes = (line.match(closeRegex) ?? []).length;
    return opens > closes;
  });
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
 * This preprocessor inserts a blank line after standalone HTML lines when the next
 * line is non-blank and not an HTML construct, ensuring micromark's HTML flow
 * tokenizer terminates and subsequent content is parsed independently.
 *
 * Conditions:
 * 1. Only non-indented lines with lowercase tag names are considered. Uppercase tags
 *    (e.g. `<Table>`, `<MyComponent>`) are JSX custom components and don't trigger
 *    CommonMark HTML blocks.
 * 2. Lines inside protected blocks (e.g. fenced code) are left untouched.
 * 3. Lines with an unclosed RAW_CONTENT_TAGS opener are exempted.
 */
export function terminateHtmlFlowBlocks(content: string) {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const lines = protectedContent.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    result.push(lines[i]);

    // Skip blank & indented lines
    if (i >= lines.length - 1 || lines[i + 1].trim().length === 0 || lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t')) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const isCurrentLineHtml = isLineHtml(lines[i]);
    const isNextLineHtml = isLineHtml(lines[i + 1]);
    if (isCurrentLineHtml && !isNextLineHtml && !hasUnclosedRawContentOpener(lines[i])) {
      result.push('');
    }
  }

  return restoreCodeBlocks(result.join('\n'), protectedCode);
}

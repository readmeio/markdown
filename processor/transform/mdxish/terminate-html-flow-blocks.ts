import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

const STANDALONE_HTML_LINE_REGEX = /^(<[a-z][^<>]*>|<\/[a-z][^<>]*>)+\s*$/;

const HTML_LINE_WITH_CONTENT_REGEX = /^<[a-z][^<>]*>.*<\/[a-z][^<>]*>(?:[^<]*)$/;

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
 * next line is non-blank and not an HTML construct (because they still might be part of the HTML flow),
 * ensuring micromark's HTML flow tokenizer terminates and subsequent content is parsed independently.
 *
 * Conditions:
 * 1. Only targets non-indented lines with lowercase tag names. Uppercase tags
 * (e.g., `<Table>`, `<MyComponent>`) are JSX custom components and don't
 * trigger CommonMark HTML blocks, so they are left untouched.
 * 2. Lines inside protected blocks (e.g., code blocks) should be left untouched.
 */
export function terminateHtmlFlowBlocks(content: string): string {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const lines = protectedContent.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    result.push(lines[i]);

    if (i >= lines.length - 1 || lines[i + 1].trim().length === 0 || lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t')) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const isCurrentLineHtml = STANDALONE_HTML_LINE_REGEX.test(lines[i]) || HTML_LINE_WITH_CONTENT_REGEX.test(lines[i]);
    const isNextLineHtml = STANDALONE_HTML_LINE_REGEX.test(lines[i + 1]) || HTML_LINE_WITH_CONTENT_REGEX.test(lines[i + 1]);
    if (isCurrentLineHtml && !isNextLineHtml) {
      result.push('');
    }
  }

  return restoreCodeBlocks(result.join('\n'), protectedCode);
}

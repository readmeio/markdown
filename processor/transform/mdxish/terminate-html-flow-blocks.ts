const STANDALONE_HTML_LINE_REGEX = /^(<[a-z][^<>]*>|<\/[a-z][^<>]*>)+\s*$/;

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
 */
export function terminateHtmlFlowBlocks(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    result.push(lines[i]);

    if (i < lines.length - 1 && STANDALONE_HTML_LINE_REGEX.test(lines[i]) && lines[i + 1].trim().length > 0) {
      result.push('');
    }
  }

  return result.join('\n');
}

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';
import { STANDARD_HTML_TAGS } from '../../../utils/common-html-words';

// Spaces/tabs only — newlines would let prose `<` / `>` across lines look like one tag.
const SPACED_CLOSING_TAG_RE = /<\/[ \t]*([a-zA-Z][a-zA-Z0-9-]*)[ \t]*>/g;

/**
 * Canonicalize spaced closing tags (`</ td >` → `</td>`) for known HTML names.
 *
 * In HTML, `</` + whitespace is a bogus comment, so `</ table >` never closes the
 * table (jsxTable misses it → empty table + pre; CX-3706). Only standard HTML tags;
 * custom components, prose (`a </ b`), and code blocks are left alone.
 *
 * @example
 * normalizeClosingTagWhitespace('</ td >')   // '</td>'
 * normalizeClosingTagWhitespace('</table >') // '</table>'
 * normalizeClosingTagWhitespace('a </ b >')  // unchanged
 */
export function normalizeClosingTagWhitespace(content: string) {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const result = protectedContent.replace(SPACED_CLOSING_TAG_RE, (match, tagName: string) =>
    STANDARD_HTML_TAGS.has(tagName.toLowerCase()) ? `</${tagName}>` : match,
  );

  return restoreCodeBlocks(result, protectedCode);
}

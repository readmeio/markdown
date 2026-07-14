import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';
import { STANDARD_HTML_TAGS } from '../../../utils/common-html-words';

/**
 * Matches an HTML closing tag carrying stray inline whitespace between `</`, the
 * tag name, and `>` — e.g. `</ td >`, `</table >`, `</ ul>`, `</  th  >`.
 *
 * Whitespace is limited to spaces/tabs (not newlines) so a genuinely
 * cross-line `<` / `>` in prose can never be swept into one "tag".
 *
 * Capture 1 — the tag name.
 */
const SPACED_CLOSING_TAG_RE = /<\/[ \t]*([a-zA-Z][a-zA-Z0-9-]*)[ \t]*>/g;

/**
 * String-level preprocessor that canonicalizes closing tags written with stray
 * whitespace (`</ td >` → `</td>`).
 *
 * Per the HTML spec, `</` immediately followed by whitespace opens a *bogus
 * comment*, so a browser drops `</ td >` entirely and lets the element
 * auto-close later. Our pipeline mirrors that (htmlparser2 emits a comment),
 * but two things break as a result:
 *
 *  1. `jsxTable` captures a raw-HTML `<table>` as a single flow block by
 *     scanning for a *literal* `</table>`. A `</ table >` (or `</table >`)
 *     closer isn't recognized, so the table looks unclosed: it falls back to a
 *     CommonMark HTML block that fragments at blank lines, and its indented
 *     rows collapse into an empty `<table></table>` plus a `<pre>` code block
 *     (CX-3706).
 *  2. Even when the table is otherwise closed, a dropped cell closer leaves a
 *     stray `<!-- td -->` comment in the rendered output.
 *
 * The author unambiguously meant a closing tag, so we normalize the whitespace
 * back out before parsing — matching the browser's *intent* while keeping the
 * table whole. Scoped to standard HTML tag names, so custom components and
 * incidental prose (`a </ b`) are left untouched; code blocks are protected.
 *
 * @example
 * normalizeClosingTagWhitespace('Marshall Islands </ td >') // 'Marshall Islands </td>'
 * normalizeClosingTagWhitespace('</table >')                // '</table>'
 * normalizeClosingTagWhitespace('</td>')                    // '</td>' (already canonical)
 * normalizeClosingTagWhitespace('a </ b > c')               // 'a </ b > c' (not a known tag)
 */
export function normalizeClosingTagWhitespace(content: string) {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const result = protectedContent.replace(SPACED_CLOSING_TAG_RE, (match, tagName: string) =>
    STANDARD_HTML_TAGS.has(tagName.toLowerCase()) ? `</${tagName}>` : match,
  );

  return restoreCodeBlocks(result, protectedCode);
}

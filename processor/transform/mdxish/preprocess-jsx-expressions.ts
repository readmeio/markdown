import { JSX_COMMENT_REGEX } from '../../../lib/micromark/jsx-comment/pattern';
import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

// Base64 encode (Node.js + browser compatible)
function base64Encode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(str)));
}

// Base64 decode (Node.js + browser compatible)
export function base64Decode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(str)));
}

// Markers for protected HTMLBlock content (HTML comments avoid markdown parsing issues)
export const HTML_BLOCK_CONTENT_START = '<!--RDMX_HTMLBLOCK:';
export const HTML_BLOCK_CONTENT_END = ':RDMX_HTMLBLOCK-->';

/**
 * Base64 encodes HTMLBlock template literal content to prevent markdown parser from consuming <script>/<style> tags.
 *
 * @param content
 * @returns Content with HTMLBlock template literals base64 encoded in HTML comments
 * @example
 * ```typescript
 * const input = '<HTMLBlock>{`<script>alert("xss")</script>`}</HTMLBlock>';
 * protectHTMLBlockContent(input)
 * // Returns: '<HTMLBlock><!--RDMX_HTMLBLOCK:PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=:RDMX_HTMLBLOCK--></HTMLBlock>'
 * ```
 */
function protectHTMLBlockContent(content: string): string {
  return content.replace(
    /(<HTMLBlock[^>]*>)\{\s*`((?:[^`\\]|\\.)*)`\s*\}(<\/HTMLBlock>)/g,
    (_match, openTag: string, templateContent: string, closeTag: string) => {
      const encoded = base64Encode(templateContent);
      return `${openTag}${HTML_BLOCK_CONTENT_START}${encoded}${HTML_BLOCK_CONTENT_END}${closeTag}`;
    },
  );
}

/**
 * Removes JSX-style comments (e.g., { /* comment *\/ }) from content.
 *
 * @param content
 * @returns Content with JSX comments removed
 * @example
 * ```typescript
 * removeJSXComments('Text { /* comment *\/ } more text')
 * // Returns: 'Text  more text'
 * ```
 */
export function removeJSXComments(content: string): string {
  return content.replace(JSX_COMMENT_REGEX, '');
}

const HTML_ELEM_PLACEHOLDER_PREFIX = '___MDXISH_HTML_ELEM_';
const HTML_ELEM_PLACEHOLDER = new RegExp(`${HTML_ELEM_PLACEHOLDER_PREFIX}(\\d+)___`, 'g');
// Matches an HTML element that starts at a line boundary and ends at a line boundary.
// Allows optional leading indentation and lazily matches until the same closing tag.
const BLOCK_HTML_RE = /(?<=^|\n)[ \t]*<([a-z][a-zA-Z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>[ \t]*(?=\n|$)/g;

/**
 * Hides line-anchored HTML elements from the brace-escaping pass so we don't leak `\{`
 * into rendered output (rehypeRaw renders the `\` literally, e.g. `<div>{foo</div>`).
 *
 * One carve-out: if an interior line at column 0 has bare text containing `{`, mdxish
 * parses that line as a paragraph and the mdxExpression step would throw without an
 * escape — so we leave that case to the brace balancer.
 */
function protectHTMLElements(content: string): { htmlElements: string[]; protectedContent: string } {
  const htmlElements: string[] = [];
  const protectedContent = content.replace(BLOCK_HTML_RE, match => {
    // Look at the lines between the open and close tags. If any of them starts
    // at column 0 with bare text (not whitespace, not another tag) and contains
    // `{`, mdxish will parse that line as a paragraph and the brace as an MDX
    // expression, which would throw an error. So we let the brace balancer escape it.
    // Otherwise, we need to extract the sequence to protect it from the brace escaping.
    const interior = match.split('\n').slice(1, -1);
    const hazard = interior.some(line => line.length > 0 && line[0] !== ' ' && line[0] !== '\t' && line[0] !== '<' && line.includes('{'));
    if (hazard) return match;

    htmlElements.push(match);
    return `${HTML_ELEM_PLACEHOLDER_PREFIX}${htmlElements.length - 1}___`;
  });
  return { htmlElements, protectedContent };
}

function restoreHTMLElements(content: string, htmlElements: string[]): string {
  if (htmlElements.length === 0) return content;
  return content.replace(HTML_ELEM_PLACEHOLDER, (_m, idx) => htmlElements[parseInt(idx, 10)]);
}

const ESM_PLACEHOLDER_PREFIX = '___MDXISH_ESM_';
const ESM_PLACEHOLDER = new RegExp(`${ESM_PLACEHOLDER_PREFIX}(\\d+)___`, 'g');

/**
 * Hides column-0 `export`/`import` statements (including multi-line bodies and
 * blank lines inside them) from brace escaping. The mdxjs-esm tokenizer handles
 * these natively, so we just need to keep our hands off — otherwise JS braces
 * like `() => { … }` get rewritten to `\{ … \}` and acorn chokes.
 */
function protectESMBlocks(content: string): { esmBlocks: string[]; protectedContent: string } {
  const esmBlocks: string[] = [];
  const lines = content.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (/^(?:export|import)\b/.test(lines[i])) {
      // Accumulate lines until brackets balance (ignoring quoted regions).
      const collected: string[] = [];
      let depth = 0;
      let quote: string | null = null;
      let esc = false;
      while (i < lines.length) {
        const line = lines[i];
        collected.push(line);
        for (let j = 0; j < line.length; j += 1) {
          const c = line[j];
          if (quote) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === quote) quote = null;
          } else if (c === '"' || c === "'" || c === '`') quote = c;
          else if (c === '{' || c === '(' || c === '[') depth += 1;
          else if (c === '}' || c === ')' || c === ']') depth -= 1;
        }
        if (depth <= 0 && !quote) break;
        i += 1;
      }
      esmBlocks.push(collected.join('\n'));
      out.push(`${ESM_PLACEHOLDER_PREFIX}${esmBlocks.length - 1}___`);
    } else {
      out.push(lines[i]);
    }
  }

  return { esmBlocks, protectedContent: out.join('\n') };
}

function restoreESMBlocks(content: string, esmBlocks: string[]): string {
  if (esmBlocks.length === 0) return content;
  return content.replace(ESM_PLACEHOLDER, (_m, idx) => esmBlocks[parseInt(idx, 10)]);
}

/**
 * Escapes unbalanced and paragraph-spanning braces so MDX doesn't trip on them.
 */
function escapeProblematicBraces(content: string): string {
  const { htmlElements, protectedContent } = protectHTMLElements(content);

  let strDelim: string | null = null;
  let strEscaped = false;
  // Track position of last newline (outside strings) to detect blank lines
  // -2 means no recent newline
  let lastNewlinePos = -2;

  // Character state machine trackers
  const toEscape = new Set<number>();
  // Convert to array of Unicode code points so that emojis and multi-byte characters are correctly tracked
  const chars = Array.from(protectedContent);
  const openStack: { hasBlankLine: boolean; isAttrExpr: boolean; pos: number }[] = [];

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];

    // Track string delimiters inside expressions to ignore braces within them
    if (openStack.length > 0) {
      if (strDelim) {
        if (strEscaped) strEscaped = false;
        else if (ch === '\\') strEscaped = true;
        else if (ch === strDelim) strDelim = null;
        // eslint-disable-next-line no-continue
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        strDelim = ch;
        // eslint-disable-next-line no-continue
        continue;
      }
      if (ch === '\n') {
        if (lastNewlinePos >= 0) {
          const between = chars.slice(lastNewlinePos + 1, i).join('');
          if (/^[ \t]*$/.test(between)) {
            openStack.forEach(entry => { entry.hasBlankLine = true; });
          }
        }
        lastNewlinePos = i;
      }
    }

    // Skip already-escaped braces (odd run of preceding backslashes).
    if (ch === '{' || ch === '}') {
      let bs = 0;
      for (let j = i - 1; j >= 0 && chars[j] === '\\'; j -= 1) bs += 1;
      if (bs % 2 === 1) {
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    if (ch === '{') {
      // `=` (after whitespace) before `{` ⇒ JSX attribute expression. The
      // mdxComponent tokenizer captures the whole component, so blank lines
      // inside attribute values are harmless. Nested `{` inherits the flag.
      let isAttrExpr = false;
      for (let j = i - 1; j >= 0; j -= 1) {
        const pc = chars[j];
        if (pc === '=') { isAttrExpr = true; break; }
        if (pc !== ' ' && pc !== '\t') break;
      }
      // Nested `{ ... }` inside an attribute value (e.g. `data={[{ ... }]}` or
      // `data={{ a: { b: 1 } }}`) must inherit the same exemption; only the
      // outer `{` is directly after `=`.
      if (!isAttrExpr && openStack.length > 0 && openStack[openStack.length - 1].isAttrExpr) {
        isAttrExpr = true;
      }
      openStack.push({ pos: i, hasBlankLine: false, isAttrExpr });
      lastNewlinePos = -2;
    } else if (ch === '}') {
      if (openStack.length > 0) {
        const entry = openStack.pop()!;
        // Pure `{/* ... */}` comments are handled downstream by the jsxComment
        // tokenizer — escaping their braces would prevent it from running.
        const isPureJsxComment =
          chars[entry.pos + 1] === '/' &&
          chars[entry.pos + 2] === '*' &&
          chars[i - 1] === '/' &&
          chars[i - 2] === '*';
        if (entry.hasBlankLine && !isPureJsxComment && !entry.isAttrExpr) {
          toEscape.add(entry.pos);
          toEscape.add(i);
        }
      } else {
        toEscape.add(i);
      }
    }
  }

  // Anything still open is unbalanced.
  openStack.forEach(entry => toEscape.add(entry.pos));

  // Reconstruct the content with the escaped braces.
  const escapedContent = toEscape.size === 0 ? protectedContent : chars.map((ch, i) => (toEscape.has(i) ? `\\${ch}` : ch)).join('');
  return restoreHTMLElements(escapedContent, htmlElements);
}

/**
 * Preprocesses JSX-like markdown content before parsing.
 *
 * JSX attribute expressions (`href={baseUrl}`) are no longer rewritten here —
 * they flow through the tokenizer as `mdxJsxAttributeValueExpression` nodes
 * and are evaluated at the hast handler step.
 *
 * @param content
 * @returns Preprocessed content ready for markdown parsing
 */
export function preprocessJSXExpressions(content: string): string {
  let processed = protectHTMLBlockContent(content);
  const { protectedCode, protectedContent } = protectCodeBlocks(processed);
  const { esmBlocks, protectedContent: withoutEsm } = protectESMBlocks(protectedContent);

  processed = escapeProblematicBraces(withoutEsm);

  processed = restoreESMBlocks(processed, esmBlocks);
  processed = restoreCodeBlocks(processed, protectedCode);
  return processed;
}

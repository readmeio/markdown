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

/**
 * Escapes problematic braces in content to prevent MDX expression parsing errors.
 * Handles unbalanced braces and paragraph-spanning expressions. Skips HTML elements
 * so backslashes don't leak into rendered output via rehypeRaw.
 */
function escapeProblematicBraces(content: string): string {
  // Skip HTML elements that mdxish will parse as raw HTML — escaping their
  // braces would surface backslashes as literal text via rehypeRaw. We only
  // match what mdxish actually treats as raw: (1) a block element on a single
  // line, or (2) a block element whose interior lines are themselves only
  // tags. A bare-text line at column 0 inside a block makes mdxish split a
  // paragraph out and parse `{` as MDX, so we must NOT skip those.
  const htmlElements: string[] = [];
  const TAG = '[a-z][a-zA-Z0-9]*';
  const SAME_LINE = new RegExp(`(?<=^|\\n)[ \\t]*<(${TAG})(?:\\s[^>]*)?>[^\\n]*?</\\1>[ \\t]*(?=\\n|$)`, 'g');
  // Multi-line: opening tag alone on its line, interior lines each start with
  // whitespace + `<` (i.e., tags only), closing tag alone on its line.
  const MULTI_LINE = new RegExp(
    `(?<=^|\\n)[ \\t]*<(${TAG})(?:\\s[^>]*)?>[ \\t]*\\n(?:[ \\t]*<[^\\n]*\\n)+?[ \\t]*</\\1>[ \\t]*(?=\\n|$)`,
    'g',
  );
  const stash = (match: string): string => {
    const idx = htmlElements.length;
    htmlElements.push(match);
    return `___HTML_ELEM_${idx}___`;
  };
  const safe = content.replace(MULTI_LINE, stash).replace(SAME_LINE, stash);

  const toEscape = new Set<number>();
  // Convert to array of Unicode code points to handle emojis and multi-byte characters correctly
  const chars = Array.from(safe);
  let strDelim: string | null = null;
  let strEscaped = false;
  // Stack of open braces with their state
  const openStack: { hasBlankLine: boolean; isAttrExpr: boolean; pos: number }[] = [];
  // Track position of last newline (outside strings) to detect blank lines
  let lastNewlinePos = -2; // -2 means no recent newline

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

      // Track newlines to detect blank lines (paragraph boundaries)
      if (ch === '\n') {
        // Check if this newline creates a blank line (only whitespace since last newline)
        if (lastNewlinePos >= 0) {
          const between = chars.slice(lastNewlinePos + 1, i).join('');
          if (/^[ \t]*$/.test(between)) {
            // This is a blank line - mark all open expressions as paragraph-spanning
            openStack.forEach(entry => {
              entry.hasBlankLine = true;
            });
          }
        }
        lastNewlinePos = i;
      }
    }

    // Skip already-escaped braces (count preceding backslashes)
    if (ch === '{' || ch === '}') {
      let bs = 0;
      for (let j = i - 1; j >= 0 && chars[j] === '\\'; j -= 1) bs += 1;
      if (bs % 2 === 1) {
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    if (ch === '{') {
      // If preceded by `=` (ignoring whitespace), this is a JSX attribute
      // expression (e.g. `data={[...]}`). The mdxComponent tokenizer captures
      // the entire component block, so blank lines inside attribute values
      // won't split paragraphs — skip the blank-line check for these.
      let isAttrExpr = false;
      for (let j = i - 1; j >= 0; j -= 1) {
        const pc = chars[j];
        if (pc === '=') { isAttrExpr = true; break; }
        if (pc !== ' ' && pc !== '\t') break;
      }
      // Nested `{ ... }` inside an attribute value (e.g. `data={[{ ... }]}` or
      // `data={{ a: { b: 1 } }}`) must inherit the same exemption; only the
      // outer `{` is directly after `=`.
      if (!isAttrExpr && openStack.length > 0) {
        const parent = openStack[openStack.length - 1];
        if (parent.isAttrExpr) {
          isAttrExpr = true;
        }
      }
      openStack.push({ pos: i, hasBlankLine: false, isAttrExpr });
      lastNewlinePos = -2; // Reset newline tracking for new expression
    } else if (ch === '}') {
      if (openStack.length > 0) {
        const entry = openStack.pop()!;
        // Don't escape pure JSX comments, the `jsxComment` tokenizer downstream
        // already knows how to swallow a whole `{/* ... */}` block in one go,
        // even if the body has blank lines in it. If we escape the braces here
        // the tokenizer never gets a shot at it.
        //
        // "Pure" means the braces open with `{/*` and close with `*/}` right
        // next to each other. Something like `{/* c */ expr\n\nmore}` is just
        // a regular expression that happens to start with a comment, so it
        // still needs the normal blank-line protection.
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
        // Unbalanced closing brace (no matching open)
        toEscape.add(i);
      }
    }
  }

  // Any remaining open braces are unbalanced
  openStack.forEach(entry => toEscape.add(entry.pos));

  // If there are no problematic braces, return safe content as-is;
  // otherwise, escape each problematic `{` or `}` so MDX doesn't treat them as expressions.
  let result = toEscape.size === 0 ? safe : chars.map((ch, i) => (toEscape.has(i) ? `\\${ch}` : ch)).join('');

  // Restore HTML elements
  if (htmlElements.length > 0) {
    result = result.replace(/___HTML_ELEM_(\d+)___/g, (_m, idx) => htmlElements[parseInt(idx, 10)]);
  }

  return result;
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

  processed = escapeProblematicBraces(protectedContent);

  processed = restoreCodeBlocks(processed, protectedCode);

  return processed;
}

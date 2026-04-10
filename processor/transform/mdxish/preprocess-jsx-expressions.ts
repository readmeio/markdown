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
 * Marker prefix for JSON-serialized non-primitive prop values (objects/arrays).
 * The mdxJsx handler wraps complex values in this marker so they can round-trip
 * through rehypeRaw's HTML serialization step, and the render layer unwraps them
 * back into real JS values before handing them to React.
 */
export const JSON_VALUE_MARKER = '__MDXISH_JSON__';

export type JSXContext = Record<string, unknown>;

/**
 * Evaluates a JavaScript expression using context variables.
 * Used by the mdast-level text-expression transformer.
 *
 * @param expression
 * @param context
 * @returns The evaluated result
 * @example
 * ```typescript
 * const context = { baseUrl: 'https://example.com', path: '/api' };
 * evaluateExpression('baseUrl + path', context)
 * // Returns: 'https://example.com/api'
 * ```
 */
export function evaluateExpression(expression: string, context: JSXContext) {
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);
  // eslint-disable-next-line no-new-func
  const func = new Function(...contextKeys, `return ${expression}`);
  return func(...contextValues);
}

/**
 * Base64 encodes HTMLBlock template literal content to prevent markdown parser from consuming <script>/<style> tags.
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
 */
export function removeJSXComments(content: string): string {
  return content.replace(/\{\s*\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/\s*\}/g, '');
}

/**
 * Escapes problematic braces in content to prevent MDX expression parsing errors.
 * Handles unbalanced braces and paragraph-spanning expressions. Skips HTML elements
 * so backslashes don't leak into rendered output via rehypeRaw.
 */
function escapeProblematicBraces(content: string): string {
  const htmlElements: string[] = [];
  const safe = content.replace(/<([a-z][a-zA-Z0-9]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, match => {
    const idx = htmlElements.length;
    htmlElements.push(match);
    return `___HTML_ELEM_${idx}___`;
  });

  const toEscape = new Set<number>();
  const chars = Array.from(safe);
  let strDelim: string | null = null;
  let strEscaped = false;
  const openStack: { hasBlankLine: boolean; pos: number }[] = [];
  let lastNewlinePos = -2;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];

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
            openStack.forEach(entry => {
              entry.hasBlankLine = true;
            });
          }
        }
        lastNewlinePos = i;
      }
    }

    if (ch === '{' || ch === '}') {
      let bs = 0;
      for (let j = i - 1; j >= 0 && chars[j] === '\\'; j -= 1) bs += 1;
      if (bs % 2 === 1) {
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    if (ch === '{') {
      openStack.push({ pos: i, hasBlankLine: false });
      lastNewlinePos = -2;
    } else if (ch === '}') {
      if (openStack.length > 0) {
        const entry = openStack.pop()!;
        if (entry.hasBlankLine) {
          toEscape.add(entry.pos);
          toEscape.add(i);
        }
      } else {
        toEscape.add(i);
      }
    }
  }

  openStack.forEach(entry => toEscape.add(entry.pos));

  let result = toEscape.size === 0
    ? safe
    : chars.map((ch, i) => (toEscape.has(i) ? `\\${ch}` : ch)).join('');

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

import {
  type ProtectedCode,
  protectCodeBlocks,
  restoreCodeBlocks,
  restoreInlineCode,
} from '../../../lib/utils/mdxish/protect-code-blocks';

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

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
}

// Marker prefix for JSON-serialized complex values (arrays/objects)
// Using a prefix that won't conflict with regular string values
export const JSON_VALUE_MARKER = '__MDXISH_JSON__';

// Markers for protected HTMLBlock content (HTML comments avoid markdown parsing issues)
export const HTML_BLOCK_CONTENT_START = '<!--RDMX_HTMLBLOCK:';
export const HTML_BLOCK_CONTENT_END = ':RDMX_HTMLBLOCK-->';

/**
 * Pre-processes JSX-like expressions before markdown parsing.
 * Converts href={'value'} to href="value", evaluates {expressions}, etc.
 */
export type JSXContext = Record<string, unknown>;

/**
 * Evaluates a JavaScript expression using context variables.
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
function removeJSXComments(content: string): string {
  return content.replace(/\{\s*\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/\s*\}/g, '');
}

/**
 * Extracts content between balanced braces, handling nested braces.
 *
 * @param content
 * @param start
 * @returns Object with extracted content and end position, or null if braces are unbalanced
 * @example
 * ```typescript
 * const input = 'foo{bar{baz}qux}end';
 * extractBalancedBraces(input, 3) // start at position 3 (after '{')
 * // Returns: { content: 'bar{baz}qux', end: 16 }
 * ```
 */
function extractBalancedBraces(content: string, start: number): { content: string; end: number } | null {
  let depth = 1;
  let pos = start;

  while (pos < content.length && depth > 0) {
    const char = content[pos];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    pos += 1;
  }

  if (depth !== 0) return null;
  return { content: content.slice(start, pos - 1), end: pos };
}

/**
 * Converts JSX attribute expressions (attribute={expression}) to HTML attributes (attribute="value").
 * Handles style objects (camelCase → kebab-case), className → class, and JSON stringifies objects.
 *
 * @param content
 * @param context
 * @returns Content with attribute expressions evaluated and converted to HTML attributes
 * @example
 * ```typescript
 * const context = { baseUrl: 'https://example.com' };
 * const input = '<a href={baseUrl}>Link</a>';
 * evaluateAttributeExpressions(input, context)
 * // Returns: '<a href="https://example.com">Link</a>'
 * ```
 */
function evaluateAttributeExpressions(content: string, context: JSXContext, protectedCode?: ProtectedCode) {
  const attrStartRegex = /(\w+)=\{/g;
  let result = '';
  let lastEnd = 0;
  let match = attrStartRegex.exec(content);

  while (match !== null) {
    const attributeName = match[1];
    const braceStart = match.index + match[0].length;

    const extracted = extractBalancedBraces(content, braceStart);
    if (extracted) {
      // The expression might contain template literals in MDX component tag props
      // E.g. <Component greeting={`Hello World!`} />
      // that is marked as inline code. So we need to restore the inline codes
      // in the expression to evaluate it
      let expression = extracted.content;
      if (protectedCode) {
        expression = restoreInlineCode(expression, protectedCode);
      }
      const fullMatchEnd = extracted.end;

      result += content.slice(lastEnd, match.index);

      try {
        const evalResult = evaluateExpression(expression, context);

        if (typeof evalResult === 'object' && evalResult !== null) {
          if (attributeName === 'style') {
            const cssString = Object.entries(evalResult)
              .map(([key, value]) => {
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                return `${cssKey}: ${value}`;
              })
              .join('; ');
            result += `style="${cssString}"`;
          } else {
            // These are arrays / objects attribute values
            // Mark JSON-serialized values with a prefix so they can be parsed back correctly
            const jsonValue = escapeHtmlAttribute(JSON_VALUE_MARKER + JSON.stringify(evalResult));
            // Use double quotes so that multi-paragraph values are not split into multiple attributes by the processors
            result += `${attributeName}="${jsonValue}"`;
          }
        } else if (attributeName === 'className') {
          // Escape special characters so that it doesn't break and split the attribute value to nodes
          // This will be restored later in the pipeline
          result += `class="${escapeHtmlAttribute(String(evalResult))}"`;
        } else {
          result += `${attributeName}="${escapeHtmlAttribute(String(evalResult))}"`;
        }
      } catch (_error) {
        result += content.slice(match.index, fullMatchEnd);
      }

      lastEnd = fullMatchEnd;
      attrStartRegex.lastIndex = fullMatchEnd;
    }
    match = attrStartRegex.exec(content);
  }
  result += content.slice(lastEnd);
  return result;
}

/**
 * Preprocesses JSX-like expressions in markdown before parsing.
 * Inline expressions are handled separately; attribute expressions are processed here.
 *
 * @param content
 * @param context
 * @returns Preprocessed content ready for markdown parsing
 */
export function preprocessJSXExpressions(content: string, context: JSXContext = {}): string {
  // Step 0: Base64 encode HTMLBlock content
  let processed = protectHTMLBlockContent(content);

  // Step 1: Protect code blocks and inline code
  const { protectedCode, protectedContent } = protectCodeBlocks(processed);

  // Step 2: Remove JSX comments
  processed = removeJSXComments(protectedContent);

  // Step 3: Evaluate attribute expressions (JSX attribute syntax: href={baseUrl})
  // For inline expressions, we use a library to parse the expression & evaluate it later
  // For attribute expressions, it was difficult to use a library to parse them, so do it manually
  processed = evaluateAttributeExpressions(processed, context, protectedCode);

  // Step 4: Restore protected code blocks
  processed = restoreCodeBlocks(processed, protectedCode);

  return processed;
}

/**
 * Pre-processes JSX-like expressions before markdown parsing.
 * Converts href={'value'} to href="value", evaluates {expressions}, etc.
 */

export type JSXContext = Record<string, unknown>;

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

interface ProtectedCode {
  codeBlocks: string[];
  inlineCode: string[];
}

interface ProtectCodeBlocksResult {
  protectedCode: ProtectedCode;
  protectedContent: string;
}

/**
 * Evaluates a JavaScript expression using the provided context variables.
 *
 * Creates a function dynamically with context variables as parameters, then executes
 * the expression. This allows safe evaluation of user-provided expressions with
 * controlled variable access.
 *
 * @param expression - The JavaScript expression to evaluate (e.g., "baseUrl + '/path'")
 * @param context - Object containing variables available in the expression
 * @returns The evaluated result
 * @example
 * ```typescript
 * const context = { baseUrl: 'https://example.com', path: '/api' };
 * evaluateExpression('baseUrl + path', context)
 * // Returns: 'https://example.com/api'
 * ```
 * @example
 * ```typescript
 * const context = { count: 5 };
 * evaluateExpression('count * 2', context)
 * // Returns: 10
 * ```
 */
function evaluateExpression(expression: string, context: JSXContext): unknown {
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);
  // eslint-disable-next-line no-new-func
  const func = new Function(...contextKeys, `return ${expression}`);
  return func(...contextValues);
}

/**
 * Protects HTMLBlock template literal content by base64 encoding it.
 *
 * This prevents the markdown parser from consuming <script>/<style> tags inside HTMLBlocks.
 * The template literal content is extracted, base64 encoded, and wrapped in HTML comments
 * that markdown parsers will ignore.
 *
 * Pattern matched: `<HTMLBlock>{` template-content `}</HTMLBlock>`
 * The template content is base64 encoded and wrapped in special HTML comment markers.
 *
 * @param content - The markdown content containing HTMLBlocks
 * @returns Content with HTMLBlock template literals base64 encoded and wrapped in HTML comments
 * @example
 * ```typescript
 * const input = '<HTMLBlock>{`<script>alert("xss")</script>`}</HTMLBlock>';
 * protectHTMLBlockContent(input)
 * // Returns: '<HTMLBlock><!--RDMX_HTMLBLOCK:PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=:RDMX_HTMLBLOCK--></HTMLBlock>'
 * ```
 * @example
 * ```typescript
 * const input = '<HTMLBlock>{`console.log("hello");`}</HTMLBlock>';
 * protectHTMLBlockContent(input)
 * // Returns: '<HTMLBlock><!--RDMX_HTMLBLOCK:Y29uc29sZS5sb2coImhlbGxvIik7:RDMX_HTMLBLOCK--></HTMLBlock>'
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
 * Protects code blocks and inline code from JSX processing.
 *
 * Replaces fenced code blocks (```code block```) and inline code (`inline code`) with placeholders
 * so they aren't affected by expression evaluation or other JSX processing steps.
 * The original code is stored in arrays for later restoration.
 *
 * Process:
 * 1. Find all fenced code blocks (```code block```) and replace with placeholders
 * 2. Find all inline code (`inline code`) and replace with placeholders
 * 3. Store originals in arrays for later restoration
 *
 * @param content - The markdown content to protect
 * @returns Object containing protected content and arrays of original code blocks
 * @example
 * ```typescript
 * const input = 'Text with `inline code` and ```fenced block```';
 * protectCodeBlocks(input)
 * // Returns: {
 * //   protectedCode: {
 * //     codeBlocks: ['```fenced block```'],
 * //     inlineCode: ['`inline code`']
 * //   },
 * //   protectedContent: 'Text with ___INLINE_CODE_0___ and ___CODE_BLOCK_0___'
 * // }
 * ```
 * @example
 * ```typescript
 * const input = '```js\nconst x = {value: 1};\n```';
 * protectCodeBlocks(input)
 * // Returns: {
 * //   protectedCode: {
 * //     codeBlocks: ['```js\nconst x = {value: 1};\n```'],
 * //     inlineCode: []
 * //   },
 * //   protectedContent: '___CODE_BLOCK_0___'
 * // }
 * ```
 */
function protectCodeBlocks(content: string): ProtectCodeBlocksResult {
  const codeBlocks: string[] = [];
  const inlineCode: string[] = [];

  let protectedContent = '';
  let remaining = content;
  let codeBlockStart = remaining.indexOf('```');

  while (codeBlockStart !== -1) {
    protectedContent += remaining.slice(0, codeBlockStart);
    remaining = remaining.slice(codeBlockStart);

    const codeBlockEnd = remaining.indexOf('```', 3);
    if (codeBlockEnd === -1) {
      break;
    }

    const match = remaining.slice(0, codeBlockEnd + 3);
    const index = codeBlocks.length;
    codeBlocks.push(match);
    protectedContent += `___CODE_BLOCK_${index}___`;

    remaining = remaining.slice(codeBlockEnd + 3);
    codeBlockStart = remaining.indexOf('```');
  }
  protectedContent += remaining;

  protectedContent = protectedContent.replace(/`[^`]+`/g, match => {
    const index = inlineCode.length;
    inlineCode.push(match);
    return `___INLINE_CODE_${index}___`;
  });

  return { protectedCode: { codeBlocks, inlineCode }, protectedContent };
}

/**
 * Removes JSX-style comments from content.
 *
 * JSX comments are wrapped in braces with C-style comment syntax.
 * Format: opening brace, optional whitespace, slash-asterisk, comment content, asterisk-slash, optional whitespace, closing brace.
 * These comments would confuse the markdown parser, so they're removed before processing.
 *
 * The regex matches:
 * - Opening brace with optional whitespace
 * - Comment start marker (slash-asterisk)
 * - Comment content (handling asterisks that don't close the comment)
 * - Comment end marker (asterisk-slash)
 * - Optional whitespace and closing brace
 *
 * @param content - Content potentially containing JSX comments
 * @returns Content with JSX comments removed
 * @example
 * Input: 'Text { /* comment *\/ } more text'
 * Output: 'Text  more text'
 * @example
 * Input: '{ /* comment *\/ }'
 * Output: ''
 */
function removeJSXComments(content: string): string {
  return content.replace(/\{\s*\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/\s*\}/g, '');
}

/**
 * Extracts content between balanced braces starting at a given position.
 *
 * Tracks brace depth to handle nested braces correctly. Starts at depth 1 since
 * the opening brace is already consumed. Returns the content between braces
 * (excluding the braces themselves) and the position after the closing brace.
 *
 * @param content - The string to search in
 * @param start - Starting position (should be after the opening {)
 * @returns Object with extracted content and end position, or null if braces are unbalanced
 * @example
 * ```typescript
 * const input = 'foo{bar{baz}qux}end';
 * extractBalancedBraces(input, 3) // start at position 3 (after '{')
 * // Returns: { content: 'bar{baz}qux', end: 16 }
 * ```
 * @example
 * ```typescript
 * const input = 'attr={value}';
 * extractBalancedBraces(input, 6) // start at position 6 (after '{')
 * // Returns: { content: 'value', end: 12 }
 * ```
 * @example
 * ```typescript
 * const input = 'unbalanced{';
 * extractBalancedBraces(input, 10)
 * // Returns: null (unbalanced braces)
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
 * Evaluates JSX attribute expressions and converts them to HTML attributes.
 *
 * Transforms JSX attribute syntax (attribute={expression}) to HTML attributes (attribute="value").
 * The expression is evaluated using the provided context, and the result is converted to
 * a string value for the HTML attribute.
 *
 * Special handling:
 * - `style` objects are converted to CSS strings (camelCase → kebab-case)
 * - `className` is converted to `class` (HTML standard)
 * - Objects are JSON stringified
 * - If evaluation fails, the original expression is kept unchanged
 *
 * @param content - Content containing JSX attribute expressions
 * @param context - Context object for expression evaluation
 * @returns Content with attribute expressions evaluated and converted to HTML attributes
 * @example
 * ```typescript
 * const context = { baseUrl: 'https://example.com' };
 * const input = '<a href={baseUrl}>Link</a>';
 * evaluateAttributeExpressions(input, context)
 * // Returns: '<a href="https://example.com">Link</a>'
 * ```
 * @example
 * ```typescript
 * const context = { isActive: true };
 * const input = '<div active={isActive}>Content</div>';
 * evaluateAttributeExpressions(input, context)
 * // Returns: '<div active="true">Content</div>'
 * ```
 * @example
 * ```typescript
 * const context = { styles: { backgroundColor: 'red', fontSize: '14px' } };
 * const input = '<div style={styles}>Content</div>';
 * evaluateAttributeExpressions(input, context)
 * // Returns: '<div style="background-color: red; font-size: 14px">Content</div>'
 * ```
 * @example
 * ```typescript
 * const context = { className: 'my-class' };
 * const input = '<div className={className}>Content</div>';
 * evaluateAttributeExpressions(input, context)
 * // Returns: '<div class="my-class">Content</div>'
 * ```
 * @example
 * ```typescript
 * const context = { data: { id: 1, name: 'test' } };
 * const input = '<div data={data}>Content</div>';
 * evaluateAttributeExpressions(input, context)
 * // Returns: '<div data=\'{"id":1,"name":"test"}\'>Content</div>'
 * ```
 */
function evaluateAttributeExpressions(content: string, context: JSXContext): string {
  const attrStartRegex = /(\w+)=\{/g;
  let result = '';
  let lastEnd = 0;
  let match = attrStartRegex.exec(content);

  while (match !== null) {
    const attributeName = match[1];
    const braceStart = match.index + match[0].length;

    const extracted = extractBalancedBraces(content, braceStart);
    if (extracted) {
      const expression = extracted.content;
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
            result += `${attributeName}='${JSON.stringify(evalResult)}'`;
          }
        } else if (attributeName === 'className') {
          result += `class="${evalResult}"`;
        } else {
          result += `${attributeName}="${evalResult}"`;
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
 * Restores code blocks and inline code that were protected earlier.
 *
 * Replaces placeholders (___CODE_BLOCK_N___ and ___INLINE_CODE_N___) with the
 * original code content that was stored during the protection phase.
 *
 * @param content - Content with code block placeholders
 * @param protectedCode - Object containing arrays of original code blocks and inline code
 * @returns Content with all code blocks and inline code restored
 * @example
 * ```typescript
 * const content = 'Text with ___INLINE_CODE_0___ and ___CODE_BLOCK_0___';
 * const protectedCode = {
 *   codeBlocks: ['```js\ncode\n```'],
 *   inlineCode: ['`inline`']
 * };
 * restoreCodeBlocks(content, protectedCode)
 * // Returns: 'Text with `inline` and ```js\ncode\n```'
 * ```
 */
function restoreCodeBlocks(content: string, protectedCode: ProtectedCode): string {
  let restored = content.replace(/___CODE_BLOCK_(\d+)___/g, (_match, index: string) => {
    return protectedCode.codeBlocks[parseInt(index, 10)];
  });

  restored = restored.replace(/___INLINE_CODE_(\d+)___/g, (_match, index: string) => {
    return protectedCode.inlineCode[parseInt(index, 10)];
  });

  return restored;
}

/**
 * Main preprocessing function for JSX-like expressions in markdown.
 *
 * We can't rely on remarkMdx since it restricts the syntax too much, so we manually
 * parse and process JSX syntax before the markdown parser runs.
 *
 * Processing pipeline (executed in order):
 * 1. Protect HTMLBlock content (base64 encode to prevent parser from consuming <script>/<style>)
 * 2. Protect code blocks and inline code (so they aren't affected by JSX processing)
 * 3. Remove JSX comments (they would confuse the markdown parser)
 * 4. Evaluate attribute expressions (convert href={baseUrl} to href="value")
 * 5. Restore protected code blocks (put them back in place)
 *
 * Note: Inline expressions (like {variable} in text) are handled by a separate library
 * later in the pipeline. Attribute expressions are processed here because it's difficult
 * to use a library to parse them in the context of JSX attributes.
 *
 * @param content - The markdown content containing JSX-like syntax
 * @param context - Context object providing variables for expression evaluation
 * @returns Preprocessed content ready for markdown parsing
 * @example
 * ```typescript
 * const context = {
 *   baseUrl: 'https://example.com',
 *   userId: '123',
 *   isActive: true
 * };
 * const input = `
 * <a href={baseUrl} id={userId} active={isActive}>Link</a>
 * \`\`\`js
 * const x = {value: 1};
 * \`\`\`
 * `;
 * preprocessJSXExpressions(input, context)
 * // Returns content with:
 * // - href={baseUrl} → href="https://example.com"
 * // - id={userId} → id="123"
 * // - active={isActive} → active="true"
 * // - Code blocks preserved unchanged
 * ```
 * @example
 * ```typescript
 * const context = { className: 'my-class' };
 * const input = '<div className={className}>Content</div>';
 * preprocessJSXExpressions(input, context)
 * // Returns: '<div class="my-class">Content</div>'
 * ```
 * @example
 * Input: 'Text { /* comment *\/ } more text'
 * Output: 'Text  more text' (comment removed)
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
  processed = evaluateAttributeExpressions(processed, context);

  // Step 4: Restore protected code blocks
  processed = restoreCodeBlocks(processed, protectedCode);

  return processed;
}

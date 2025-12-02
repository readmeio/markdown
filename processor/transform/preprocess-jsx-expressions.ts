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

// Helper function to evaluate an expression using the provided context
function evaluateExpression(expression: string, context: JSXContext): unknown {
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);
  // eslint-disable-next-line no-new-func
  const func = new Function(...contextKeys, `return ${expression}`);
  return func(...contextValues);
}

// Base64 encode HTMLBlock content to prevent parser from consuming <script>/<style> tags
function protectHTMLBlockContent(content: string): string {
  // each char matches exactly one way, preventing backtracking
  return content.replace(
    /(<HTMLBlock[^>]*>)\{\s*`((?:[^`\\]|\\.)*)`\s*\}(<\/HTMLBlock>)/g,
    (_match, openTag: string, templateContent: string, closeTag: string) => {
      const encoded = base64Encode(templateContent);
      return `${openTag}${HTML_BLOCK_CONTENT_START}${encoded}${HTML_BLOCK_CONTENT_END}${closeTag}`;
    },
  );
}

// Protect code blocks and inline code from processing
function protectCodeBlocks(content: string): ProtectCodeBlocksResult {
  const codeBlocks: string[] = [];
  const inlineCode: string[] = [];

  let protectedContent = '';
  let remaining = content;
  let codeBlockStart = remaining.indexOf('```');

  while (codeBlockStart !== -1) {
    protectedContent += remaining.slice(0, codeBlockStart);
    remaining = remaining.slice(codeBlockStart);

    // Find the closing ```
    const codeBlockEnd = remaining.indexOf('```', 3);
    if (codeBlockEnd === -1) {
      // No closing ```, keep the rest as-is
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

function removeJSXComments(content: string): string {
  // This matches: any non-* chars, then (* followed by non-/ followed by non-* chars) repeated
  return content.replace(/\{\s*\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/\s*\}/g, '');
}

// Returns content between balanced braces and end position, or null if unbalanced
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

// Evaluate attribute expressions: attribute={expression} → attribute="value"
function evaluateAttributeExpressions(content: string, context: JSXContext): string {
  // Match attribute names followed by ={
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

function restoreCodeBlocks(content: string, protectedCode: ProtectedCode): string {
  let restored = content.replace(/___CODE_BLOCK_(\d+)___/g, (_match, index: string) => {
    return protectedCode.codeBlocks[parseInt(index, 10)];
  });

  restored = restored.replace(/___INLINE_CODE_(\d+)___/g, (_match, index: string) => {
    return protectedCode.inlineCode[parseInt(index, 10)];
  });

  return restored;
}

// We cant rely on remarkMdx since it restricts the syntax a lot
// so we have to try as much as possible to parse JSX syntax manually
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

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
  return content.replace(
    /(<HTMLBlock[^>]*>)\{\s*`([\s\S]*?)`\s*\}(<\/HTMLBlock>)/g,
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

  let protectedContent = content.replace(/```[\s\S]*?```/g, match => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `___CODE_BLOCK_${index}___`;
  });

  protectedContent = protectedContent.replace(/`[^`]+`/g, match => {
    const index = inlineCode.length;
    inlineCode.push(match);
    return `___INLINE_CODE_${index}___`;
  });

  return { protectedCode: { codeBlocks, inlineCode }, protectedContent };
}

function removeJSXComments(content: string): string {
  return content.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
}

// Evaluate attribute expressions: attribute={expression} → attribute="value"
function evaluateAttributeExpressions(content: string, context: JSXContext): string {
  const jsxAttributeRegex = /(\w+)=\{((?:[^{}]|\{[^}]*\})*)\}/g;

  return content.replace(jsxAttributeRegex, (match, attributeName: string, expression: string) => {
    try {
      const result = evaluateExpression(expression, context);

      if (typeof result === 'object' && result !== null) {
        if (attributeName === 'style') {
          // Convert style object to CSS string
          const cssString = Object.entries(result)
            .map(([key, value]) => {
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${cssKey}: ${value}`;
            })
            .join('; ');
          return `style="${cssString}"`;
        }
        return `${attributeName}='${JSON.stringify(result)}'`;
      }

      if (attributeName === 'className') {
        return `class="${result}"`;
      }

      return `${attributeName}="${result}"`;
    } catch (_error) {
      return match;
    }
  });
}

// Evaluate inline expressions: {expression} → result
function evaluateInlineExpressions(content: string, context: JSXContext): string {
  return content.replace(/\{([^{}]+)\}/g, (match, expression: string, offset: number, string: string) => {
    try {
      // Skip if part of an attribute (preceded by =)
      if (string.substring(Math.max(0, offset - 1), offset) === '=') {
        return match;
      }

      // Unescape markdown characters
      const unescapedExpression = expression.replace(/\\\*/g, '*').replace(/\\_/g, '_').replace(/\\`/g, '`').trim();

      const result = evaluateExpression(unescapedExpression, context);

      if (result === null || result === undefined) return '';
      if (typeof result === 'object') return JSON.stringify(result);
      return String(result).replace(/\s+/g, ' ').trim();
    } catch (_error) {
      return match;
    }
  });
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

export function preprocessJSXExpressions(content: string, context: JSXContext = {}): string {
  // Step 0: Base64 encode HTMLBlock content
  let processed = protectHTMLBlockContent(content);

  // Step 1: Protect code blocks and inline code
  const { protectedCode, protectedContent } = protectCodeBlocks(processed);

  // Step 2: Remove JSX comments
  processed = removeJSXComments(protectedContent);

  // Step 3: Evaluate attribute expressions
  processed = evaluateAttributeExpressions(processed, context);

  // Step 4: Evaluate inline expressions
  processed = evaluateInlineExpressions(processed, context);

  // Step 5: Restore protected code blocks
  processed = restoreCodeBlocks(processed, protectedCode);

  return processed;
}

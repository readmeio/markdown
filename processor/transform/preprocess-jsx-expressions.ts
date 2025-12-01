/**
 * Pre-processes JSX-like expressions before markdown parsing.
 * Converts href={'value'} to href="value", evaluates {expressions}, etc.
 */

export type JSXContext = Record<string, unknown>;

/** Base64 encode (Node.js + browser compatible) */
function base64Encode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(str)));
}

/** Base64 decode (Node.js + browser compatible) */
export function base64Decode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(str)));
}

// Markers for protected HTMLBlock content (HTML comments avoid markdown parsing issues)
export const HTML_BLOCK_CONTENT_START = '<!--RDMX_HTMLBLOCK:';
export const HTML_BLOCK_CONTENT_END = ':RDMX_HTMLBLOCK-->';

export function preprocessJSXExpressions(content: string, context: JSXContext = {}): string {
  // Step 0: Base64 encode HTMLBlock content to prevent parser from consuming <script>/<style> tags
  let protectedContent = content.replace(
    /(<HTMLBlock[^>]*>)\{\s*`([\s\S]*?)`\s*\}(<\/HTMLBlock>)/g,
    (_match, openTag: string, templateContent: string, closeTag: string) => {
      const encoded = base64Encode(templateContent);
      return `${openTag}${HTML_BLOCK_CONTENT_START}${encoded}${HTML_BLOCK_CONTENT_END}${closeTag}`;
    },
  );

  // Step 1: Protect code blocks and inline code from processing
  const codeBlocks: string[] = [];
  const inlineCode: string[] = [];

  protectedContent = protectedContent.replace(/```[\s\S]*?```/g, match => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `___CODE_BLOCK_${index}___`;
  });

  protectedContent = protectedContent.replace(/`[^`]+`/g, match => {
    const index = inlineCode.length;
    inlineCode.push(match);
    return `___INLINE_CODE_${index}___`;
  });

  // Step 2: Remove JSX comments {/* ... */}
  protectedContent = protectedContent.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

  // Step 3: Evaluate attribute expressions: attribute={expression} → attribute="value"
  const jsxAttributeRegex = /(\w+)=\{((?:[^{}]|\{[^}]*\})*)\}/g;

  protectedContent = protectedContent.replace(jsxAttributeRegex, (match, attributeName: string, expression: string) => {
    try {
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      // eslint-disable-next-line no-new-func
      const func = new Function(...contextKeys, `return ${expression}`);
      const result = func(...contextValues);

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

  // Step 4: Evaluate inline expressions: {expression} → result
  protectedContent = protectedContent.replace(
    /\{([^{}]+)\}/g,
    (match, expression: string, offset: number, string: string) => {
      try {
        // Skip if part of an attribute (preceded by =)
        if (string.substring(Math.max(0, offset - 1), offset) === '=') {
          return match;
        }

        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);

        // Unescape markdown characters
        const unescapedExpression = expression.replace(/\\\*/g, '*').replace(/\\_/g, '_').replace(/\\`/g, '`').trim();

        // eslint-disable-next-line no-new-func
        const func = new Function(...contextKeys, `return ${unescapedExpression}`);
        const result = func(...contextValues);

        if (result === null || result === undefined) return '';
        if (typeof result === 'object') return JSON.stringify(result);
        return String(result).replace(/\s+/g, ' ').trim();
      } catch (_error) {
        return match;
      }
    },
  );

  // Step 5: Restore protected code blocks
  protectedContent = protectedContent.replace(/___CODE_BLOCK_(\d+)___/g, (_match, index: string) => {
    return codeBlocks[parseInt(index, 10)];
  });

  protectedContent = protectedContent.replace(/___INLINE_CODE_(\d+)___/g, (_match, index: string) => {
    return inlineCode[parseInt(index, 10)];
  });

  return protectedContent;
}

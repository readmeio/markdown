/**
 * Pre-process JSX-like expressions: converts href={'value'} to href="value"
 * This allows mixing JSX syntax with regular markdown
 */

export type JSXContext = Record<string, unknown>;

export function preprocessJSXExpressions(content: string, context: JSXContext = {}): string {
  // Step 1: Extract and protect code blocks and inline code FIRST
  // This prevents JSX comment removal from affecting code examples
  const codeBlocks: string[] = [];
  const inlineCode: string[] = [];
  let protectedContent = content;

  // Extract code blocks (```...```)
  protectedContent = protectedContent.replace(/```[\s\S]*?```/g, match => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `___CODE_BLOCK_${index}___`;
  });

  // Extract inline code (`...`)
  protectedContent = protectedContent.replace(/`[^`]+`/g, match => {
    const index = inlineCode.length;
    inlineCode.push(match);
    return `___INLINE_CODE_${index}___`;
  });

  // Step 2: Remove JSX comments {/* ... */}
  // These should be completely removed from the output
  // This happens AFTER protecting code blocks, so code examples are preserved
  protectedContent = protectedContent.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

  // Step 3: Process JSX expressions (only in non-code content)
  // Match attributes with curly brace expressions: attribute={expression}
  // This regex handles nested braces for object literals
  const jsxAttributeRegex = /(\w+)=\{((?:[^{}]|\{[^}]*\})*)\}/g;

  protectedContent = protectedContent.replace(jsxAttributeRegex, (match, attributeName: string, expression: string) => {
    try {
      // Create a function to evaluate the expression with the given context
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);

      // Evaluate the expression (safely with provided context only)
      // Using Function constructor is necessary for dynamic expression evaluation
      // eslint-disable-next-line no-new-func
      const func = new Function(...contextKeys, `return ${expression}`);
      const result = func(...contextValues);

      // Handle different result types
      if (typeof result === 'object' && result !== null) {
        // Special handling for style objects (convert to CSS string)
        if (attributeName === 'style') {
          const cssString = Object.entries(result)
            .map(([key, value]) => {
              // Convert camelCase to kebab-case (e.g., backgroundColor -> background-color)
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${cssKey}: ${value}`;
            })
            .join('; ');
          return `style="${cssString}"`;
        }

        // For other objects, stringify as JSON
        return `${attributeName}='${JSON.stringify(result)}'`;
      }

      // className in React/MDX maps to class in HTML
      if (attributeName === 'className') {
        return `class="${result}"`;
      }

      // Return as regular HTML attribute
      return `${attributeName}="${result}"`;
    } catch (_error) {
      return match;
    }
  });

  // Step 4: Process inline expressions: {expression} in text content
  // This allows MDX-style inline expressions like {1*1} or {variableName}
  protectedContent = protectedContent.replace(
    /\{([^{}]+)\}/g,
    (match, expression: string, offset: number, string: string) => {
      try {
        // Skip if this looks like it's part of an HTML tag (already processed above)
        // Check if immediately preceded by = (not just = somewhere in the previous 10 chars)
        const beforeMatch = string.substring(Math.max(0, offset - 1), offset);
        if (beforeMatch === '=') {
          return match;
        }

        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);

        // Unescape markdown escaped characters within the expression
        // Users might write {5 \* 10} to prevent markdown from treating * as formatting
        const unescapedExpression = expression
          .replace(/\\\*/g, '*') // Unescape asterisks
          .replace(/\\_/g, '_') // Unescape underscores
          .replace(/\\`/g, '`') // Unescape backticks
          .trim();

        // Evaluate the expression with the given context
        // Using Function constructor is necessary for dynamic expression evaluation
        // eslint-disable-next-line no-new-func
        const func = new Function(...contextKeys, `return ${unescapedExpression}`);
        const result = func(...contextValues);

        // Convert result to string
        if (result === null || result === undefined) {
          return '';
        }
        if (typeof result === 'object') {
          return JSON.stringify(result);
        }
        const resultString = String(result);
        // Ensure replacement doesn't break inline markdown context
        // Replace any newlines or multiple spaces with single space to preserve inline flow
        return resultString.replace(/\s+/g, ' ').trim();
      } catch (_error) {
        // Return original if evaluation fails
        return match;
      }
    },
  );

  // Step 5: Restore code blocks and inline code
  protectedContent = protectedContent.replace(/___CODE_BLOCK_(\d+)___/g, (_match, index: string) => {
    return codeBlocks[parseInt(index, 10)];
  });

  protectedContent = protectedContent.replace(/___INLINE_CODE_(\d+)___/g, (_match, index: string) => {
    return inlineCode[parseInt(index, 10)];
  });

  return protectedContent;
}

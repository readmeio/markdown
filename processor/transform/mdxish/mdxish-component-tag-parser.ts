import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';

// Simple regex to extract the PascalCase tag name at the start of a tag string.
const tagNamePattern = /^<([A-Z][A-Za-z0-9_]*)/;

const NAME_START = /[a-zA-Z_:]/;
const NAME_CHAR = /[-a-zA-Z0-9_:.]/;
const WHITESPACE = /\s/;
const QUOTE_CHARS = new Set(['"', "'", '`']);

/**
 * Advance `i` past a balanced region of braces and strings.
 * Starts with `braceDepth` already accounting for any opening `{` the caller consumed.
 * Stops when braceDepth reaches 0 or (if braceDepth started at 0) when `stopCh` is found.
 * Returns the new index.
 */
function skipBalanced(raw: string, i: number, braceDepth: number, stopCh?: string): number {
  let idx = i;
  let depth = braceDepth;
  let strDelim: string | null = null;

  while (idx < raw.length) {
    const ch = raw[idx];

    if (strDelim) {
      if (ch === '\\') {
        idx += 2;
      } else {
        if (ch === strDelim) strDelim = null;
        idx += 1;
      }
    } else if (QUOTE_CHARS.has(ch)) {
      strDelim = ch;
      idx += 1;
    } else if (ch === '{') {
      depth += 1;
      idx += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
      // If no stopCh, we're reading a standalone brace expression — return when balanced
      if (depth === 0 && !stopCh) return idx + 1;
      idx += 1;
    } else if (depth === 0 && stopCh && ch === stopCh) {
      return idx;
    } else {
      idx += 1;
    }
  }

  return idx;
}

export interface ParseAttributesOptions {
  /**
   * When true, attribute expressions (`attr={expr}`) are kept as literal strings with
   * their braces so downstream consumers don't evaluate them. This preserves safeMode
   * semantics where all expression syntax is ignored.
   */
  preserveExpressionsAsText?: boolean;
}

/**
 * Convert raw attribute string into mdxJsxAttribute entries using a single-pass
 * character-walking tokenizer. Handles arbitrary brace nesting depth.
 *
 * Supports:
 * - Boolean attributes: `empty` → value: null
 * - Quoted attributes: `attr="value"` or `attr='value'` → value: string
 * - Expression attributes: `attr={expr}` → value: MdxJsxAttributeValueExpression
 * - Unquoted attributes: `attr=value` → value: string
 */
export const parseAttributes = (raw: string, opts: ParseAttributesOptions = {}): MdxJsxAttribute[] => {
  const attributes: MdxJsxAttribute[] = [];
  const len = raw.length;
  let i = 0;

  while (i < len) {
    // Skip whitespace between attributes
    while (i < len && WHITESPACE.test(raw[i])) i += 1;
    if (i >= len) break;

    // Read attribute name
    if (!NAME_START.test(raw[i])) {
      i += 1;
    } else {
      const nameStart = i;
      while (i < len && NAME_CHAR.test(raw[i])) i += 1;
      const name = raw.slice(nameStart, i);

      // Skip whitespace, check for '='
      while (i < len && WHITESPACE.test(raw[i])) i += 1;
      if (i >= len || raw[i] !== '=') {
        attributes.push({ type: 'mdxJsxAttribute', name, value: null });
      } else {
        i += 1; // skip '='
        while (i < len && WHITESPACE.test(raw[i])) i += 1;

        // Read attribute value
        let value: MdxJsxAttribute['value'];
        if (i < len && raw[i] === '{') {
          // Brace expression — walk with depth counter
          const exprStart = i;
          i = skipBalanced(raw, i + 1, 1);
          const exprStr = raw.slice(exprStart, i);
          if (opts.preserveExpressionsAsText) {
            value = exprStr;
          } else {
            const expression: MdxJsxAttributeValueExpression = {
              type: 'mdxJsxAttributeValueExpression',
              value: exprStr.slice(1, -1),
            };
            value = expression;
          }
        } else if (i < len && (raw[i] === '"' || raw[i] === "'")) {
          // Quoted string
          const quote = raw[i];
          i += 1;
          const valueStart = i;
          while (i < len && raw[i] !== quote) i += 1;
          value = raw.slice(valueStart, i);
          i += 1;
        } else {
          // Unquoted value — read until whitespace or tag-end characters
          const valueStart = i;
          while (i < len && !WHITESPACE.test(raw[i]) && raw[i] !== '>') i += 1;
          value = raw.slice(valueStart, i);
        }

        attributes.push({ type: 'mdxJsxAttribute', name, value });
      }
    }
  }

  return attributes;
};

/**
 * Parse an HTML tag string into structured data.
 * Uses a simple regex for the tag name, then a character walker to find the
 * closing `>` so that brace expressions and quoted strings inside attributes
 * are handled correctly at any nesting depth.
 */
export const parseTag = (value: string, opts: ParseAttributesOptions = {}) => {
  const nameMatch = value.match(tagNamePattern);
  if (!nameMatch) return null;

  const tag = nameMatch[1];
  const afterName = nameMatch[0].length;

  // Walk to find closing `>`, respecting strings and balanced braces
  const closingIndex = skipBalanced(value, afterName, 0, '>');
  if (closingIndex >= value.length || value[closingIndex] !== '>') return null;

  const selfClosing = closingIndex > 0 && value[closingIndex - 1] === '/';
  const attrEnd = selfClosing ? closingIndex - 1 : closingIndex;
  const attrString = value.slice(afterName, attrEnd);
  const contentAfterTag = value.slice(closingIndex + 1);

  return {
    tag,
    attributes: parseAttributes(attrString, opts),
    selfClosing,
    contentAfterTag,
    attrString, // Just for debugging purposes
  };
};

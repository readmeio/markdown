import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
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
export declare const parseAttributes: (raw: string, opts?: ParseAttributesOptions) => MdxJsxAttribute[];
/**
 * Parse an HTML tag string into structured data.
 * Uses a simple regex for the tag name, then a character walker to find the
 * closing `>` so that brace expressions and quoted strings inside attributes
 * are handled correctly at any nesting depth.
 */
export declare const parseTag: (value: string, opts?: ParseAttributesOptions) => {
    tag: string;
    attributes: MdxJsxAttribute[];
    selfClosing: boolean;
    contentAfterTag: string;
    attrString: string;
};

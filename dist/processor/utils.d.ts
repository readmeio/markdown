import type { Root as HastRoot } from 'hast';
import type { Node, Root as MdastRoot, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
/**
 * Evaluate a JavaScript expression source and return its value.
 *
 * Wrapping in parens lets object literals (`{color: 'red'}`) parse as
 * expressions. Runs with no scope, so only self-contained literals resolve.
 *
 * > ☢️ **Danger**: this `eval`s JavaScript. Only call when safeMode is off —
 * > safeMode's contract is that expression syntax is never evaluated, and the
 * > pipeline guards against reaching this path by keeping attribute expressions
 * > as literal strings and skipping the expression transformer entirely.
 *
 * Throws on parse/runtime error; callers decide the fallback.
 */
export declare function evaluate(source: string): any;
/**
 * Formats the hProperties of a node as a string, so they can be compiled back into JSX/MDX.
 * This currently sets all the values to a string since we process/compile the MDX on the fly
 * through the editor, and it'll throw errors over malformed JSX. TODO: fix this.
 *
 * @template T
 * @param {Node} node
 * @returns {string} formatted hProperties as JSX attributes
 */
export declare const formatHProps: <T>(node: Node) => string;
/**
 * Formats an object of props as a string.
 *
 * @param {Object} props
 * @returns {string}
 */
export declare const formatProps: <T>(props: T) => string;
/**
 * Returns the hProperties of a node.
 *
 * @template T
 * @param {Node} node
 * @returns {T} hProperties
 */
export declare const getHProps: <T>(node: Node) => T;
/**
 * Returns array of hProperty keys.
 *
 * @template T
 * @param {Node} node
 * @returns {Array} array of hProperty keys
 */
export declare const getHPropKeys: <T>(node: Node) => string[];
/**
 * Gets the attributes of an MDX element and returns them as an object of hProperties.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {T} object of hProperties
 */
export declare const getAttrs: <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement) => T;
/**
 * Gets the children of an MDX element and returns them as an array of Text nodes.
 * Currently only being used by the HTML Block component, which only expects a single text node.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {Array} array of child text nodes
 */
export declare const getChildren: <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement) => T;
/**
 * Tests if a node is an MDX element.
 * TODO: Make this more extensible to all types of nodes. isElement(node, 'type' or ['type1', 'type2']), say
 *
 * @param {Node} node
 * @returns {(node is MdxJsxFlowElement | MdxJsxTextElement | MdxjsEsm)}
 */
export declare const isMDXElement: (node: Node) => node is MdxJsxFlowElement | MdxJsxTextElement;
/**
 * Tests if a node is an MDX ESM element (i.e. import or export).
 *
 * @param {Node} node
 * @returns {boolean}
 */
export declare const isMDXEsm: (node: Node) => node is MdxjsEsm;
/**
 * Takes an HTML string and formats it for display in the editor. Removes leading/trailing newlines
 * and unindents the HTML.
 *
 * @param {string} html - HTML content from template literal
 * @returns {string} processed HTML
 */
export declare function formatHtmlForMdxish(html: string): string;
/**
 * Takes an HTML string and formats it for display in the editor. Removes leading/trailing newlines
 * and unindents the HTML.
 *
 * @param {string} html
 * @returns {string} formatted HTML
 */
export declare const formatHTML: (html: string) => string;
/**
 * Reformat HTML for the markdown/mdx by adding an indentation to each line. This assures that the
 * HTML is indentend properly within the HTMLBlock component when rendered in the markdown/mdx.
 *
 * @param {string} html
 * @param {number} [indent=2]
 * @returns {string} re-formatted HTML
 */
export declare const reformatHTML: (html: string) => string;
export declare const toAttributes: (object: Record<string, unknown>, keys?: string[]) => MdxJsxAttribute[];
/**
 * Checks if a named export exists in the MDX tree. Accepts either an mdast or
 * a hast tree.
 *
 * example:
 * ```
 * const mdx = `export const Foo = 'bar';`
 *
 * hasNamedExport(mdast(mdx), 'Foo') => true
 * ```
 *
 */
export declare const hasNamedExport: (tree: HastRoot | MdastRoot, name: string) => boolean;
export declare const getExports: (tree: Root) => string[];

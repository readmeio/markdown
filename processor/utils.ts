import { Node } from 'mdast';
import { MdxJsxFlowElement, MdxJsxTextElement, MdxFlowExpression } from 'mdast-util-mdx';

/**
 * Formats the hProperties of a node as a string, so they can be compiled back into JSX/MDX.
 * This currently sets all the values to a string since we process/compile the MDX on the fly
 * through the editor, and it'll throw errors over malformed JSX. TODO: fix this.
 *
 * @param {Node} node
 * @returns {string} formatted hProperties as JSX attributes
 */
export const formatHProps = (node: Node): string => {
  const hProps = getHProps(node);
  const hPropKeys = getHPropKeys(node) as string[];
  return hPropKeys.map(key => `${key}="${hProps[key]}"`).join(' ');
}

/**
 * Returns the hProperties of a node.
 *
 * @template T
 * @param {Node} node
 * @returns {T} hProperties
 */
export const getHProps = <T>(node: Node): T => {
  const hProps = node.data?.hProperties || {};
  return hProps as T;
}

/**
 * Returns array of hProperty keys.
 *
 * @template T
 * @param {Node} node
 * @returns {Array} array of hProperty keys
 */
export const getHPropKeys = <T>(node: Node): any => { 
  const hProps = getHProps(node);
  return Object.keys(hProps) || [] as T;
}

/**
 * Gets the attributes of an MDX element and returns them as an object of hProperties.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {T} object of hProperties
 */
export const getAttrs = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement): any =>
  jsx.attributes.reduce((memo, attr) => {
    if ('name' in attr) {
      memo[attr.name] = attr.value;
    }

    return memo;
  }, {} as T);

/**
 * Gets the children of an MDX element and returns them as an array of Text nodes.
 * Currently only being used by the HTML Block component, which only expects a single text node.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {Array} array of child text nodes
 */
export const getChildren = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement): any =>
    jsx.children.reduce((memo, child: MdxFlowExpression, i) => {
     memo[i] = {
      type: 'text',
      value: child.value,
      position: child.position,
     };
      return memo;
    }, [] as T);

/**
 * Tests if a node is an MDX element.
 * TODO: Make this more extensible to all types of nodes. isElement(node, 'type' or ['type1', 'type2']), say
 *
 * @param {Node} node
 * @returns {(node is MdxJsxFlowElement | MdxJsxTextElement)}
 */
export const isMDXElement = (node: Node): node is MdxJsxFlowElement | MdxJsxTextElement => {
  return ['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type);
}

/**
 * Takes an HTML string and formats it for display in the editor. Removes leading/trailing newlines
 * and unindents the HTML.
 *
 * @param {string} html
 * @returns {string} formatted HTML
 */
export const formatHTML = (html: string): string => {
  // Remove leading/trailing backticks if present, since they're used to keep the HTML 
  // from being parsed prematurely
  if (html.startsWith('`') && html.endsWith('`')) {
    html = html.slice(1, -1);
  }
  // Removes the leading/trailing newlinesl
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '');

  // Get the number of spaces in the first line to determine the tab size
  const tab = cleaned.match(/^\s*/)[0].length;

  // Remove the first indentation level from each line 
  const tabRegex = new RegExp(`^\\s{${tab}}`, 'gm');
  const unindented = cleaned.replace(tabRegex, '');
  
  return unindented;
}

/**
 * Reformat HTML for the markdown/mdx by adding an indentation to each line. This assures that the
 * HTML is indentend properly within the HTMLBlock component when rendered in the markdown/mdx.
 *
 * @param {string} html
 * @param {number} [indent=2]
 * @returns {string} re-formatted HTML
 */
export const reformatHTML = (html: string, indent: number = 2): string => {
  // Remove leading/trailing newlines
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '');

  // Create a tab/indent with the specified number of spaces
  const tab = ' '.repeat(indent);

  // Indent each line of the HTML (converts to an array, indents each line, then joins back)
  const indented = cleaned.split('\n').map((line: string) => `${tab}${line}`).join('\n');

  return indented;
}

/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Root as HastRoot } from 'hast';
import type { Node, Root as MdastRoot, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxFlowExpression, MdxjsEsm } from 'mdast-util-mdx';
import type {
  MdxJsxAttribute,
  MdxJsxAttributeValueExpression,
  MdxJsxAttributeValueExpressionData,
} from 'mdast-util-mdx-jsx';

import { CONTINUE, EXIT, visit } from 'unist-util-visit';

import mdast from '../lib/mdast';

/**
 * Formats the hProperties of a node as a string, so they can be compiled back into JSX/MDX.
 * This currently sets all the values to a string since we process/compile the MDX on the fly
 * through the editor, and it'll throw errors over malformed JSX. TODO: fix this.
 *
 * @template T
 * @param {Node} node
 * @returns {string} formatted hProperties as JSX attributes
 */
export const formatHProps = <T>(node: Node): string => {
  const hProps = getHProps<T>(node);
  return formatProps<T>(hProps);
};

/**
 * Formats an object of props as a string.
 *
 * @param {Object} props
 * @returns {string}
 */
export const formatProps = <T>(props: T): string => {
  const keys = Object.keys(props);
  return keys.map(key => `${key}="${props[key]}"`).join(' ');
};

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
};

/**
 * Returns array of hProperty keys.
 *
 * @template T
 * @param {Node} node
 * @returns {Array} array of hProperty keys
 */
export const getHPropKeys = <T>(node: Node): string[] => {
  const hProps = getHProps<T>(node);
  return Object.keys(hProps) || [];
};

/**
 * Gets the attributes of an MDX element and returns them as an object of hProperties.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {T} object of hProperties
 */
export const getAttrs = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement): T =>
  jsx.attributes.reduce((memo, attr) => {
    if ('name' in attr) {
      if (typeof attr.value === 'string') {
        memo[attr.name] = attr.value;
      } else if (attr.value === null) {
        memo[attr.name] = true;
      } else if (attr.value.value !== 'undefined') {
        memo[attr.name] = JSON.parse(attr.value.value);
      }
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
export const getChildren = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement): T =>
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
 * @returns {(node is MdxJsxFlowElement | MdxJsxTextElement | MdxjsEsm)}
 */
export const isMDXElement = (node: Node): node is MdxJsxFlowElement | MdxJsxTextElement => {
  return ['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type);
};

/**
 * Tests if a node is an MDX ESM element (i.e. import or export).
 *
 * @param {Node} node
 * @returns {boolean}
 */
export const isMDXEsm = (node: Node): node is MdxjsEsm => {
  return node.type === 'mdxjsEsm';
};

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
    // eslint-disable-next-line no-param-reassign
    html = html.slice(1, -1);
  }
  // Removes the leading/trailing newlines
  let cleaned = html.replace(/^\s*\n|\n\s*$/g, '');

  // Convert literal \n sequences to actual newlines BEFORE processing backticks
  // This prevents the backtick unescaping regex from incorrectly matching \n sequences
  cleaned = cleaned.replace(/\\n/g, '\n');

  // Unescape backticks: \` -> ` (users escape backticks in template literals)
  // Handle both cases: \` (adjacent) and \ followed by ` (split by markdown parser)
  cleaned = cleaned.replace(/\\`/g, '`');
  // Also handle case where backslash and backtick got separated by markdown parsing
  // Pattern: backslash followed by any characters (but not \n which we already handled), then a backtick
  // This handles cases like: \example` -> `example` (replacing \ with ` at start)
  // Exclude \n sequences to avoid matching them incorrectly
  cleaned = cleaned.replace(/\\([^`\\n]*?)`/g, '`$1`');

  // Fix case where markdown parser consumed one backtick from triple backticks
  // Pattern: `` followed by a word (like ``javascript) should be ```javascript
  // This handles cases where code fences were parsed and one backtick was lost
  cleaned = cleaned.replace(/<(\w+[^>]*)>``(\w+)/g, '<$1>```$2');

  // Unescape dollar signs: \$ -> $ (users escape $ in template literals to prevent interpolation)
  cleaned = cleaned.replace(/\\\$/g, '$');

  return cleaned;
};

/**
 * Reformat HTML for the markdown/mdx by adding an indentation to each line. This assures that the
 * HTML is indentend properly within the HTMLBlock component when rendered in the markdown/mdx.
 *
 * @param {string} html
 * @param {number} [indent=2]
 * @returns {string} re-formatted HTML
 */
export const reformatHTML = (html: string): string => {
  // Remove leading/trailing newlines
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '').replaceAll(/(?<!\\(\\\\)*)`/g, '\\`');

  // // Create a tab/indent with the specified number of spaces
  // const tab = ' '.repeat(indent);

  // // Indent each line of the HTML (converts to an array, indents each line, then joins back)
  // const indented = cleaned.split('\n').map((line: string) => `${tab}${line}`).join('\n');

  return cleaned;
};

export const toAttributes = (object: Record<string, unknown>, keys: string[] = []): MdxJsxAttribute[] => {
  const attributes: MdxJsxAttribute[] = [];

  Object.entries(object).forEach(([name, v]) => {
    if (keys.length > 0 && !keys.includes(name)) return;

    let value: MdxJsxAttributeValueExpression | string;

    if (typeof v === 'undefined' || v === null || v === '') {
      return;
    } else if (typeof v === 'string') {
      value = v;
    } else {
      /* values can be null, undefined, string, or a expression, eg:
       *
       * ```
       * <Image src="..." border={false} size={width - 20} />
       * ```
       *
       * Parsing the expression seems to only be done by the library
       * `mdast-util-mdx-jsx`, and so the most straight forward way to parse
       * the expression and get the appropriate AST is with our `mdast`
       * function.
       */
      const proxy = mdast(`{${v}}`);
      const data = proxy.children[0].data as MdxJsxAttributeValueExpressionData;

      value = {
        type: 'mdxJsxAttributeValueExpression',
        value: v.toString(),
        data,
      };
    }

    attributes.push({
      type: 'mdxJsxAttribute',
      name,
      value,
    });
  });

  return attributes;
};

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
export const hasNamedExport = (tree: HastRoot | MdastRoot, name: string): boolean => {
  let hasExport = false;

  // eslint-disable-next-line consistent-return
  visit(tree, 'mdxjsEsm', node => {
    if (
      'declaration' in node.data.estree.body[0] &&
      node.data.estree.body[0].declaration.type === 'VariableDeclaration'
    ) {
      const { declarations } = node.data.estree.body[0].declaration;
      hasExport = !!declarations.find(declaration => 'name' in declaration.id && declaration.id.name === name);

      return hasExport ? EXIT : CONTINUE;
    }
  });

  return hasExport;
};

/* Example mdast structures to find first export name in a mdxjsEsm node:
There are three types of export declarations that we need to consider:
1. VARIABLE DECLARATION
      "type": "mdxjsEsm",
      "value": "export const Foo = () => <div>Hello world</div>\nexport const Bar = () => <div>hello darkness my old friend</div>",
      "data": {
        "estree": {
          "type": "Program",
          "body": [
            {
              "type": "ExportNamedDeclaration",
              "declaration": {
                "type": "VariableDeclaration",
                "declarations": [
                  {
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": "Foo" // --------> This is the export name
                    },
                    ...

2/3. FUNCTION DECLARATION & CLASS DECLARATION
      "estree": {
          "type": "Program",
          "body": [
            {
              "type": "ExportNamedDeclaration",
              "declaration": {
                "type": "ClassDeclaration" | "FunctionDeclaration",
                "id": {
                  "type": "Identifier",
                  "name": "Foo" // --------> This is the export name
                },
*/

export const getExports = (tree: Root) => {
  const set = new Set<string>();

  visit(tree, isMDXEsm, (node: MdxjsEsm) => {
    // Once inside an mdxjsEsm node, we need to check for one or more declared exports within data.estree.body
    // This is because single newlines \n are not considered as a new block, so there may be more than one export statement in a single mdxjsEsm node
    const body = node.data?.estree.body;
    if (!body) return;

    body.forEach(child => {
      if (child.type === 'ExportNamedDeclaration') {
        // There are three types of ExportNamedDeclaration that we need to consider: VariableDeclaration, FunctionDeclaration, ClassDeclaration
        const declaration = child.declaration;
        // FunctionDeclaration and ClassDeclaration have the same structure
        if (declaration.type !== 'VariableDeclaration') {
          // Note: declaration.id.type is always 'Identifier' for FunctionDeclarations and ClassDeclarations
          set.add(declaration.id.name);
        } else {
          declaration.declarations.forEach(dec => {
            const id = dec.id;

            if (id.type === 'Identifier') {
              set.add(id.name);
            }
          });
        }
      }
    });
  });

  return Array.from(set);
};

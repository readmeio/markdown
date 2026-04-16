import type { HTMLBlock } from '../../../types';
import type { Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';
import { formatHtmlForMdxish } from '../../utils';

/**
 * Extracts boolean attribute from HTML tag. Handles JSX (safeMode={true}) and string (safeMode="true") syntax.
 * Returns "true"/"false" string to survive rehypeRaw serialization.
 */
function extractBooleanAttr(attrs: string, name: string): string | undefined {
  // Try JSX syntax: name={true|false}
  const jsxMatch = attrs.match(new RegExp(`${name}=\\{(true|false)\\}`));
  if (jsxMatch) {
    return jsxMatch[1];
  }
  // Try string syntax: name="true"|true
  const stringMatch = attrs.match(new RegExp(`${name}="?(true|false)"?`));
  if (stringMatch) {
    return stringMatch[1];
  }
  return undefined;
}

/**
 * Extracts runScripts attribute from HTML tag. Returns boolean for "true"/"false", string for other values, or undefined if not found.
 */
function extractRunScriptsAttr(attrs: string): boolean | string | undefined {
  const runScriptsMatch = attrs.match(/runScripts="?([^">\s]+)"?/);
  if (!runScriptsMatch) {
    return undefined;
  }
  const value = runScriptsMatch[1];
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

/**
 * Creates an HTMLBlock node from HTML string and optional attributes
 */
function createHTMLBlockNode(
  htmlString: string,
  position: HTMLBlock['position'],
  runScripts?: boolean | string,
  safeMode?: string,
): HTMLBlock {
  return {
    position,
    children: [{ type: 'text', value: htmlString }],
    type: NodeTypes.htmlBlock,
    data: {
      hName: 'html-block',
      hProperties: {
        html: htmlString,
        ...(runScripts !== undefined && { runScripts }),
        ...(safeMode !== undefined && { safeMode }),
      },
    },
  };
}

/**
 * Transforms HTMLBlock syntax to html-block MDAST nodes.
 *
 * The htmlBlockComponent micromark tokenizer captures `<HTMLBlock>...</HTMLBlock>`
 * as single `html` nodes at both flow and text levels. This transformer converts
 * those nodes into `html-block` MDAST nodes with extracted content and attributes.
 */
const mdxishHtmlBlocks = (): Transform => tree => {
  visit(tree, 'html', (node, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const value = (node as { value?: string }).value;
    if (!value) return;

    const fullMatch = value.match(/^<HTMLBlock(\s[^>]*)?>([\s\S]*)<\/HTMLBlock>\s*$/);
    if (!fullMatch) return;

    const attrs = fullMatch[1] || '';
    let content = fullMatch[2] || '';

    // Remove template literal syntax if present: {`...`}
    content = content.replace(/^\s*\{\s*`/, '').replace(/`\s*\}\s*$/, '');

    const htmlString = formatHtmlForMdxish(content);
    const runScripts = extractRunScriptsAttr(attrs);
    const safeMode = extractBooleanAttr(attrs, 'safeMode');

    parent.children[index] = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);
  });

  return tree;
};

export default mdxishHtmlBlocks;

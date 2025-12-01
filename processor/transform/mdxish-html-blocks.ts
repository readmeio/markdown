import type { HTMLBlock } from '../../types';
import type { Paragraph, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { formatHTML, getAttrs, getChildren, isMDXElement } from '../utils';

/**
 * Transforms HTMLBlock MDX JSX elements to html-block MDAST nodes.
 * Handles both MDX JSX elements and template literal syntax: <HTMLBlock>{`...`}</HTMLBlock>
 */
const mdxishHtmlBlocks = (): Transform => tree => {
  // Convert HTMLBlock MDX JSX elements to html-block MDAST nodes
  visit(tree, isMDXElement, (node: MdxJsxFlowElement, index, parent: Parent | undefined) => {
    if (node.name === 'HTMLBlock' && index !== undefined && parent) {
      const { position } = node;
      const children = getChildren<HTMLBlock['children']>(node);
      const { runScripts } = getAttrs<Pick<HTMLBlock['data']['hProperties'], 'runScripts'>>(node);
      const htmlString = formatHTML(children.map(({ value }) => value).join(''));

      const mdNode: HTMLBlock = {
        position,
        children: [{ type: 'text', value: htmlString }],
        type: NodeTypes.htmlBlock,
        data: {
          hName: 'html-block',
          hProperties: {
            ...(runScripts && { runScripts }),
            html: htmlString,
          },
        },
      };

      parent.children[index] = mdNode;
    }
  });

  // Handle HTMLBlock syntax inside paragraphs: <HTMLBlock>{`...`}</HTMLBlock>
  visit(tree, 'paragraph', (node: Paragraph, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const children = node.children || [];

    let htmlBlockStartIdx = -1;
    let htmlBlockEndIdx = -1;
    let templateLiteralStartIdx = -1;
    let templateLiteralEndIdx = -1;

    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];

      if (child.type === 'html' && typeof (child as { value?: string }).value === 'string') {
        const value = (child as { value: string }).value;
        if (value === '<HTMLBlock>' || value.match(/^<HTMLBlock\s[^>]*>$/)) {
          htmlBlockStartIdx = i;
        } else if (value === '</HTMLBlock>') {
          htmlBlockEndIdx = i;
        }
      }

      // Look for opening brace `{` after HTMLBlock start
      if (htmlBlockStartIdx !== -1 && templateLiteralStartIdx === -1 && child.type === 'text') {
        const value = (child as { value?: string }).value;
        if (value === '{') {
          templateLiteralStartIdx = i;
        }
      }

      // Look for closing brace `}` before HTMLBlock end
      if (htmlBlockStartIdx !== -1 && htmlBlockEndIdx === -1 && child.type === 'text') {
        const value = (child as { value?: string }).value;
        if (value === '}') {
          templateLiteralEndIdx = i;
        }
      }
    }

    if (
      htmlBlockStartIdx !== -1 &&
      htmlBlockEndIdx !== -1 &&
      templateLiteralStartIdx !== -1 &&
      templateLiteralEndIdx !== -1 &&
      templateLiteralStartIdx < templateLiteralEndIdx
    ) {
      const openingTag = children[htmlBlockStartIdx] as { value?: string };

      // Collect all content between { and }
      const templateContent: string[] = [];
      for (let i = templateLiteralStartIdx + 1; i < templateLiteralEndIdx; i += 1) {
        const child = children[i];
        if (child.type === 'inlineCode') {
          const value = (child as { value?: string }).value || '';
          templateContent.push(value);
        } else if (child.type === 'html') {
          const value = (child as { value?: string }).value || '';
          templateContent.push(value);
        } else if (child.type === 'text') {
          const value = (child as { value?: string }).value || '';
          templateContent.push(value);
        }
      }

      const htmlString = formatHTML(templateContent.join(''));

      let runScripts: boolean | string | undefined;
      if (openingTag.value) {
        const runScriptsMatch = openingTag.value.match(/runScripts="?([^">\s]+)"?/);
        if (runScriptsMatch) {
          runScripts =
            runScriptsMatch[1] === 'true' ? true : runScriptsMatch[1] === 'false' ? false : runScriptsMatch[1];
        }
      }

      const mdNode: HTMLBlock = {
        type: NodeTypes.htmlBlock,
        children: [{ type: 'text', value: htmlString }],
        data: {
          hName: 'html-block',
          hProperties: {
            html: htmlString,
            ...(runScripts !== undefined && { runScripts }),
          },
        },
        position: node.position,
      };

      parent.children[index] = mdNode;
    }
  });

  // Ensure existing html-block nodes have their HTML properly structured
  visit(tree, 'html-block', (node: HTMLBlock) => {
    const html = node.data?.hProperties?.html;

    // Ensure the HTML string from hProperties is in the children as a text node
    if (
      html &&
      (!node.children ||
        node.children.length === 0 ||
        (node.children.length === 1 && node.children[0].type === 'text' && node.children[0].value !== html))
    ) {
      node.children = [
        {
          type: 'text',
          value: html,
        },
      ];
    }
  });

  return tree;
};

export default mdxishHtmlBlocks;

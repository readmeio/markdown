import type { HTMLBlock } from '../../../../types';
import type { Node, Parent } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../../enums';
import { formatHtmlForMdxish } from '../../../utils';
import { base64Decode } from '../preprocess-jsx-expressions';

// The payload markers that `protectHTMLBlockContent` wraps base64 content in.
// We match the inner markers here so the same payload is recoverable whether it
// arrives as an HTML comment (top-level parse) or an MDX comment (table re-parse).
const PAYLOAD_RE = /RDMX_HTMLBLOCK:([A-Za-z0-9+/=]+):RDMX_HTMLBLOCK/;
const HTML_COMMENT_RE = /<!--(RDMX_HTMLBLOCK:[A-Za-z0-9+/=]+:RDMX_HTMLBLOCK)-->/g;

/**
 * Rewrites protected HTMLBlock HTML comments into MDX comments so remarkMdx can
 * parse a `<Table>` that contains an `<HTMLBlock>`. Length-preserving.
 */
export const neutralizeHtmlBlockComments = (value: string): string =>
  value.replace(HTML_COMMENT_RE, (_match, marker: string) => `{/*${marker} */}`);

/**
 * Reads the protected payload out of an `<HTMLBlock>` element's MDX comment child
 * (an `mdxFlowExpression`/`mdxTextExpression` holding `/*RDMX_HTMLBLOCK:…*\/`).
 */
const extractPayload = (element: MdxJsxFlowElement | MdxJsxTextElement): string | null => {
  let payload: string | null = null;
  visit(element, expr => expr.type === 'mdxFlowExpression' || expr.type === 'mdxTextExpression', expr => {
    const match = (expr as { value?: string }).value?.match(PAYLOAD_RE);
    if (match) payload = match[1];
  });
  return payload;
};

/**
 * Builds the `html-block` hProperties from the `<HTMLBlock>` element's JSX
 * attributes (e.g. `safeMode`, `runScripts`), mirroring the rehype fallback.
 */
const collectAttributes = (element: MdxJsxFlowElement | MdxJsxTextElement): Record<string, string> => {
  const props: Record<string, string> = {};
  element.attributes.forEach(attr => {
    if (attr.type === 'mdxJsxAttribute' && typeof attr.value === 'string' && attr.name !== 'html') {
      props[attr.name] = attr.value;
    }
  });
  return props;
};

/**
 * Converts `<HTMLBlock>` JSX elements inside a re-parsed table into `html-block`
 * MDAST nodes, decoding the protected base64 payload.
 */
export const convertHtmlBlockElements = (tree: Node) => {
  visit(
    tree,
    node => node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement',
    (node, index, parent: Parent | undefined) => {
      const element = node as MdxJsxFlowElement | MdxJsxTextElement;
      if (element.name !== 'HTMLBlock' || !parent || index === undefined) return;

      const payload = extractPayload(element);
      if (payload === null) return;

      const html = formatHtmlForMdxish(base64Decode(payload));
      const htmlBlock: HTMLBlock = {
        position: element.position,
        children: [{ type: 'text', value: html }],
        type: NodeTypes.htmlBlock,
        data: {
          hName: 'html-block',
          hProperties: {
            html,
            ...collectAttributes(element),
          },
        },
      };

      parent.children[index] = htmlBlock;
    },
  );
};

import type { HTMLBlock, MdxJsx } from '../../types';
import type { Properties } from 'hast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { Handler, Handlers } from 'mdast-util-to-hast';

import { decodeHTMLStrict } from 'entities';

import { NodeTypes } from '../../enums';

// If hChildren is populated, it means the node holds a renderable value (e.g. React)
// See evaluate-expressions.ts for more details
// Otherwise, it's a simple value and we fall back to text
const mdxExpressionHandler: Handler = (_state, node) =>
  node.data?.hChildren ?? { type: 'text', value: (node as { value?: string }).value || '' };

// Convert MDX JSX elements to a custom mdx-jsx hast node that bypasses rehypeRaw's
// HTML serialization round-trip; downstream normalization rewrites it to `element`.
const mdxJsxElementHandler: Handler = (state, node) => {
  const { attributes = [], name } = node as { attributes?: MdxJsxAttribute[]; name?: string };
  const properties: Record<string, unknown> = {};
  const deferredExpressions: Record<string, string> = {};

  attributes.forEach(attribute => {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) return;

    if (attribute.value === null) {
      properties[attribute.name] = true;
    } else if (typeof attribute.value === 'string') {
      properties[attribute.name] = decodeHTMLStrict(attribute.value);
    } else {
      // Defer every attribute-expression evaluation past rehypeRaw's `structuredClone`
      // passthrough: evaluating here can yield React elements or functions that the clone
      // rejects. The source is stashed in `node.data` (clone-safe) and
      // `resolveDeferredAttributeExpressionProps` evaluates it once past the clone.
      deferredExpressions[attribute.name] = (attribute.value as MdxJsxAttributeValueExpression).value;
    }
  });

  const hasDeferredExpressions = Object.keys(deferredExpressions).length > 0;
  const jsxNode: MdxJsx = {
    type: 'mdx-jsx',
    tagName: name || '',
    properties: properties as Properties,
    children: state.all(node),
    ...(hasDeferredExpressions && { data: { deferredExpressions } }),
  };
  return jsxNode;
};

// Convert html-block MDAST nodes to HAST elements, preserving hProperties
const htmlBlockHandler: Handler = (_state, node) => {
  const htmlBlockNode = node as HTMLBlock;
  const hProperties = htmlBlockNode.data?.hProperties || {};

  return {
    type: 'element',
    tagName: 'html-block',
    properties: hProperties as Properties,
    children: [],
  };
};

// Convert embed magic blocks to Embed components
const embedHandler: Handler = (state, node) => {
  // Assert to get the minimum properties we need
  const { data } = node as { data?: { hName?: string; hProperties?: Properties } };

  // Magic block embeds (hName === 'embed-block') render as Embed component
  // which doesn't use children - it renders based on props only
  const isMagicBlockEmbed = data?.hName === NodeTypes.embedBlock;

  return {
    type: 'element',
    // To differentiate between regular embeds and magic block embeds,
    // magic block embeds have a certain hName
    tagName: isMagicBlockEmbed ? 'Embed' : 'embed',
    properties: data?.hProperties,
    // Don't include children for magic block embeds - Embed component renders based on props
    children: isMagicBlockEmbed ? [] : state.all(node),
  };
};

export const mdxComponentHandlers: Handlers = {
  embed: embedHandler,
  mdxFlowExpression: mdxExpressionHandler,
  mdxJsxFlowElement: mdxJsxElementHandler,
  mdxJsxTextElement: mdxJsxElementHandler,
  mdxTextExpression: mdxExpressionHandler,
  mdxjsEsm: () => undefined,
  [NodeTypes.htmlBlock]: htmlBlockHandler,
};

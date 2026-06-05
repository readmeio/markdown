import type { HTMLBlock, MdxJsx } from '../../types';
import type { Properties } from 'hast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { Handler, Handlers } from 'mdast-util-to-hast';

import { decodeHTMLStrict } from 'entities';

import { NodeTypes } from '../../enums';
import { createJsxExprSentinel, HAS_JSX } from '../../lib/utils/mdxish/mdxish-jsx-expression';
import { evaluate } from '../utils';

// Convert MDX expressions to text nodes (evaluation happens earlier in pipeline)
const mdxExpressionHandler: Handler = (_state, node) => ({
  type: 'text',
  value: (node as { value?: string }).value || '',
});

function isStructuredCloneable(value: unknown): boolean {
  try {
    structuredClone(value);
    return true;
  } catch {
    return false;
  }
}

// Convert MDX JSX elements to a custom mdx-jsx hast node that bypasses rehypeRaw's
// HTML serialization round-trip; downstream normalization rewrites it to `element`.
const mdxJsxElementHandler: Handler = (state, node) => {
  const { attributes = [], name } = node as { attributes?: MdxJsxAttribute[]; name?: string };
  const properties: Record<string, unknown> = {};

  attributes.forEach(attribute => {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) return;

    if (attribute.value === null) {
      properties[attribute.name] = true;
    } else if (typeof attribute.value === 'string') {
      properties[attribute.name] = decodeHTMLStrict(attribute.value);
    } else {
      const expressionSource = (attribute.value as MdxJsxAttributeValueExpression).value;

      // An expression could contain JSX fragments (e.g. <>...</>) which can't be
      // evaluated to a clone-safe value here: the result is a React element, which
      // rehypeRaw's `structuredClone` passthrough rejects.
      // To get around this, we store a clone-safe sentinel
      // and let `resolveJsxAttributeExpressionProps` evaluate it after the clone.
      if (HAS_JSX.test(expressionSource)) {
        properties[attribute.name] = createJsxExprSentinel(expressionSource);
        return;
      }

      let evaluated: ReturnType<typeof evaluate>;
      try {
        evaluated = evaluate(expressionSource);
      } catch {
        evaluated = expressionSource;
      }

      // rehypeRaw's passThrough clones our mdx-jsx node with structuredClone, which
      // rejects functions and other non-serializable values. Attribute expressions
      // that evaluate to such values (`onClick={() => ...}`) would crash the pipeline,
      // so if we have a non-serializable value, we fall back to the raw expression source
      // and not support it for now.
      if (!isStructuredCloneable(evaluated)) {
        evaluated = expressionSource;
      }

      properties[attribute.name] = evaluated;
    }
  });

  const jsxNode: MdxJsx = {
    type: 'mdx-jsx',
    tagName: name || '',
    properties: properties as Properties,
    children: state.all(node),
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
